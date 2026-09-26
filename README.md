# OCA Distribuidora — Sistema de Orçamentos

Aplicação web **mobile-first** para a OCA Distribuidora montar pedidos rapidamente pelo
celular, gerar um **orçamento em formato A4 (recibo)** e encaminhá-lo para separação —
sem controle de estoque nesta primeira versão.

Implementa a especificação em [`Especificacao_Distribuidora_Bebidas.md`](Especificacao_Distribuidora_Bebidas.md).

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

### Acesso ao painel administrativo

- URL: `/admin`
- Senha padrão: **`oca2024`** (configurável via variável de ambiente)

Copie `.env.example` para `.env.local` e ajuste:

```
ADMIN_PASSWORD=suaSenhaForte
AUTH_SECRET=umValorAleatorioLongo
```

## Estrutura

```
src/
  app/
    (loja)/           # área do cliente: catálogo, carrinho, checkout
    orcamento/[id]/   # recibo A4 (imprimir / PDF / WhatsApp / compartilhar)
    admin/            # login + painel (início, pedidos, produtos, categorias, config)
    api/              # rotas de API (produtos, categorias, pedidos, auth, config)
  components/         # UI (catálogo, cards, painel, etc.)
  lib/                # tipos, banco (db.ts), config, auth, formatação, carrinho
data/                 # "banco de dados" em JSON (produtos, categorias, pedidos, config)
scripts/seed.mjs      # importa produtos.txt -> JSON
```

## Funcionalidades (mapeamento com a especificação)

| Requisito | Onde |
|-----------|------|
| RF01/RF02 – Catálogo com filtro por categoria e busca | `/` |
| RF03–RF06 – Carrinho: adicionar, alterar qtd, remover, total | `/carrinho` |
| RF07 – Registrar pedido | `/checkout` → `POST /api/pedidos` |
| RF08/RF09 – Gerar e baixar orçamento (A4, imprimir/salvar PDF) | `/orcamento/[id]` |
| RF15 – Compartilhar pedido (WhatsApp / Web Share) | `/orcamento/[id]` |
| RF10 – Acesso administrativo | `/admin` |
| RF11 – Gerenciar produtos (criar/editar/excluir) | `/admin/produtos` |
| RF12 – Gerenciar categorias | `/admin/categorias` |
| RF13/RF14 – Gerenciar pedidos e alterar status | `/admin/pedidos` |

Cada produto possui **preço unitário** e **preço do pacote** (ex.: 6x); no catálogo é
possível adicionar tanto por unidade quanto por pacote. Nenhum campo de cliente é
obrigatório, conforme a especificação.

## Observação sobre hospedagem

O banco usa **arquivos JSON** no diretório `data/` (conforme a arquitetura do MVP).
Em plataformas *serverless* (ex.: **Vercel**) o sistema de arquivos é **efêmero** — as
escrituras (novos pedidos, edições) **não persistem** entre requisições/deploys.

Para persistência real em produção, use uma das opções:

1. Hospedar em um servidor com filesystem persistente (VPS, Render, Railway, etc.); ou
2. Trocar a camada de dados (isolada em [`src/lib/db.ts`](src/lib/db.ts)) por um banco
   gerenciado (Postgres, SQLite, Vercel KV/Blob, etc.).

Como toda a leitura/escrita passa por `src/lib/db.ts`, a migração fica restrita a esse arquivo.
