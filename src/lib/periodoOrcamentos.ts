import type { Pedido } from "./types";

export const FUSO = "America/Sao_Paulo";
export type Periodo = { tipo: "hoje" | "semana" | "personalizado"; inicio: string; fim: string };
export function diaLocal(iso: string | Date): string {
  const data = new Date(iso);
  if (!Number.isFinite(data.getTime())) return "";
  const partes = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(data);
  return ["year", "month", "day"].map(tipo => partes.find(p => p.type === tipo)!.value).join("-");
}
export function dataValida(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const d = new Date(`${valor}T12:00:00Z`);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === valor;
}
export function resolverPeriodo(params: { periodo?: string; inicio?: string; fim?: string }, agora = new Date()): Periodo {
  const hoje = diaLocal(agora);
  const tipo = params.periodo || "hoje";
  if (tipo === "hoje") return { tipo, inicio: hoje, fim: hoje };
  if (tipo === "semana") {
    const inicio = new Date(`${hoje}T12:00:00Z`);
    inicio.setUTCDate(inicio.getUTCDate() - 6);
    return { tipo, inicio: inicio.toISOString().slice(0, 10), fim: hoje };
  }
  if (tipo !== "personalizado" || !params.inicio || !params.fim || !dataValida(params.inicio) || !dataValida(params.fim) || params.inicio > params.fim) {
    throw new Error("Informe um período válido: a data inicial deve ser anterior ou igual à final.");
  }
  return { tipo, inicio: params.inicio, fim: params.fim };
}
export function filtrarPeriodo(pedidos: Pedido[], periodo: Periodo): Pedido[] {
  return pedidos.filter(p => {
    const dia = diaLocal(p.created_at);
    return !p.excluido_em && dia >= periodo.inicio && dia <= periodo.fim;
  }).sort((a, b) => b.created_at.localeCompare(a.created_at) || b.numero - a.numero);
}
export function dataCurta(dia: string) { return dia.split("-").reverse().join("/"); }
export function resumoPeriodo(pedidos: Pedido[]) {
  const somar = (lista: Pedido[]) => lista.reduce((s, p) => s + Math.round(p.valor_total * 100), 0) / 100;
  const pagos = pedidos.filter(p => p.status_pagamento === "finalizado");
  const pendentes = pedidos.filter(p => p.status_pagamento !== "finalizado");
  return { total: somar(pedidos), recebido: somar(pagos), pendente: somar(pendentes), pagos: pagos.length, pendentes: pendentes.length };
}
export const formasPagamento = { pix: "Pix", cartao: "Cartão", dinheiro: "Dinheiro" };
