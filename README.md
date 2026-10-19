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
- **PostgreSQL (Neon)** para Vercel, com JSON local como alternativa no desenvolvimento.

## Como rodar

```bash
npm install
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
data/                 # dados locais e fonte da importação inicial para PostgreSQL
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

Siga [DEPLOY.md](DEPLOY.md) para conectar Neon à Vercel, configurar
`DATABASE_URL` e executar `npm run db:migrate` uma vez antes de publicar.
Produtos e orçamentos ficam no PostgreSQL e sobrevivem a novos deploys.
A migração preserva os dados existentes e não roda durante o build.

Localmente, sem DATABASE_URL, a aplicação usa os JSONs de data/.
Na Vercel, DATABASE_URL é obrigatória. Nunca há fallback para arquivos temporários.
Não execute o seed para iniciar o projeto: ele substitui o catálogo JSON local.
