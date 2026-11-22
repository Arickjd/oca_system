# OCA Distribuidora — Sistema de Orçamentos

Aplicação web **mobile-first** para a equipe da OCA Distribuidora montar pedidos de
atacado pelo celular e gerar um **orçamento em formato A4 (recibo)**. O acesso exige
login; cada usuário tem um papel (**administrador** ou operador): o administrador edita/exclui vendas, vê custos e relatórios restritos e o registro de atividades; o operador usa o fluxo de pedidos.

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

## Login e configuração para deploy

- `/` é a tela de login, com Jardel, Jairo, Gisele, Keylane e Computador. Jardel tem uma senha própria. A senha inicial compartilhada dos operadores (Jairo, Gisele, Keylane e Computador) é `1012`. A conta **Computador** é um operador com avatar de monitor, pensada para lançamentos feitos na máquina.
- Após entrar, `/home` mostra o header padrão e os botões Montar pedido e Gerenciar produtos. A logo do header volta para essa home.
- Configure **AUTH_SECRET** no `.env.local` e nas variáveis de ambiente da Vercel (Production e Preview). Deve ter pelo menos 32 caracteres aleatórios. Gere com `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"`. Não publique essa chave no Git e mantenha o valor entre deploys para preservar as sessões.
- As sessões são assinadas com a biblioteca `jose` e armazenadas em cookie HttpOnly. Manter conectado dura até 30 dias; sem marcar, o cookie é de sessão e o token dura no máximo 12 horas. Sair remove a sessão apenas do navegador atual.
- Páginas, APIs e PDFs exigem sessão válida. PDFs baixados podem ser compartilhados como arquivos; links diretos do site exigem login.
- O login limita tentativas repetidas por endereço de acesso. Na Vercel, a contagem é atômica no PostgreSQL usando registros próprios na coleção `config`, sem alterar a configuração principal. No desenvolvimento sem banco, a contagem fica na memória do servidor.
- Cada usuário tem seu carrinho separado no dispositivo. O responsável é registrado pelo servidor na criação do orçamento e permanece nas edições e no PDF. Orçamentos anteriores sem responsável continuam sem atribuição retroativa.
- Não precisa executar migração: o responsável usa o JSONB já existente e os usuários são fixos.
- `npm run test:auth` verifica sessões, credenciais, expiração, limite e atribuição. `node scripts/test-auth-http.mjs http://localhost:3015` testa o acesso HTTP em uma prévia local com DATABASE_URL e VERCEL vazias, sem alterar produtos ou orçamentos.

## Estrutura

