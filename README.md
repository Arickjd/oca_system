# OCA Distribuidora — Sistema de Orçamentos

Aplicação web **mobile-first** para o dono da OCA Distribuidora montar pedidos de
atacado pelo celular e gerar um **orçamento em formato A4 (recibo)** — sem perfis de
usuário, painel administrativo ou controle de estoque.

Baseada na especificação em [`Especificacao_Distribuidora_Bebidas.md`](Especificacao_Distribuidora_Bebidas.md),
com o fluxo simplificado para uso interno do proprietário.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4**
- **API Routes** do Next.js (backend)
- **Banco de dados em arquivos JSON** (`data/`), populado a partir de `produtos.txt`

## Como rodar

```bash
npm install
npm run seed      # gera data/produtos.json e data/categorias.json a partir de produtos.txt
npm run dev       # desenvolvimento em http://localhost:3000
```

Para produção:

```bash
npm run build
npm run start
```

## Estrutura

```
src/
  app/
    (loja)/           # catálogo, edição do pedido e checkout
    orcamento/[id]/   # recibo A4 (imprimir / PDF / WhatsApp / compartilhar)
    api/              # leitura do catálogo/configuração e registro de pedidos
  components/         # interface do catálogo e do pedido
  lib/                # tipos, banco, configuração, formatação e carrinho
data/                 # "banco de dados" em JSON (produtos, categorias, pedidos, config)
scripts/seed.mjs      # importa produtos.txt -> JSON
```

## Funcionalidades (mapeamento com a especificação)

| Requisito | Onde |
|-----------|------|
| RF01/RF02 – Catálogo com filtro por categoria e busca | `/` |
| Carrinho: editar nome, preço, quantidade e tamanho do pacote | `/carrinho` |
| RF07 – Registrar pedido | `/checkout` → `POST /api/pedidos` |
| RF08/RF09 – Gerar e baixar orçamento (A4, imprimir/salvar PDF) | `/orcamento/[id]` |
| RF15 – Compartilhar pedido (WhatsApp / Web Share) | `/orcamento/[id]` |

Cada produto possui somente **preço de atacado por pacote**. Depois de adicioná-lo,
o dono da distribuidora pode ajustar no carrinho o nome, o valor, a quantidade de
pacotes e a quantidade de itens por pacote. Nenhum campo de cliente é obrigatório.

## Observação sobre hospedagem

O banco usa **arquivos JSON** no diretório `data/` (conforme a arquitetura do MVP).
Em plataformas *serverless* (ex.: **Vercel**) o sistema de arquivos é **efêmero** — as
escrituras (novos pedidos, edições) **não persistem** entre requisições/deploys.

Para persistência real em produção, use uma das opções:

1. Hospedar em um servidor com filesystem persistente (VPS, Render, Railway, etc.); ou
2. Trocar a camada de dados (isolada em [`src/lib/db.ts`](src/lib/db.ts)) por um banco
   gerenciado (Postgres, SQLite, Vercel KV/Blob, etc.).

Como toda a leitura/escrita passa por `src/lib/db.ts`, a migração fica restrita a esse arquivo.
