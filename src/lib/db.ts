import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import * as postgres from "./postgres";
import type { RegistroBanco, SnapshotBanco } from "./snapshotBanco";
import type {
  Categoria,
  Cliente,
  FormaPagamento,
  ItemPedido,
  PagamentoParcial,
  Pedido,
  Produto,
} from "./types";
import type { DadosCliente } from "./clientes";
import { valorPago, valorRestante } from "./pagamentos";
import {
  MovimentoInvalido, validarMovimentoManual, saldoProduto, deltasDeEdicao,
  movimentosDeSaida, movimentosDeEstorno, movimentosDeDelta,
  type MovimentoEstoque,
} from "./estoque";
export { MovimentoInvalido } from "./estoque";
import { dataValida, diaLocal } from "./periodoOrcamentos";
import { formatBRL } from "./format";
import type { EventoAuditoria } from "./auditoria";

// PostgreSQL quando DATABASE_URL estiver configurada; JSON apenas para uso local.
// Na Vercel, uma configuração ausente interrompe a operação em vez de perder dados.

const DATA_DIR = path.join(process.cwd(), "data");
const PEDIDOS_LOCAL = path.join(DATA_DIR, "pedidos.local.json");

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function readData<T>(file: string, fallback: T): Promise<T> {
  if (postgres.usarPostgres()) {
    if (file === "config.json") return (await postgres.buscar<T>("config", "principal")) ?? fallback;
    return await postgres.listar<T extends (infer U)[] ? U : never>(file.replace(".json", "")) as T;
  }
  try {
    if (file === "pedidos.json") {
      try {
        return JSON.parse(await fs.readFile(PEDIDOS_LOCAL, "utf8")) as T;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    }
    const raw = await fs.readFile(path.join(DATA_DIR, file), "utf8");
    return JSON.parse(raw) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return fallback;
    throw error;
  }
}

// Serializa as escritas para evitar corrupção em acessos concorrentes.
let writeChain: Promise<unknown> = Promise.resolve();

export function writeData(file: string, data: unknown): Promise<void> {
  if (postgres.usarPostgres()) throw new Error("Gravação de arquivos desabilitada com PostgreSQL.");
  const run = writeChain.then(async () => {
    await ensureDir();
    const dest = file === "pedidos.json" ? PEDIDOS_LOCAL : path.join(DATA_DIR, file);
    const tmp = `${dest}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
    await fs.rename(tmp, dest);
  });
  // mantém a cadeia mesmo se uma escrita falhar
  writeChain = run.catch(() => undefined);
  return run;
}

/* ----------------------------- Categorias ----------------------------- */

export async function lerBancoCompleto(): Promise<SnapshotBanco> {
  if (postgres.usarPostgres()) return postgres.lerBancoCompleto();
  const run = writeChain.then(async () => {
    const registros: RegistroBanco[] = [];
    for (const colecao of ["produtos", "categorias", "pedidos", "auditoria", "estoque_movimentos", "clientes"]) {
      const dados = await readData<(Record<string, unknown> & { id: string })[]>(`${colecao}.json`, []);
      for (const registro of dados) registros.push({ colecao, id: registro.id, dados: registro });
    }
    const config = await readData<Record<string, unknown> | null>("config.json", null);
    if (config) registros.push({ colecao: "config", id: "principal", dados: config });
    const maior = registros.filter(r => r.colecao === "pedidos").reduce((max, r) => Math.max(max, Number(r.dados.numero) || 0), 0);
    return { registros, contadores: [{ id: "pedidos", valor: String(maior) }], gerado_em: new Date().toISOString(), origem: "local" as const };
  });
  writeChain = run.catch(() => undefined);
  return run;
}

export async function getCategorias(): Promise<Categoria[]> {
  return readData<Categoria[]>("categorias.json", []);
}

export async function criarCategoria(nome: string): Promise<Categoria> {
  const nomeLimpo = typeof nome === "string" ? nome.trim().replace(/\s+/g, " ") : "";
  if (!nomeLimpo || nomeLimpo.length > 100) throw new Error("Informe um nome de categoria com até 100 caracteres.");
  const run = writeChain.then(async () => {
    const categorias = await getCategorias();
    const existente = categorias.find(c => c.nome.localeCompare(nomeLimpo, "pt-BR", { sensitivity: "base" }) === 0);
    if (existente) return existente;
    const categoria: Categoria = { id: randomUUID(), nome: nomeLimpo, ativo: true, created_at: new Date().toISOString() };
    if (postgres.usarPostgres()) return postgres.inserir<Categoria>("categorias", categoria);
    await ensureDir();
    const dest = path.join(DATA_DIR, "categorias.json");
    await fs.writeFile(dest + ".tmp", JSON.stringify([...categorias, categoria], null, 2), "utf8");
    await fs.rename(dest + ".tmp", dest);
    return categoria;
  });
  writeChain = run.catch(() => undefined);
  return run;
}

/* ------------------------------- Clientes ------------------------------ */

export async function getClientes(): Promise<Cliente[]> {
  const clientes = await readData<Cliente[]>("clientes.json", []);
  return clientes.filter(c => !c.excluido_em).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export async function getCliente(id: string): Promise<Cliente | undefined> {
  if (postgres.usarPostgres()) {
    const cliente = await postgres.buscar<Cliente>("clientes", id);
    return cliente?.excluido_em ? undefined : cliente;
  }
  const clientes = await readData<Cliente[]>("clientes.json", []);
  return clientes.find(c => c.id === id && !c.excluido_em);
}

export async function criarCliente(input: DadosCliente & { criado_por?: Cliente["criado_por"] }): Promise<Cliente> {
  const cliente: Cliente = {
    id: randomUUID(),
    nome: input.nome,
    telefone: input.telefone,
    documento: input.documento,
    observacao: input.observacao,
    criado_por: input.criado_por,
    created_at: new Date().toISOString(),
  };
  if (postgres.usarPostgres()) return postgres.inserir<Cliente>("clientes", cliente);
  const run = writeChain.then(async () => {
    const clientes = await readData<Cliente[]>("clientes.json", []);
    clientes.push(cliente);
    await ensureDir();
    const dest = path.join(DATA_DIR, "clientes.json");
    await fs.writeFile(dest + ".tmp", JSON.stringify(clientes, null, 2), "utf8");
    await fs.rename(dest + ".tmp", dest);
    return cliente;
  });
  writeChain = run.catch(() => undefined);
  return run;
}

export async function atualizarCliente(id: string, input: DadosCliente): Promise<Cliente | undefined> {
  const patch = { ...input, updated_at: new Date().toISOString() };
  if (postgres.usarPostgres()) return postgres.atualizar<Cliente>("clientes", id, patch);
  const run = writeChain.then(async () => {
    const clientes = await readData<Cliente[]>("clientes.json", []);
    const cliente = clientes.find(c => c.id === id && !c.excluido_em);
    if (!cliente) return undefined;
    Object.assign(cliente, patch);
    const dest = path.join(DATA_DIR, "clientes.json");
    await fs.writeFile(dest + ".tmp", JSON.stringify(clientes, null, 2), "utf8");
    await fs.rename(dest + ".tmp", dest);
    return cliente;
  });
  writeChain = run.catch(() => undefined);
  return run;
}

/* ------------------------------ Produtos ------------------------------ */

// Toda venda sem categoria escolhida entra em "Outros"; a categoria é criada se faltar.
export async function categoriaOutros(): Promise<Categoria> {
  const categorias = await getCategorias();
  const existente = categorias.find(c => c.nome.localeCompare("Outros", "pt-BR", { sensitivity: "base" }) === 0);
  if (existente) return existente;
  return criarCategoria("Outros");
}

export class CategoriaPadrao extends Error {}

function ehCategoriaPadrao(categoria: { nome: string }) {
  return categoria.nome.localeCompare("Outros", "pt-BR", { sensitivity: "base" }) === 0;
}

// Exclui a categoria e move os produtos dela (inclusive excluídos) para "Outros".
export async function excluirCategoria(id: string): Promise<boolean> {
  const categorias = await getCategorias();
  const alvo = categorias.find(c => c.id === id);
  if (!alvo) return false;
  if (ehCategoriaPadrao(alvo)) throw new CategoriaPadrao("A categoria Outros é o destino padrão e não pode ser excluída.");

  if (postgres.usarPostgres()) {
    let outros = categorias.find(ehCategoriaPadrao);
    if (!outros) outros = await postgres.inserir<Categoria>("categorias", {
      id: randomUUID(), nome: "Outros", ativo: true, created_at: new Date().toISOString(),
    });
    await postgres.moverProdutosParaCategoria(id, outros.id);
    await postgres.remover("categorias", id);
    return true;
  }

  const run = writeChain.then(async () => {
    const arquivoCategorias = path.join(DATA_DIR, "categorias.json");
    const arquivoProdutos = path.join(DATA_DIR, "produtos.json");
    const todas: Categoria[] = JSON.parse(await fs.readFile(arquivoCategorias, "utf8"));
    const produtos: Produto[] = JSON.parse(await fs.readFile(arquivoProdutos, "utf8"));
    let outros = todas.find(ehCategoriaPadrao);
    if (!outros) {
      outros = { id: randomUUID(), nome: "Outros", ativo: true, created_at: new Date().toISOString() };
      todas.push(outros);
    }
    let moveu = false;
    for (const produto of produtos) if (produto.categoria_id === id) { produto.categoria_id = outros.id; moveu = true; }
    if (moveu) {
      await fs.writeFile(`${arquivoProdutos}.tmp`, JSON.stringify(produtos, null, 2), "utf8");
      await fs.rename(`${arquivoProdutos}.tmp`, arquivoProdutos);
    }
    await fs.writeFile(`${arquivoCategorias}.tmp`, JSON.stringify(todas.filter(c => c.id !== id), null, 2), "utf8");
    await fs.rename(`${arquivoCategorias}.tmp`, arquivoCategorias);
    return true;
  });
  writeChain = run.catch(() => undefined);
  return run;
}

export async function getProdutos(): Promise<Produto[]> {
  return (await readData<Produto[]>("produtos.json", [])).filter(p => !p.excluido_em);
}

export async function getProduto(id: string): Promise<Produto | undefined> {
  if (postgres.usarPostgres()) {
    const produto = await postgres.buscar<Produto>("produtos", id);
    return produto?.excluido_em ? undefined : produto;
  }
  const prods = await getProdutos();
  return prods.find((p) => p.id === id);
}

export async function atualizarProduto(id: string, patch: Pick<Produto, "nome" | "pack_quantidade"> & Partial<Pick<Produto, "preco_pack" | "categoria_id" | "custo_pack" | "descricao" | "imagem_url">>) {
  if (postgres.usarPostgres()) return postgres.atualizar<Produto>("produtos", id, patch);
  const run = writeChain.then(async () => {
    const dest = path.join(DATA_DIR, "produtos.json");
    const produtos: Produto[] = JSON.parse(await fs.readFile(dest, "utf8"));
    const produto = produtos.find((p) => p.id === id && !p.excluido_em);
    if (!produto) return undefined;
    Object.assign(produto, patch);
    await fs.writeFile(`${dest}.tmp`, JSON.stringify(produtos, null, 2), "utf8");
    await fs.rename(`${dest}.tmp`, dest);
    return produto;
  });
  writeChain = run.catch(() => undefined);
  return run;
}

export async function excluirProduto(id: string): Promise<boolean> {
  if (postgres.usarPostgres()) return postgres.excluirProduto(id);
  const run = writeChain.then(async () => {
    const produtos = await readData<Produto[]>("produtos.json", []);
    const produto = produtos.find(p => p.id === id && !p.excluido_em);
    if (!produto) return false;
    produto.excluido_em = new Date().toISOString();
    produto.ativo = false;
    const dest = path.join(DATA_DIR, "produtos.json");
    await fs.writeFile(dest + ".tmp", JSON.stringify(produtos, null, 2), "utf8");
    await fs.rename(dest + ".tmp", dest);
    return true;
  });
  writeChain = run.catch(() => undefined);
  return run;
}

/* ------------------------------- Pedidos ------------------------------ */

// Log de auditoria: gravação tolerante a falhas, para nunca derrubar a ação auditada.
export async function registrarAuditoria(evento: Omit<EventoAuditoria, "id" | "em">): Promise<void> {
  const registro: EventoAuditoria = { ...evento, id: randomUUID(), em: new Date().toISOString() };
  try {
    if (postgres.usarPostgres()) {
      await postgres.inserir("auditoria", registro);
      return;
    }
    const run = writeChain.then(async () => {
      await ensureDir();
      const eventos = await readData<EventoAuditoria[]>("auditoria.json", []);
      eventos.push(registro);
      const dest = path.join(DATA_DIR, "auditoria.json");
      await fs.writeFile(dest + ".tmp", JSON.stringify(eventos, null, 2), "utf8");
      await fs.rename(dest + ".tmp", dest);
    });
    writeChain = run.catch(() => undefined);
    await run;
  } catch (error) {
    console.error("Falha ao registrar auditoria:", error);
  }
}

// Mais recentes primeiro; o limite evita carregar o histórico inteiro na home.
export async function getAuditoria(limite = 100): Promise<EventoAuditoria[]> {
  const eventos = await readData<EventoAuditoria[]>("auditoria.json", []);
  return [...eventos].sort((a, b) => b.em.localeCompare(a.em)).slice(0, Math.max(1, limite));
}

/* ------------------------------- Estoque ------------------------------- */

const ARQ_ESTOQUE = "estoque_movimentos.json";

function saldosLocais(produtos: Produto[]): Map<string, number | null> {
  return new Map(produtos.filter(p => !p.excluido_em).map(p => [p.id, saldoProduto(p)]));
}

// Escreve saldos + movimentos dentro da writeChain do modo local (sem corrida).
async function gravarEstoqueLocal(movimentos: MovimentoEstoque[]): Promise<void> {
  if (!movimentos.length) return;
  const produtos = await readData<Produto[]>("produtos.json", []);
  const porId = new Map(produtos.map(p => [p.id, p]));
  for (const movimento of movimentos) {
    const produto = porId.get(movimento.produto_id);
    if (produto) produto.estoque_atual = movimento.saldo_apos;
  }
  await ensureDir();
  const destProdutos = path.join(DATA_DIR, "produtos.json");
  await fs.writeFile(destProdutos + ".tmp", JSON.stringify(produtos, null, 2), "utf8");
  await fs.rename(destProdutos + ".tmp", destProdutos);
  const eventos = await readData<MovimentoEstoque[]>(ARQ_ESTOQUE, []);
  eventos.push(...movimentos);
  const dest = path.join(DATA_DIR, ARQ_ESTOQUE);
  await fs.writeFile(dest + ".tmp", JSON.stringify(eventos, null, 2), "utf8");
  await fs.rename(dest + ".tmp", dest);
}

// Postgres: lê saldos, gera movimentos e grava atomicamente; retry em conflito.
async function aplicarEstoqueRemoto(gerar: (saldos: Map<string, number | null>) => MovimentoEstoque[]): Promise<MovimentoEstoque[]> {
  for (let tentativa = 0; ; tentativa++) {
    const saldos = await postgres.saldosEstoque();
    const movimentos = gerar(new Map(saldos));
    if (!movimentos.length) return [];
    const esperados = new Map([...new Set(movimentos.map(m => m.produto_id))].map(id => [id, saldos.get(id)!]));
    if (await postgres.aplicarMovimentosEstoque(movimentos, esperados)) return movimentos;
    if (tentativa >= 7) throw new Error("O estoque foi alterado simultaneamente; movimentação não aplicada.");
  }
}

// A venda já foi gravada quando a baixa roda: uma falha aqui não desfaz a venda,
// mas fica registrada na auditoria e aparece em reconciliarEstoque().
async function baixarEstoqueSeguro(alvo: string, gerar: (saldos: Map<string, number | null>) => MovimentoEstoque[]): Promise<void> {
  try {
    await aplicarEstoqueRemoto(gerar);
  } catch (error) {
    console.error("Falha ao movimentar estoque:", error);
    await registrarAuditoria({
      usuario: { id: "sistema", nome: "Sistema" },
      acao: "estoque.falha",
      titulo: "Falha na movimentação de estoque",
      alvo,
      resumo: "A venda foi gravada, mas o estoque não foi atualizado. Confira a conferência de estoque.",
      detalhes: [{ rotulo: "Erro", valor: error instanceof Error ? error.message : String(error) }],
    });
  }
}

export interface FiltroMovimentos { produtoId?: string; limite?: number; antes?: string }

// Histórico paginado: no Postgres o filtro roda no SQL, nunca carrega tudo.
export async function getMovimentosEstoque(filtro: FiltroMovimentos = {}): Promise<MovimentoEstoque[]> {
  if (postgres.usarPostgres()) return postgres.listarMovimentosEstoque(filtro);
  const limite = Math.min(200, Math.max(1, Math.trunc(filtro.limite ?? 50)));
  const eventos = await readData<MovimentoEstoque[]>(ARQ_ESTOQUE, []);
  return eventos
    .filter(m => (!filtro.produtoId || m.produto_id === filtro.produtoId) && (!filtro.antes || m.em < filtro.antes))
    .sort((a, b) => b.em.localeCompare(a.em))
    .slice(0, limite);
}

export interface ResultadoMovimento { produto: Produto; movimento: MovimentoEstoque }

// Entrada (compra), ajuste de inventário ou perda/quebra, registradas manualmente.
// A primeira movimentação de um produto sem saldo inicia o controle (base 0).
export async function registrarMovimentoManual(produtoId: string, entrada: unknown, quem?: { id: string; nome: string }): Promise<ResultadoMovimento | undefined> {
  const montar = (produto: Produto): ResultadoMovimento => {
    const validado = validarMovimentoManual(entrada, produto.pack_quantidade);
    const base = saldoProduto(produto) ?? 0;
    const novoSaldo = validado.tipo === "ajuste" ? validado.unidades
      : validado.tipo === "entrada" ? base + validado.unidades : base - validado.unidades;
    if (!Number.isSafeInteger(novoSaldo)) throw new MovimentoInvalido("Saldo resultante inválido.");
    const movimento: MovimentoEstoque = {
      id: randomUUID(), produto_id: produto.id, produto_nome: produto.nome,
      tipo: validado.tipo, quantidade: novoSaldo - base, saldo_apos: novoSaldo,
      motivo: validado.motivo, registrado_por: quem, em: new Date().toISOString(),
    };
    return { produto: { ...produto, estoque_atual: novoSaldo }, movimento };
  };
  if (postgres.usarPostgres()) {
    for (let tentativa = 0; ; tentativa++) {
      const produto = await getProduto(produtoId);
      if (!produto) return undefined;
      const resultado = montar(produto);
      if (await postgres.aplicarMovimentoManual(resultado.movimento, saldoProduto(produto))) return resultado;
      // Concorrência otimista: relê o saldo e tenta de novo (5 disputas simultâneas cabem).
      if (tentativa >= 7) throw new Error("O saldo foi alterado por outra operação. Tente novamente.");
    }
  }
  const run = writeChain.then(async () => {
    const produtos = await readData<Produto[]>("produtos.json", []);
    const produto = produtos.find(p => p.id === produtoId && !p.excluido_em);
    if (!produto) return undefined;
    const resultado = montar(produto);
    await gravarEstoqueLocal([resultado.movimento]);
    return resultado;
  });
  writeChain = run.catch(() => undefined);
  return run;
}

export interface DivergenciaEstoque { produto_id: string; produto_nome: string; saldo: number; soma_ledger: number; diferenca: number }

// Conferência: saldo gravado × soma do ledger. Vazio = estoque consistente.
export async function reconciliarEstoque(): Promise<DivergenciaEstoque[]> {
  const produtos = await getProdutos();
  let somas: Map<string, number>;
  if (postgres.usarPostgres()) {
    somas = await postgres.somaLedgerEstoque();
  } else {
    const eventos = await readData<MovimentoEstoque[]>(ARQ_ESTOQUE, []);
    somas = new Map();
    for (const evento of eventos) somas.set(evento.produto_id, (somas.get(evento.produto_id) ?? 0) + evento.quantidade);
  }
  const divergencias: DivergenciaEstoque[] = [];
  for (const produto of produtos) {
    const saldo = saldoProduto(produto);
    const soma = somas.get(produto.id) ?? 0;
    if (saldo === null && soma === 0) continue;
    const diferenca = (saldo ?? 0) - soma;
    if (diferenca !== 0) divergencias.push({ produto_id: produto.id, produto_nome: produto.nome, saldo: saldo ?? 0, soma_ledger: soma, diferenca });
  }
  return divergencias;
}


export async function criarProduto(input: Pick<Produto, "nome" | "preco_pack" | "pack_quantidade" | "categoria_id" | "custo_pack"> & Partial<Pick<Produto, "descricao" | "imagem_url">>) {
  if (postgres.usarPostgres()) return postgres.inserir<Produto>("produtos", {
    ...input, id: randomUUID(), descricao: input.descricao ?? "", unidade: "un", imagem_url: input.imagem_url ?? "", ativo: true, created_at: new Date().toISOString(),
  });
  const run = writeChain.then(async () => {
    const dest = path.join(DATA_DIR, "produtos.json");
    const produtos: Produto[] = JSON.parse(await fs.readFile(dest, "utf8"));
    const produto: Produto = { ...input, id: randomUUID(), descricao: input.descricao ?? "", unidade: "un", imagem_url: input.imagem_url ?? "", ativo: true, created_at: new Date().toISOString() };
    produtos.push(produto);
    await fs.writeFile(dest + ".tmp", JSON.stringify(produtos, null, 2), "utf8");
    await fs.rename(dest + ".tmp", dest);
    return produto;
  });
  writeChain = run.catch(() => undefined);
  return run;
}

export async function getPedidos(): Promise<Pedido[]> {
  const pedidos = await readData<Pedido[]>("pedidos.json", []);
  // mais recentes primeiro
  return pedidos.filter(p => !p.excluido_em).sort((a, b) => b.numero - a.numero);
}

export async function getPedido(id: string): Promise<Pedido | undefined> {
  if (postgres.usarPostgres()) {
    const pedido = await postgres.buscar<Pedido>("pedidos", id);
    return pedido?.excluido_em ? undefined : pedido;
  }
  const pedidos = await getPedidos();
  return pedidos.find((p) => p.id === id);
}

// Exclusão lógica preserva a numeração e impede que uma reimportação restaure o orçamento.
export async function excluirPedido(id: string, permitirVenda = false): Promise<boolean> {
  if (postgres.usarPostgres()) {
    const anterior = await postgres.buscar<Pedido>("pedidos", id);
    const excluiu = await postgres.excluirPedido(id, permitirVenda);
    // Venda excluída devolve ao estoque o que a baixa havia retirado.
    if (excluiu && anterior?.status_pagamento === "finalizado") {
      await baixarEstoqueSeguro(`Venda #${anterior.numero} (excluída)`, saldos => movimentosDeEstorno(anterior, saldos));
    }
    return excluiu;
  }
  const run = writeChain.then(async () => {
    const pedidos = await readData<Pedido[]>("pedidos.json", []);
    const pedido = pedidos.find(p => p.id === id && !p.excluido_em);
    if (!pedido || (!permitirVenda && pedido.status_pagamento === "finalizado")) return false;
    pedido.excluido_em = new Date().toISOString();
    const dest = PEDIDOS_LOCAL;
    await fs.writeFile(dest + ".tmp", JSON.stringify(pedidos, null, 2), "utf8");
    await fs.rename(dest + ".tmp", dest);
    if (pedido.status_pagamento === "finalizado") {
      const movimentos = movimentosDeEstorno(pedido, saldosLocais(await readData<Produto[]>("produtos.json", [])));
      await gravarEstoqueLocal(movimentos);
    }
    return true;
  });
  writeChain = run.catch(() => undefined);
  return run;
}

export class PagamentoInvalido extends Error {}

const FORMAS_PAGAMENTO: FormaPagamento[] = ["pix", "cartao", "dinheiro"];

export interface EntradaPagamentoParcial {
  valor: number;
  forma_pagamento: FormaPagamento;
  previsao_recebimento?: string | null;
}

function normalizarPagamentoParcial(entrada: unknown, hoje = diaLocal(new Date())): EntradaPagamentoParcial {
  const b = entrada as Partial<EntradaPagamentoParcial> | null;
  if (!b || typeof b !== "object") throw new PagamentoInvalido("Informe o valor do recebimento parcial.");
  if (!FORMAS_PAGAMENTO.includes(b.forma_pagamento as FormaPagamento)) throw new PagamentoInvalido("Selecione Pix, cartão ou dinheiro.");
  const valor = typeof b.valor === "number" ? Math.round(b.valor * 100) / 100 : NaN;
  if (!Number.isFinite(valor) || valor <= 0) throw new PagamentoInvalido("Informe um valor maior que zero.");
  if (valor > 1_000_000) throw new PagamentoInvalido("Valor acima do permitido para um recebimento.");
  const previsao = b.previsao_recebimento ?? null;
  if (previsao !== null) {
    if (typeof previsao !== "string" || !dataValida(previsao)) throw new PagamentoInvalido("Escolha uma data válida para o lembrete.");
    if (previsao < hoje) throw new PagamentoInvalido("O lembrete não pode estar no passado.");
  }
  return { valor, forma_pagamento: b.forma_pagamento as FormaPagamento, previsao_recebimento: previsao };
}

// Registra um recebimento parcial: o orçamento continua aberto, agora na aba
// "Recebimento parcial", até o restante ser recebido e a venda efetivada.
export async function registrarPagamentoParcial(
  id: string,
  entrada: unknown,
  registradoPor?: Pedido["criado_por"],
  revisao?: number,
): Promise<Pedido | undefined> {
  const { valor, forma_pagamento, previsao_recebimento } = normalizarPagamentoParcial(entrada);
  const agora = new Date().toISOString();
  const pagamento: PagamentoParcial = { id: randomUUID(), valor, forma_pagamento, pago_em: agora, registrado_por: registradoPor };

  const montarPatch = (pedido: Pedido) => {
    const restante = valorRestante(pedido);
    if (valor >= restante) throw new PagamentoInvalido(`O valor cobre o restante (${formatBRL(restante)}); use o pagamento total para finalizar a venda.`);
    const pagamentos = [...(pedido.pagamentos ?? []), pagamento];
    return {
      pagamentos,
      valor_pago: Math.round(pagamentos.reduce((soma, p) => soma + Math.round(p.valor * 100), 0)) / 100,
      status_pagamento: "parcial" as const,
      previsao_recebimento: previsao_recebimento ?? pedido.previsao_recebimento ?? null,
      updated_at: agora,
      revisao: (pedido.revisao ?? 0) + 1,
    };
  };

  if (postgres.usarPostgres()) {
    const pedido = await postgres.buscar<Pedido>("pedidos", id);
    if (!pedido || pedido.excluido_em || pedido.status_pagamento === "finalizado" || (revisao !== undefined && (pedido.revisao ?? 0) !== revisao)) return undefined;
    return postgres.editarPedido(id, montarPatch(pedido), revisao ?? pedido.revisao ?? 0);
  }

  const run = writeChain.then(async () => {
    const pedidos = await readData<Pedido[]>("pedidos.json", []);
    const pedido = pedidos.find(p => p.id === id && !p.excluido_em && p.status_pagamento !== "finalizado" && (revisao === undefined || (p.revisao ?? 0) === revisao));
    if (!pedido) return undefined;
    Object.assign(pedido, montarPatch(pedido));
    const dest = PEDIDOS_LOCAL;
    await fs.writeFile(dest + ".tmp", JSON.stringify(pedidos, null, 2), "utf8");
    await fs.rename(dest + ".tmp", dest);
    return pedido;
  });
  writeChain = run.catch(() => undefined);
  return run;
}

export async function finalizarPagamento(id: string, forma: FormaPagamento, revisao?: number, finalizadoPor?: Pedido["finalizado_por"]): Promise<Pedido | undefined> {
  if (!FORMAS_PAGAMENTO.includes(forma)) throw new Error("Forma de pagamento inválida.");
  const agora = new Date().toISOString();

  // Ao quitar um orçamento que já teve recebimentos parciais, o restante entra
  // como o último pagamento do histórico, para o cupom e a auditoria fecharem.
  const patchDe = (pedido: Pedido) => {
    const restante = valorRestante(pedido);
    const pagamentos = [...(pedido.pagamentos ?? [])];
    if (pagamentos.length && restante > 0) {
      pagamentos.push({ id: randomUUID(), valor: restante, forma_pagamento: forma, pago_em: agora, registrado_por: finalizadoPor });
    }
    return {
      status_pagamento: "finalizado" as const,
      forma_pagamento: forma,
      finalizado_por: finalizadoPor,
      pago_em: agora,
      status: "concluido" as const,
      valor_pago: pedido.valor_total,
      previsao_recebimento: null,
      updated_at: agora,
      ...(pagamentos.length ? { pagamentos } : {}),
    };
  };

  if (postgres.usarPostgres()) {
    const atual = await postgres.buscar<Pedido>("pedidos", id);
    if (!atual || atual.excluido_em || atual.status_pagamento === "finalizado") return undefined;
    const finalizado = await postgres.finalizarPagamento(id, patchDe(atual), revisao);
    if (finalizado) await baixarEstoqueSeguro(`Venda #${finalizado.numero}`, saldos => movimentosDeSaida(finalizado, saldos, finalizadoPor));
    return finalizado;
  }

  const run = writeChain.then(async () => {
    const pedidos = await readData<Pedido[]>("pedidos.json", []);
    const pedido = pedidos.find(p => p.id === id && !p.excluido_em && p.status_pagamento !== "finalizado" && (revisao === undefined || (p.revisao ?? 0) === revisao));
    if (!pedido) return undefined;
    Object.assign(pedido, patchDe(pedido), { revisao: (pedido.revisao ?? 0) + 1 });
    const dest = PEDIDOS_LOCAL;
    await fs.writeFile(dest + ".tmp", JSON.stringify(pedidos, null, 2), "utf8");
    await fs.rename(dest + ".tmp", dest);
    // Baixa do estoque: só produtos com saldo controlado; dentro da mesma fila.
    const movimentos = movimentosDeSaida(pedido, saldosLocais(await readData<Produto[]>("produtos.json", [])), finalizadoPor);
    await gravarEstoqueLocal(movimentos);
    return pedido;
  });
  writeChain = run.catch(() => undefined);
  return run;
}

export interface NovoItem {
  produto_id: string;
  produto_nome: string;
  modo: "unidade" | "pacote";
  pack_quantidade?: number;
  quantidade: number;
  preco_unitario: number;
}

export interface NovoPedido {
  cliente_id?: string;
  cliente_nome?: string;
  telefone?: string;
  observacao?: string;
  criado_por?: { id: string; nome: string };
  itens: NovoItem[];
}

export class EdicaoInvalida extends Error {}

export interface EdicaoPedido extends NovoPedido {
  revisao: number;
  itens: (NovoItem & { id?: string })[];
}

export function validarEdicaoPedido(body: unknown): EdicaoPedido {
  if (!body || typeof body !== "object") throw new EdicaoInvalida("Dados inválidos.");
  const b = body as EdicaoPedido;
  if (!Number.isSafeInteger(b.revisao) || b.revisao < 0 ||
    [b.cliente_id, b.cliente_nome, b.telefone, b.observacao].some(v => v !== undefined && typeof v !== "string") ||
    !Array.isArray(b.itens) || b.itens.length === 0) throw new EdicaoInvalida("Revise os dados e inclua pelo menos um produto.");
  const ids = new Set<string>();
  let totalCentavos = 0;
  for (const it of b.itens) {
    if (!it || typeof it.produto_id !== "string" || !it.produto_id.trim() ||
      typeof it.produto_nome !== "string" || !it.produto_nome.trim() ||
      !["pacote", "unidade"].includes(it.modo) ||
      !Number.isSafeInteger(it.quantidade) || it.quantidade < 1 ||
      (it.modo === "pacote" && (!Number.isSafeInteger(it.pack_quantidade) || it.pack_quantidade! < 1)) ||
      typeof it.preco_unitario !== "number" || !Number.isFinite(it.preco_unitario) || it.preco_unitario < 0 ||
      (it.id !== undefined && (typeof it.id !== "string" || !it.id || ids.has(it.id)))) throw new EdicaoInvalida("Revise nomes, preços e quantidades dos produtos.");
    if (it.id) ids.add(it.id);
    totalCentavos += Math.round(Math.round(it.preco_unitario * 100) * it.quantidade);
    if (!Number.isSafeInteger(totalCentavos)) throw new EdicaoInvalida("Valor total inválido.");
  }
  return b;
}

export async function editarPedido(id: string, body: unknown, permitirVenda = false): Promise<Pedido | undefined> {
  const input = validarEdicaoPedido(body);
  const run = writeChain.then(async () => {
    const remoto = postgres.usarPostgres();
    const pedidos = remoto ? [] : await readData<Pedido[]>("pedidos.json", []);
    const anterior = remoto ? await getPedido(id) : pedidos.find(p => p.id === id && !p.excluido_em);
    if (!anterior || (!permitirVenda && anterior.status_pagamento === "finalizado") || (anterior.revisao ?? 0) !== input.revisao) return undefined;
    const eraVendaFinalizada = anterior.status_pagamento === "finalizado";
    const itensAntigos = [...anterior.itens];
    const catalogo = new Map((await getProdutos()).map(p => [p.id, p]));
    const itens: ItemPedido[] = input.itens.map(it => {
      const antigo = it.id ? anterior.itens.find(a => a.id === it.id) : undefined;
      const produto = catalogo.get(it.produto_id);
      if ((it.id && (!antigo || antigo.produto_id !== it.produto_id || antigo.modo !== it.modo)) || (!it.id && (!produto || !produto.ativo))) {
        throw new EdicaoInvalida("Um produto não está mais disponível. Recarregue o orçamento.");
      }
      const custoAtual = produto?.custo_pack && produto.custo_pack > 0
        ? (it.modo === "pacote" ? produto.custo_pack : produto.custo_pack / produto.pack_quantidade) : null;
      const custo = antigo ? antigo.custo_unitario ?? null : custoAtual;
      const preco = Math.round(it.preco_unitario * 100) / 100;
      // Itens existentes preservam a referência histórica, inclusive sem produto no catálogo.
      const preco_original = Math.round((antigo ? antigo.preco_original ?? antigo.preco_unitario
        : produto ? (it.modo === "pacote" ? produto.preco_pack : produto.preco_pack / produto.pack_quantidade) : preco) * 100) / 100;
      return { id: antigo?.id ?? randomUUID(), produto_id: it.produto_id, produto_nome: it.produto_nome.trim(),
        modo: it.modo, pack_quantidade: it.modo === "pacote" ? it.pack_quantidade : undefined,
        quantidade: it.quantidade, preco_unitario: preco, preco_original,
        desconto_unitario: Math.max(0, Math.round((preco_original - preco) * 100)) / 100,
        custo_unitario: custo, subtotal: Math.round(preco * it.quantidade * 100) / 100 };
    });
    const total = itens.reduce((s, it) => s + Math.round(it.subtotal * 100), 0) / 100;
    if (anterior.status_pagamento === "parcial") {
      const pago = valorPago(anterior);
      if (total < pago) throw new EdicaoInvalida(`O novo total (${formatBRL(total)}) ficaria abaixo do valor já recebido (${formatBRL(pago)}). Ajuste os recebimentos antes de editar.`);
    }
    const patch = { cliente_id: input.cliente_id === undefined ? anterior.cliente_id : (input.cliente_id.trim() || undefined),
      cliente_nome: (input.cliente_nome ?? "").trim(), telefone: (input.telefone ?? "").trim(), observacao: (input.observacao ?? "").trim(),
      itens, valor_total: total, lucro_bruto: itens.every(it => it.custo_unitario != null)
        ? (Math.round(total * 100) - itens.reduce((s, it) => s + Math.round(it.custo_unitario! * it.quantidade * 100), 0)) / 100 : null,
      updated_at: new Date().toISOString(), revisao: input.revisao + 1 };
    if (remoto) {
      const editado = await postgres.editarPedido(id, patch, input.revisao, permitirVenda);
      // Edição de venda finalizada ajusta o estoque só pela diferença de unidades.
      if (editado && anterior.status_pagamento === "finalizado") {
        const deltas = deltasDeEdicao(anterior.itens, editado.itens);
        await baixarEstoqueSeguro(`Venda #${editado.numero} (editada)`, saldos => movimentosDeDelta(editado, deltas, saldos, undefined, undefined, randomUUID));
      }
      return editado;
    }
    Object.assign(anterior, patch);
    const dest = PEDIDOS_LOCAL;
    await fs.writeFile(dest + ".tmp", JSON.stringify(pedidos, null, 2), "utf8");
    await fs.rename(dest + ".tmp", dest);
    if (eraVendaFinalizada) {
      const deltas = deltasDeEdicao(itensAntigos, anterior.itens);
      await gravarEstoqueLocal(movimentosDeDelta(anterior, deltas, saldosLocais(await readData<Produto[]>("produtos.json", [])), undefined, undefined, randomUUID));
    }
    return anterior;
  });
  writeChain = run.catch(() => undefined);
  return run;
}

export async function createPedido(input: NovoPedido): Promise<Pedido> {
  const run = writeChain.then(async () => {
  const remoto = postgres.usarPostgres();
  const pedidos = remoto ? [] : await readData<Pedido[]>("pedidos.json", []);
  const numero =
    pedidos.reduce((max, p) => Math.max(max, p.numero || 0), 0) + 1;

  // Custos lidos no servidor e congelados; alterações futuras não mudam o histórico.
  const produtos = new Map((await getProdutos()).map(p => [p.id, p]));
  const itens: ItemPedido[] = (input.itens || []).map((it) => {
    const produto = produtos.get(it.produto_id);
    const custo = produto?.custo_pack;
    const custo_unitario = typeof custo === "number" && Number.isFinite(custo) && custo > 0
      ? (it.modo === "pacote" ? custo : custo / (produto?.pack_quantidade || 1)) : null;
    const quantidade = Math.max(1, Number(it.quantidade) || 1);
    const preco_unitario = Math.round((Number(it.preco_unitario) || 0) * 100) / 100;
    const preco_original = Math.round((produto ? (it.modo === "pacote" ? produto.preco_pack : produto.preco_pack / produto.pack_quantidade) : preco_unitario) * 100) / 100;
    return {
      id: randomUUID(),
      produto_id: it.produto_id,
      produto_nome: it.produto_nome,
      modo: it.modo,
      pack_quantidade:
        it.modo === "pacote"
          ? Math.max(1, Math.trunc(Number(it.pack_quantidade) || 1))
          : undefined,
      quantidade,
      preco_unitario,
      preco_original,
      desconto_unitario: Math.max(0, Math.round((preco_original - preco_unitario) * 100)) / 100,
      custo_unitario,
      subtotal: Math.round(preco_unitario * quantidade * 100) / 100,
    };
  });

  const valor_total =
    Math.round(itens.reduce((s, it) => s + it.subtotal, 0) * 100) / 100;

  const novo: Pedido = {
    id: randomUUID(),
    numero,
    cliente_id: input.cliente_id?.trim() || undefined,
    cliente_nome: (input.cliente_nome ?? "").trim(),
    telefone: (input.telefone ?? "").trim(),
    observacao: (input.observacao ?? "").trim(),
    criado_por: input.criado_por,
    itens,
    valor_total,
    lucro_bruto: itens.length > 0 && itens.every(it => it.custo_unitario != null)
      ? (Math.round(valor_total * 100) - itens.reduce((s, it) => s + Math.round(it.custo_unitario! * it.quantidade * 100), 0)) / 100
      : null,
    status: "novo",
    status_pagamento: "pendente",
    created_at: new Date().toISOString(),
  };

  if (remoto) return postgres.inserirPedido(novo);
  pedidos.push(novo);
  await ensureDir();
  const dest = PEDIDOS_LOCAL;
  await fs.writeFile(dest + ".tmp", JSON.stringify(pedidos, null, 2), "utf8");
  await fs.rename(dest + ".tmp", dest);
  return novo;
  });
  writeChain = run.catch(() => undefined);
  return run;
}