```
src/
  app/
    (loja)/           # catálogo, carrinho e edição do pedido
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
| RF07 – Registrar pedido (finaliza e gera o orçamento na mesma tela) | `/carrinho` → `POST /api/pedidos` |
| RF08/RF09 – Gerar e baixar orçamento (A4, imprimir/salvar PDF) | `/orcamento/[id]` |
| RF15 – Compartilhar pedido (WhatsApp / Web Share) | `/orcamento/[id]` |

Cada produto possui somente **preço de atacado por pacote**. Depois de adicioná-lo,
o dono da distribuidora pode ajustar no carrinho o nome, o valor, a quantidade de
pacotes e a quantidade de itens por pacote. Nenhum campo de cliente é obrigatório.
Nos documentos (PDF A4 e cupom de 80 mm), quando o item tem mais de uma unidade
por pacote, o nome do produto mostra `N itens/pacote` na linha de baixo.

A antiga categoria **Diversos** foi incorporada por **Outros**, e todo produto
cadastrado sem categoria é gravado em **Outros** — não existe mais "Sem categoria".
Em bases já publicadas, `npm run db:mesclar-categorias` aplica a mesma regra
(JSON local ou PostgreSQL, conforme `DATABASE_URL`).

Em **Gerenciar produtos**, o botão **Editar categorias** abre a lista com a
quantidade de produtos de cada categoria e permite criar ou excluir. Excluir uma
categoria move os produtos dela (inclusive os excluídos) para **Outros**, que é o
destino padrão e não pode ser excluída.

Cada produto pode ter um **ícone predefinido**, escolhido no cadastro/edição em
um campo “Ícone do produto” que abre (e fecha ao escolher) uma grade com a opção
**Padrão** e 21 imagens (`public/icons/produtos`: caixa, lata, garrafa, sacola,
pacote de sacolas, marmita unidade/atacado etc.). Produto sem ícone — inclusive todos os cadastrados antes deste
recurso — exibe `padrao.png` no catálogo, na busca e no carrinho. A API só aceita
vazio (padrão) ou um dos ícones da lista.

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

- Na consulta individual, **Imprimir cupom** imprime na própria página, sem abrir outra aba: o cupom é renderizado em um portal oculto, um card flutuante mostra “Preparando cupom…” enquanto fontes e imagens carregam, e a impressão usa 72 × 297 mm. A prévia de 80 mm continua disponível em `/orcamento/[id]/cupom`. A página de impressão usa exatamente 72 × 297 mm: o driver da Epson TM-T20X só oferece as formas 80 × 297 mm e 80 × 3276 mm, ambas com 71,9 mm de largura útil, e uma página fora dessas medidas faz o Chrome cair no formulário de 3276 mm (3,27 m de bobina). Na janela de impressão, confirme papel **80 × 297 mm**, **margens Nenhuma** e escala 100%, sem cabeçalho/rodapé. Para cortar a sobra em branco no fim, ative a redução de papel nas preferências do driver. Há dois botões: **Imprimir cupom** (página de 72 × 297 mm) e **Imprimir ajustado ao conteúdo** (página com a altura real do cupom, para drivers que aceitam tamanho personalizado). O cupom usa 12 px em negrito para sair mais escuro na térmica. Acima do TOTAL, o cupom mostra `Desconto: -R$ …` quando o pedido tem desconto. A página também oferece **Compartilhar cupom**, que gera um PDF de 72 mm com o nome `oca{número}.pdf` e o envia pelo compartilhamento do sistema (WhatsApp e afins); sem suporte ao compartilhamento de arquivos, o botão baixa o PDF e orienta a anexá-lo. O documento é não fiscal, inclui descontos e pagamento e não exibe custo ou lucro, tanto para orçamentos quanto para vendas. O download e compartilhamento do PDF A4 continuam disponíveis na consulta principal.

## Recebimento parcial

- No card de um orçamento em aberto, **Parcial** (ao lado de Pix, Cartão e Dinheiro) abre um formulário no próprio card: valor recebido agora, forma de pagamento e, opcionalmente, um lembrete para o restante — em 1 semana, em 1 mês ou em uma data escolhida.
- Ao confirmar, o orçamento recebe o status **parcial**, sai da aba **Em aberto** e passa para **Recebimento parcial** (`/orcamentos/recebimento-parcial`). A página soma o **total a receber** e, em cada card, destaca **Já pago**, **Falta receber** e o prazo do lembrete (atrasado, vence hoje ou vence em N dias).
- O restante é recebido pelas formas de pagamento do próprio card; a quitação efetiva a venda, limpa o lembrete e registra o restante como o último recebimento do histórico. É possível registrar mais de um parcial antes de quitar.
- A página individual do orçamento mostra o resumo do parcial, o histórico de recebimentos e o mesmo formulário; o cupom de 80 mm e o PDF A4 passam a exibir `Recebimento parcial`, `Já pago` e `Falta receber`.
- Nas páginas de orçamentos, o cabeçalho exibe as abas **Em aberto** e **Recebimento parcial** com a quantidade de cada uma, na mesma linha do usuário, mantendo o cabeçalho com duas linhas; no celular o prefixo “Usuário:” é omitido para as abas caberem.
- Na home, o cabeçalho mostra um sino com a quantidade de **Avisos de recebimento** abaixo da logo; ao abrir, o painel aparece como dropdown (não aumenta o cabeçalho) e lista os parciais com prazo, do mais urgente para o mais distante, destacando os atrasados e o valor restante.
- Só para o **administrador**, a home exibe o **Registro de atividades**: os lançamentos em ordem cronológica (mais recentes primeiro), com o título no formato `operação - cliente #número` (ou operação - produto/categoria), data e hora e usuário na linha de baixo; ao clicar, o item expande os detalhes (valores, forma de pagamento, antes/depois). São auditados criação, edição e exclusão de orçamento, venda efetivada, recebimento parcial, quitação, CRUD de produtos e de categorias. Operadores não veem a seção; os dados ficam em `data/auditoria.json` (ou na coleção `auditoria`, no Postgres).
- A edição de um orçamento parcial não pode reduzir o total para menos do que já foi recebido; o sistema bloqueia com uma mensagem.

