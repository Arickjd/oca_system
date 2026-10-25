import type { Pedido } from "./types";
import { diaLocal, type Periodo } from "./periodoOrcamentos";

export function separarHistorico(pedidos: Pedido[]) {
  const ativos = pedidos.filter(p => !p.excluido_em);
  return {
    pendentes: ativos.filter(p => p.status_pagamento !== "finalizado"),
    vendas: ativos.filter(p => p.status_pagamento === "finalizado"),
  };
}

export function diasPendentes(pedidos: Pedido[]) {
  const dias = new Map<string, number>();
  for (const p of separarHistorico(pedidos).pendentes) {
    const dia = diaLocal(p.created_at);
    if (dia) dias.set(dia, (dias.get(dia) ?? 0) + 1);
  }
  return [...dias].sort(([a], [b]) => b.localeCompare(a)).map(([dia, quantidade]) => ({ dia, quantidade }));
}

export function movimentoDiario(pedidos: Pedido[], periodo: Periodo) {
  const dias = new Map<string, { dia: string; pendentes: number; vendas: number }>();
  const inicio = new Date(`${periodo.inicio}T12:00:00Z`);
  const fim = new Date(`${periodo.fim}T12:00:00Z`);
  // Períodos curtos incluem dias vazios; intervalos longos mostram dias com registros.
  const diasCorridos = Math.round((fim.getTime() - inicio.getTime()) / 86400000) + 1;
  if (diasCorridos <= 92) {
    for (let i = 0; i < diasCorridos; i++) {
      const data = new Date(inicio.getTime() + i * 86400000).toISOString().slice(0, 10);
      dias.set(data, { dia: data, pendentes: 0, vendas: 0 });
    }
  }
  for (const p of pedidos) {
    const dia = diaLocal(p.created_at);
    if (p.excluido_em || !dia || dia < periodo.inicio || dia > periodo.fim) continue;
    const valores = dias.get(dia) ?? { dia, pendentes: 0, vendas: 0 };
    if (p.status_pagamento === "finalizado") valores.vendas++;
    else valores.pendentes++;
    dias.set(dia, valores);
  }
  return { dias: [...dias.values()].sort((a, b) => a.dia.localeCompare(b.dia)), somenteComRegistros: diasCorridos > 92 };
}
