// Evento do log de auditoria: quem fez, quando, o que e os detalhes exibidos ao expandir.
export interface DetalheAuditoria {
  rotulo: string;
  valor: string;
}

export interface EventoAuditoria {
  id: string;
  em: string; // ISO 8601
  usuario: { id: string; nome: string };
  acao: string; // chave estável, ex.: "pagamento.parcial"
  titulo: string; // operação legível, ex.: "Recebimento parcial"
  alvo: string; // objeto da ação, ex.: "Cliente X · Orçamento #12"
  resumo?: string;
  detalhes: DetalheAuditoria[];
}

// Título do lançamento nos pedidos: cliente (quando informado) e número.
export function alvoDoPedido(pedido: { numero: number; cliente_nome?: string }): string {
  return `${pedido.cliente_nome ? `${pedido.cliente_nome} ` : ""}#${pedido.numero}`;
}
