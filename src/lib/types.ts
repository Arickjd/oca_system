// Estruturas de dados do sistema (conforme especificação, seção 6)

export interface Categoria {
  id: string;
  nome: string;
  ativo: boolean;
  created_at: string;
}

export interface Produto {
  id: string;
  codigo?: string;
  nome: string;
  descricao: string;
  preco: number; // preço unitário
  preco_pack: number; // preço do fardo/atacado
  pack_quantidade: number; // qtd de unidades no pacote (ex: 6)
  unidade: string; // unidade de venda: un, caixa, fardo...
  imagem_url: string;
  categoria_id: string;
  ativo: boolean;
  created_at: string;
}

export type ModoVenda = "unidade" | "pacote";

export interface ItemPedido {
  id: string;
  produto_id: string;
  produto_nome: string;
  modo: ModoVenda;
  quantidade: number;
  preco_unitario: number; // preço da unidade ou do pacote, conforme o modo
  subtotal: number;
}

export type PedidoStatus = "novo" | "em_separacao" | "concluido" | "cancelado";

export const STATUS_LABEL: Record<PedidoStatus, string> = {
  novo: "Novo",
  em_separacao: "Em separação",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export interface Pedido {
  id: string;
  numero: number;
  cliente_nome: string;
  telefone: string;
  observacao: string;
  itens: ItemPedido[];
  valor_total: number;
  status: PedidoStatus;
  created_at: string;
}

export interface Config {
  distribuidora_nome: string;
  distribuidora_contato: string; // exibição, ex: (89) 99427-0756
  whatsapp: string; // só dígitos, formato internacional para wa.me
  endereco: string;
  pack_padrao: number;
}

// Item do carrinho (lado do cliente)
export interface CartItem {
  produto_id: string;
  nome: string;
  modo: ModoVenda;
  preco_unitario: number;
  pack_quantidade: number;
  unidade: string;
  imagem_url: string;
  quantidade: number;
}
