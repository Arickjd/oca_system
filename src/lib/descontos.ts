import type { Pedido } from "./types";

// Soma o desconto de todos os itens (por unidade × quantidade). Itens antigos,
// sem desconto_unitario, usam a diferença entre o preço original e o praticado.
export function descontoTotalPedido(pedido: Pedido) {
  const centavos = pedido.itens.reduce((soma, item) => {
    const desconto = typeof item.desconto_unitario === "number"
      ? item.desconto_unitario
      : Math.max(0, (item.preco_original ?? item.preco_unitario) - item.preco_unitario);
    return soma + Math.round(desconto * 100) * item.quantidade;
  }, 0);
  return centavos / 100;
}
