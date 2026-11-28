// Estoque: saldo em unidades por produto + ledger de movimentações (fonte de verdade).
// Funções puras compartilhadas entre os modos local (JSON) e PostgreSQL.
// Sem imports de Node: componentes client-side importam tipos e helpers daqui.
import type { ItemPedido, Produto } from "./types";

export type TipoMovimento = "entrada" | "saida" | "ajuste" | "perda" | "estorno";

export interface MovimentoEstoque {
  id: string;
  produto_id: string;
  produto_nome: string; // snapshot: sobrevive à exclusão do produto
  tipo: TipoMovimento;
  quantidade: number; // variação assinada, em unidades (pacotes já convertidos)
  saldo_apos: number; // saldo do produto imediatamente após o movimento
  motivo?: string;
  pedido_id?: string;
  pedido_numero?: number;
  registrado_por?: { id: string; nome: string };
  em: string; // ISO 8601
}

export const TIPOS_MOVIMENTO: readonly TipoMovimento[] = ["entrada", "saida", "ajuste", "perda", "estorno"] as const;

export const ROTULOS_MOVIMENTO: Record<TipoMovimento, string> = {
  entrada: "Entrada (compra)",
  saida: "Saída (venda)",
  ajuste: "Ajuste de inventário",
  perda: "Perda/quebra",
  estorno: "Estorno",
};

export class MovimentoInvalido extends Error {}

// Saldo em unidades; produto sem o campo não é controlado (null), como o custo.
export function saldoProduto(produto: Pick<Produto, "estoque_atual">): number | null {
  return typeof produto.estoque_atual === "number" && Number.isFinite(produto.estoque_atual)
    ? produto.estoque_atual : null;
}

// Conversão do item do pedido para unidades, usando o snapshot do próprio item.
export function unidadesDoItem(item: Pick<ItemPedido, "modo" | "quantidade" | "pack_quantidade">): number {
  const quantidade = Math.max(0, Math.trunc(item.quantidade) || 0);
  return item.modo === "pacote" ? quantidade * Math.max(1, Math.trunc(item.pack_quantidade || 1)) : quantidade;
}

// Diferença de unidades entre a versão anterior e a nova de uma venda editada.
// Itens casam pelo id do item; item novo soma inteiro, item removido devolve inteiro.
export function deltasDeEdicao(antes: ItemPedido[], depois: ItemPedido[]): { item: ItemPedido; delta: number }[] {
  const antigos = new Map(antes.map(item => [item.id, item]));
  const novosIds = new Set(depois.map(item => item.id));
  const deltas: { item: ItemPedido; delta: number }[] = [];
  for (const item of depois) {
    const antigo = antigos.get(item.id);
    const delta = unidadesDoItem(item) - (antigo ? unidadesDoItem(antigo) : 0);
    if (delta !== 0) deltas.push({ item, delta: -delta }); // mais itens vendidos = menos estoque
  }
  for (const antigo of antes) {
    if (!novosIds.has(antigo.id)) deltas.push({ item: antigo, delta: unidadesDoItem(antigo) });
  }
  return deltas;
}

export interface EntradaMovimento {
  tipo: "entrada" | "ajuste" | "perda";
  // entrada/perda: quantidade movimentada (> 0); ajuste: saldo contado (>= 0)
  quantidade: number;
  modo?: "unidade" | "pacote";
  motivo?: string;
}

export interface MovimentoValidado {
  tipo: "entrada" | "ajuste" | "perda";
  unidades: number; // entrada/perda: magnitude em unidades; ajuste: saldo alvo
  motivo?: string;
}

// Valida a entrada manual do formulário. Ajuste exige motivo; entrada/perda não.
export function validarMovimentoManual(entrada: unknown, packQuantidade: number): MovimentoValidado {
  if (!entrada || typeof entrada !== "object") throw new MovimentoInvalido("Dados inválidos.");
  const b = entrada as Partial<EntradaMovimento>;
  if (b.tipo !== "entrada" && b.tipo !== "ajuste" && b.tipo !== "perda") {
    throw new MovimentoInvalido("Escolha entrada, ajuste de inventário ou perda.");
  }
  const modo = b.modo ?? "unidade";
  if (modo !== "unidade" && modo !== "pacote") throw new MovimentoInvalido("Informe unidade ou pacote.");
  const fator = modo === "pacote" ? Math.max(1, Math.trunc(packQuantidade) || 1) : 1;
  const bruto = typeof b.quantidade === "number" ? b.quantidade : NaN;
  if (!Number.isFinite(bruto) || (b.tipo === "ajuste" ? bruto < 0 : bruto <= 0)) {
    throw new MovimentoInvalido(b.tipo === "ajuste" ? "Informe o saldo contado (zero ou mais)." : "Informe uma quantidade maior que zero.");
  }
  const valor = b.tipo === "ajuste" ? Math.trunc(bruto) : Math.trunc(bruto) * fator;
  if (!Number.isSafeInteger(valor) || valor > 1_000_000_000) throw new MovimentoInvalido("Quantidade acima do permitido.");
  if (b.tipo !== "ajuste" && valor === 0) throw new MovimentoInvalido("Informe uma quantidade maior que zero.");
  const motivo = typeof b.motivo === "string" ? b.motivo.trim().replace(/\s+/g, " ") : "";
  if (motivo.length > 200) throw new MovimentoInvalido("O motivo deve ter até 200 caracteres.");
  if (b.tipo === "ajuste" && !motivo) throw new MovimentoInvalido("Descreva o motivo do ajuste de inventário.");
  return { tipo: b.tipo, unidades: valor, motivo: motivo || undefined };
}

