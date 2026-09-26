# Especificação de Sistema – Distribuidora de Bebidas

## 1. Objetivo

Desenvolver uma aplicação web responsiva (mobile-first) para geração de orçamentos de pedidos de uma distribuidora de bebidas.

O sistema será utilizado pelo proprietário da distribuidora

O foco principal é facilitar a montagem de pedidos e a geração automática de um orçamento no formato A4 vertical (recibo impresso).

Não é necessário realizar controle de estoque nesta primeira versão, apenas alterar e incluir produtos, preços, quantidade do pacote.

---

# 2. Escopo do MVP

## Funcionalidades Principais

### Catálogo de Produtos

O sistema deve possuir um catálogo contendo todos os produtos comercializados pela distribuidora.

Cada produto deverá conter:

- Nome
- Categoria
- Preço unitário
- Preço do fardo/ atacado, (quantidade, ex: 12x )
- Imagem (opcional)
- Unidade de venda (unidade, caixa, fardo, etc.)
- Status ativo/inativo 


### Carrinho de Compras

O usuário deverá conseguir:

- Navegar pelos produtos
- Adicionar produtos ao carrinho
- Alterar quantidades
- Remover produtos
- Visualizar subtotal por item
- Visualizar valor total do pedido



---

### Solicitação de Orçamento

Ao finalizar o carrinho o sistema deverá registrar o pedido. Gerar um recibo para ser impresso.

---

### Geração de Nota

Após a confirmação do pedido, gerar automaticamente uma Nota contendo:

Dados do cliente:

- Nome
- Telefone
- Data

Lista de produtos:

- Produto
- Quantidade
- Valor unitário
- Subtotal

Resumo:

- Valor total

Rodapé:

- Nome da distribuidora
- Contato da distribuidora

O PDF deverá poder ser:

- Visualizado
- Baixado
- Compartilhado

Nenhum campo deve ser obrigatorio

---

### Envio para a Distribuidora

Após a geração do orçamento, o sistema deverá disponibilizar uma das opções:

#### Opção A (preferencial)

Botão "Enviar Pedido"

O pedido é registrado internamente e aparece no painel administrativo.

#### Opção B

Botão para envio via WhatsApp.

O sistema gera automaticamente uma mensagem contendo os itens do pedido.

---

### Painel Administrativo

Funcionalidades:

#### Produtos

- Criar produto
- Editar produto
- Excluir produto

#### Categorias

- Criar categoria
- Editar categoria
- Excluir categoria

- Editar preços, quant do pacote, etc etc..


---

# 3. Requisitos Funcionais

RF01 – Exibir catálogo de produtos.

RF02 – Filtrar produtos por categoria.

RF03 – Adicionar produtos ao carrinho.

RF04 – Editar quantidade de produtos.

RF05 – Remover produtos do carrinho.

RF06 – Calcular total do pedido.

RF07 – Registrar pedido.

RF08 – Gerar PDF do orçamento.

RF09 – Disponibilizar download do PDF.

RF10 – Permitir acesso administrativo.

RF11 – Gerenciar produtos.

RF12 – Gerenciar categorias.

RF13 – Gerenciar pedidos.

RF14 – Alterar status do pedido.

RF15 – Permitir compartilhamento do pedido.

---

# 4. Requisitos Não Funcionais

RNF01 – Interface mobile-first.

RNF02 – Funcionar adequadamente em:

- Chrome mobile

RNF03 – Tempo de carregamento inferior a 3 segundos em conexões comuns.

RNF04 – Layout responsivo.

RNF05 – Disponibilidade mínima de 99%.

RNF06 – Sistema hospedado na web.

RNF07 – HTTPS obrigatório.

---

# 5. Perfis de Usuário

## Administrador

Permissões:

- Todas as funcionalidades do cliente
- Gerenciar produtos
- Gerenciar categorias
- Gerenciar pedidos
- Alterar status dos pedidos

---

# 6. Estrutura de Dados

## Categoria

Campos:

- id
- nome
- ativo
- created_at

---

## Produto

Campos:

- id
- nome
- descricao
- preco
- unidade
- imagem_url
- categoria_id
- ativo
- created_at

---

## Pedido

Campos:

- id
- cliente_nome
- telefone
- observacao
- valor_total
- status
- pdf_url
- created_at

---

## ItemPedido

Campos:

- id
- pedido_id
- produto_id
- quantidade
- preco_unitario
- subtotal

---

# 7. Arquitetura Recomendada

## Frontend

- Next.js

## Backend

- API Routes do Next.js

## Banco de Dados

- arquivo txt

## Hospedagem

- Vercel

---

# 8. Objetivo Final

Permitir que o proprietário da distribuidora montem pedidos rapidamente através do celular, gerem orçamentos em PDF e encaminhem os pedidos para separação sem necessidade de controle de estoque nesta primeira versão.