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

O preço negociado no carrinho vale somente para aquela venda: não altera o preço
global do produto. Nome e itens por pacote continuam atualizando o catálogo.
Cada item do orçamento guarda o preço original e o desconto por pacote/unidade;
o total e o lucro usam o preço final negociado. O recibo, PDF e relatório detalhado
mostram o valor original e o valor final, identificando os itens com desconto.
Edições posteriores preservam o preço original registrado, mesmo que o catálogo
mude. Orçamentos antigos sem essa referência usam seu preço registrado como base,
sem inventar descontos retroativos. Os campos são salvos no JSONB existente e não
exigem migração do banco.

## Histórico, relatórios e edição de orçamentos

- `/orcamentos` mostra somente pagamentos pendentes, com Hoje e seleção de outros dias com pendências e respectivas quantidades.
- `/vendas` mostra somente pagamentos finalizados, com Hoje, Últimos 7 dias e intervalo personalizado.
- `/relatorios` concentra indicadores, gráfico diário de quantidades e geração dos PDFs. Pendentes aparecem em âmbar; vendas finalizadas em verde. Os valores e o gráfico usam o mesmo filtro dos PDFs.
- Os filtros continuam usando a data de criação do orçamento no horário de Brasília, inclusive em Vendas. Últimos 7 dias inclui hoje e os seis dias anteriores.
- O gráfico inclui dias sem movimento em intervalos de até 92 dias; períodos maiores mostram os dias com registros. Cada orçamento é contado uma vez, conforme a situação atual do pagamento.
- O intervalo personalizado inclui as duas datas, considerando a criação do orçamento no fuso America/Sao_Paulo.
- Os cartões de resumo e PDFs usam o mesmo período. Os relatórios incluem todos os orçamentos não excluídos, separando pendentes e finalizados; não são um extrato por data de recebimento.
- PDF resumido: uma linha por orçamento. PDF detalhado: todos os itens registrados em cada orçamento, inclusive produtos removidos do catálogo depois da venda.
- Editar e Efetivar aparecem somente para pendentes. A edição preserva número, data e custos históricos dos itens existentes; novos itens usam o custo atual do catálogo. Não modifica o catálogo nem o carrinho.
- Edições concorrentes e confirmações de pagamento sobre versões antigas são recusadas. Recarregue a página para conferir os dados atuais.
- Não é necessária migração para estes recursos: os novos campos de revisão ficam nos registros JSONB existentes.
- `npm run test:orcamentos` valida períodos e gera PDFs de teste em `tmp/pdfs/`. Os testes de persistência também verificam edição e pagamento concorrentes.
- `npm run test:historico` verifica a separação das páginas, datas com pendências e a contagem diária, incluindo a passagem de pendente para venda.

## Observação sobre hospedagem

Siga [DEPLOY.md](DEPLOY.md) para conectar Neon à Vercel, configurar
`DATABASE_URL` e executar `npm run db:migrate` uma vez antes de publicar.
Produtos e orçamentos ficam no PostgreSQL e sobrevivem a novos deploys.
A migração preserva os dados existentes e não roda durante o build.

Localmente, sem DATABASE_URL, a aplicação usa os JSONs de data/.
Na Vercel, DATABASE_URL é obrigatória. Nunca há fallback para arquivos temporários.
Não execute o seed para iniciar o projeto: ele substitui o catálogo JSON local.
