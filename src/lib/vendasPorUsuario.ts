import type { Pedido } from "./types";
import { USUARIOS } from "./usuarios";
import { filtrarPeriodo, type Periodo } from "./periodoOrcamentos";
import { resumoLucroVendas, separarHistorico } from "./historicoOrcamentos";

export function vendasPorUsuario(pedidos: Pedido[], periodo: Periodo) {
  const grupos = new Map<string, { id: string; nome: string; vendas: Pedido[] }>(
    USUARIOS.map(usuario => [usuario.id, { id: usuario.id, nome: usuario.nome, vendas: [] }]),
  );
  for (const venda of separarHistorico(filtrarPeriodo(pedidos, periodo)).vendas) {
    const id = venda.criado_por?.id || "";
    const grupo = grupos.get(id) ?? { id, nome: venda.criado_por?.nome || "Sem responsável informado", vendas: [] };
    grupo.vendas.push(venda);
    grupos.set(id, grupo);
  }
  return [...grupos.values()].map(grupo => ({
    ...grupo,
    total: grupo.vendas.reduce((soma, venda) => soma + Math.round(venda.valor_total * 100), 0) / 100,
    lucro: resumoLucroVendas(grupo.vendas),
  }));
}