// Movimentos de saída na efetivação de uma venda (um por item do pedido).
export function movimentosDeSaida(
  pedido: { id: string; numero: number; itens: ItemPedido[] },
  saldos: Map<string, number | null>,
  quem?: { id: string; nome: string },
  agora = new Date().toISOString(),
): MovimentoEstoque[] {
  return pedido.itens
    .map(item => ({ item, unidades: unidadesDoItem(item) }))
    .filter(({ item, unidades }) => unidades > 0 && saldos.get(item.produto_id) != null)
    .map(({ item, unidades }) => {
      const anterior = saldos.get(item.produto_id)!;
      const saldo = anterior - unidades;
      saldos.set(item.produto_id, saldo);
      return {
        id: `${pedido.id}:saida:${item.id}`, produto_id: item.produto_id, produto_nome: item.produto_nome,
        tipo: "saida" as const, quantidade: -unidades, saldo_apos: saldo,
        pedido_id: pedido.id, pedido_numero: pedido.numero, registrado_por: quem, em: agora,
      } satisfies MovimentoEstoque;
    });
}

// Estorno: devolve ao estoque tudo o que a venda excluída havia baixado.
export function movimentosDeEstorno(
  pedido: { id: string; numero: number; itens: ItemPedido[] },
  saldos: Map<string, number | null>,
  quem?: { id: string; nome: string },
  agora = new Date().toISOString(),
): MovimentoEstoque[] {
  return pedido.itens
    .map(item => ({ item, unidades: unidadesDoItem(item) }))
    .filter(({ item, unidades }) => unidades > 0 && saldos.get(item.produto_id) != null)
    .map(({ item, unidades }) => {
      const saldo = saldos.get(item.produto_id)! + unidades;
      saldos.set(item.produto_id, saldo);
      return {
        id: `${pedido.id}:estorno:${item.id}`, produto_id: item.produto_id, produto_nome: item.produto_nome,
        tipo: "estorno" as const, quantidade: unidades, saldo_apos: saldo,
        pedido_id: pedido.id, pedido_numero: pedido.numero, registrado_por: quem, em: agora,
      } satisfies MovimentoEstoque;
    });
}

// Ajuste de estoque ao editar uma venda já finalizada: só a diferença por item.
export function movimentosDeDelta(
  pedido: { id: string; numero: number },
  deltas: { item: ItemPedido; delta: number }[],
  saldos: Map<string, number | null>,
  quem?: { id: string; nome: string },
  agora = new Date().toISOString(),
  novoId: () => string = () => `${pedido.id}:delta:${agora}:${Math.random().toString(36).slice(2)}`,
): MovimentoEstoque[] {
  return deltas
    .filter(({ item, delta }) => delta !== 0 && saldos.get(item.produto_id) != null)
    .map(({ item, delta }) => {
      const saldo = saldos.get(item.produto_id)! + delta;
      saldos.set(item.produto_id, saldo);
      return {
        id: novoId(), produto_id: item.produto_id, produto_nome: item.produto_nome,
        tipo: "estorno" as const, quantidade: delta, saldo_apos: saldo,
        motivo: "Edição de venda finalizada", pedido_id: pedido.id, pedido_numero: pedido.numero,
        registrado_por: quem, em: agora,
      } satisfies MovimentoEstoque;
    });
}

// Saldo consolidado por produto para a tela de gerenciamento.
export interface SaldoEstoque {
  produto: Produto;
  saldo: number | null; // null = não controlado
  pacotes: number | null; // saldo convertido em pacotes cheios (informativo)
  situacao: "nao-controlado" | "negativo" | "zerado" | "baixo" | "ok";
}

export const LIMIAR_BAIXO = 6; // unidades; ajustável depois via config se necessário

export function situacaoDoSaldo(saldo: number | null, limiar = LIMIAR_BAIXO): SaldoEstoque["situacao"] {
  if (saldo === null) return "nao-controlado";
  if (saldo < 0) return "negativo";
  if (saldo === 0) return "zerado";
  if (saldo <= limiar) return "baixo";
  return "ok";
}

export function consolidarSaldos(produtos: Produto[], limiar = LIMIAR_BAIXO): SaldoEstoque[] {
  return produtos.map(produto => {
    const saldo = saldoProduto(produto);
    return {
      produto, saldo,
      pacotes: saldo === null ? null : Math.floor(saldo / Math.max(1, produto.pack_quantidade)),
      situacao: situacaoDoSaldo(saldo, limiar),
    };
  });
}