- Ao final de `/relatorios`, Exportar banco de dados baixa um XLSX completo sem aplicar o filtro de datas. Abas: Resumo, Produtos, Categorias, Orçamentos, Itens, Configurações, Contadores e Registros brutos.
- A exportação inclui registros excluídos logicamente, custos e responsáveis. IDs preservam os vínculos entre abas. A leitura PostgreSQL usa uma única instrução para manter consistência entre registros e contadores; no modo local, aguarda as escritas pendentes.
- Os registros brutos preservam campos adicionais e JSON extenso em partes numeradas. Os contadores são texto para preservar precisão. As datas visíveis usam Brasília e o JSON preserva os timestamps originais. A exportação exige login e não inclui variáveis de ambiente ou credenciais externas ao banco. Não há restauração/importação automática por esse botão.
- `npm run test:exportacao` confere o arquivo gerado com dados fictícios. Nenhuma migração de banco é necessária.

- `/orcamentos` mostra somente pagamentos pendentes, com Hoje e seleção de outros dias com pendências e respectivas quantidades.
- `/vendas` mostra somente pagamentos finalizados, com Hoje, Últimos 7 dias e intervalo personalizado.
- `/relatorios` concentra indicadores, gráfico diário de quantidades e geração dos PDFs. Pendentes aparecem em âmbar; vendas finalizadas em verde. Os valores e o gráfico usam o mesmo filtro dos PDFs. O mesmo filtro de período vale para Vendas por usuário e para o detalhamento em `/relatorios/vendas-por-usuario`, sem seleção de período separada.
- Os filtros continuam usando a data de criação do orçamento no horário de Brasília, inclusive em Vendas. Últimos 7 dias inclui hoje e os seis dias anteriores.
- O gráfico inclui dias sem movimento em intervalos de até 92 dias; períodos maiores mostram os dias com registros. Cada orçamento é contado uma vez, conforme a situação atual do pagamento.
- O intervalo personalizado inclui as duas datas, considerando a criação do orçamento no fuso America/Sao_Paulo.
- Os cartões de resumo e PDFs usam o mesmo período. Os relatórios incluem todos os orçamentos não excluídos, separando pendentes e finalizados; não são um extrato por data de recebimento.
- PDF resumido: uma linha por orçamento. PDF detalhado: todos os itens registrados em cada orçamento, inclusive produtos removidos do catálogo depois da venda.
- Em `/relatorios`, o administrador baixa o **PDF do catálogo de produtos**: todos os produtos cadastrados, com preço de compra, preço de venda e margem, agrupados por categoria e em ordem alfabética. É um documento interno (contém custo), não usa o filtro de período e a rota responde 403 para operadores.
- Editar e Efetivar aparecem somente para pendentes. A edição preserva número, data e custos históricos dos itens existentes; novos itens usam o custo atual do catálogo. Não modifica o catálogo nem o carrinho.
- Na tela do orçamento, o card de pagamento pendente mostra o valor e as formas Pix, Cartão e Dinheiro. Tocar em uma delas abre uma confirmação (“Registrar R$ … em Pix?”) com **Cancelar** e **Confirmar**; só o Confirmar efetiva a venda. A lista `/orcamentos` oferece as mesmas três formas em cada card pendente e usa a mesma confirmação, sem abrir o orçamento. Confirmações sobre versões antigas continuam recusadas com aviso para recarregar a página.
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
