import type { Pedido } from "./types";
import { situacaoPrazo, valorRestante, type SituacaoPrazo } from "./pagamentos";

export interface AvisoRecebimento {
  id: string;
  numero: number;
  cliente: string;
  restante: number;
  previsao: string;
  prazo: SituacaoPrazo;
}

// Recebimentos parciais com prazo, do mais urgente para o mais distante.
export function avisosRecebimento(pedidos: Pedido[]): AvisoRecebimento[] {
  return pedidos
    .filter(pedido => pedido.status_pagamento === "parcial" && pedido.previsao_recebimento)
    .map(pedido => {
      const previsao = pedido.previsao_recebimento!;
      return {
        id: pedido.id,
        numero: pedido.numero,
        cliente: pedido.cliente_nome || "Cliente não informado",
        restante: valorRestante(pedido),
        previsao,
        prazo: situacaoPrazo(previsao)!,
      };
    })
    .sort((a, b) => a.prazo.dias - b.prazo.dias || a.numero - b.numero);
}
