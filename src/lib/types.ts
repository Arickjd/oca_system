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
  pack_quantidade?: number;
  quantidade: number;
  preco_unitario: number; // preço registrado no pedido (pedidos antigos podem ser unitários)
  subtotal: number;
}

export type PedidoStatus = "novo" | "em_separacao" | "concluido" | "cancelado";

export interface Pedido {
  id: string;
  numero: number;
  cliente_nome: string;
  telefone: string;
  observacao: string;
  itens: ItemPedido[];
  valor_total: number;
  status: PedidoStatus;
  excluido_em?: string;
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
  preco_unitario: number;
  pack_quantidade: number;
  imagem_url: string;
  quantidade: number;
}
