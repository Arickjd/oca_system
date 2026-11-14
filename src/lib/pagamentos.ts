import type { Pedido } from "./types";
import { diaLocal } from "./periodoOrcamentos";

const centavos = (valor: number) => Math.round(valor * 100);
const reais = (valor: number) => valor / 100;

// Quanto já entrou deste orçamento. Pedidos antigos, sem histórico, valem o
// total quando finalizados; finalizados novos também fecham em valor_total.
export function valorPago(pedido: Pedido): number {
  if (pedido.pagamentos?.length) {
    return reais(pedido.pagamentos.reduce((soma, pagamento) => soma + centavos(pagamento.valor), 0));
  }
  if (typeof pedido.valor_pago === "number") return Math.min(pedido.valor_pago, pedido.valor_total);
  return pedido.status_pagamento === "finalizado" ? pedido.valor_total : 0;
}

export function valorRestante(pedido: Pedido): number {
  return Math.max(0, reais(centavos(pedido.valor_total) - centavos(valorPago(pedido))));
}

export function estaParcial(pedido: Pedido): boolean {
  return pedido.status_pagamento === "parcial";
}

// Dias entre hoje e a data do lembrete (positivo = futuro, negativo = atraso).
export function diasAte(data: string, hoje = diaLocal(new Date())): number {
  const alvo = Date.parse(`${data}T12:00:00Z`);
  const base = Date.parse(`${hoje}T12:00:00Z`);
  if (!Number.isFinite(alvo) || !Number.isFinite(base)) return 0;
  return Math.round((alvo - base) / 86400000);
}

export type SituacaoPrazo = { dias: number; texto: string; tom: "atraso" | "hoje" | "proximo" | "futuro" };

export function situacaoPrazo(data?: string | null, hoje = diaLocal(new Date())): SituacaoPrazo | null {
  if (!data) return null;
  const dias = diasAte(data, hoje);
  if (dias < 0) return { dias, texto: `atrasado ${Math.abs(dias)} ${Math.abs(dias) === 1 ? "dia" : "dias"}`, tom: "atraso" };
  if (dias === 0) return { dias, texto: "vence hoje", tom: "hoje" };
  if (dias <= 7) return { dias, texto: `vence em ${dias} ${dias === 1 ? "dia" : "dias"}`, tom: "proximo" };
  return { dias, texto: `vence em ${dias} dias`, tom: "futuro" };
}

export function totalAReceber(pedidos: Pedido[]): number {
  return reais(pedidos.reduce((soma, pedido) => soma + centavos(valorRestante(pedido)), 0));
}

// Data de lembrete a partir das opções rápidas do formulário.
export function dataDoLembrete(tipo: "semana" | "mes" | "data", data?: string, agora = new Date()): string | null {
  if (tipo === "data") return data && /^\d{4}-\d{2}-\d{2}$/.test(data) ? data : null;
  const alvo = new Date(`${diaLocal(agora)}T12:00:00Z`);
  if (tipo === "semana") alvo.setUTCDate(alvo.getUTCDate() + 7);
  else alvo.setUTCMonth(alvo.getUTCMonth() + 1);
  return alvo.toISOString().slice(0, 10);
}
