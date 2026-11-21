# Deploy na Vercel com dados persistentes

O sistema usa PostgreSQL do Neon quando DATABASE_URL está configurada. Produtos,
categorias, configurações e orçamentos ficam fora do deploy, no banco.
Na Vercel, a variável é obrigatória: não há fallback para JSON ou /tmp.
Sem a variável, o modo local continua usando data/*.json.

## Configuração inicial

1. No projeto Vercel, abra Storage/Marketplace e conecte um banco **Neon Postgres**.
   Guarde a conexão PostgreSQL fornecida pelo Neon.
2. Em Settings → Environment Variables, confirme que **DATABASE_URL** existe no
   ambiente Production. Se a integração usar outro nome, crie DATABASE_URL com a
   conexão fornecida. Não use prefixo NEXT_PUBLIC_.
3. Na sua máquina, use Node.js 22 ou superior e execute npm install. Copie
   .env.example para .env.local e preencha DATABASE_URL com a conexão do banco.
   Não envie esse arquivo nem a senha para Git.
4. Confira os arquivos data/produtos.json, data/categorias.json e data/pedidos.json:
   eles devem conter os dados que deseja preservar. Faça uma cópia de segurança.
   Execute **npm run db:migrate** na raiz do projeto.
5. A migração cria as tabelas e importa os JSONs em uma transação. Preserva IDs,
   números e snapshots dos orçamentos. Registros com o mesmo ID são ignorados,
   nunca sobrescritos. Números conflitantes com IDs diferentes fazem a importação
   falhar integralmente, para que você confira os dados antes de tentar novamente.
6. Faça deploy/redeploy na Vercel com preset Next.js e build **npm run build**.
   Não inclua seed nem db:migrate no comando de build.

## Verificação após publicar

Se ocorrer o erro PostgreSQL 42P01 (tabela inexistente), execute a migração
usando a conexão do mesmo banco/branch configurado no ambiente Vercel.
Não basta criar o banco no Neon: npm run db:migrate cria as tabelas e importa os dados.

Bancos criados antes do **log de auditoria** têm um CHECK em `oca_registros` que
aceita apenas `produtos`, `categorias`, `pedidos` e `config`; a gravação da
coleção `auditoria` falha nesse CHECK e a seção da home fica vazia. Rode
`npm run db:migrate` (ou, no SQL editor do Neon, recrie a constraint) para liberar
a coleção — a migração só altera a constraint e não apaga registros:

```sql
ALTER TABLE oca_registros DROP CONSTRAINT IF EXISTS oca_registros_colecao_check;
ALTER TABLE oca_registros ADD CONSTRAINT oca_registros_colecao_check
  CHECK (colecao IN ('produtos', 'categorias', 'pedidos', 'config', 'auditoria'));
```

O layout da loja é dinâmico, inclusive carrinho, para não acessar
o banco durante o build. Isso permite compilar sem conexão, mas o banco precisa
estar migrado para abrir as páginas depois da publicação.

- Abra o catálogo e o histórico; confira as contagens importadas.
- Cadastre um produto, edite seu preço e gere um orçamento.
- Faça outro deploy e confirme que os registros continuam disponíveis.
- Use um banco/branch separado para Preview e desenvolvimento se não quiser
  misturar testes com dados de produção. Configure a conexão de cada ambiente.

## Próximos deploys

Mantenha o mesmo banco e DATABASE_URL. Deploys não recriam nem limpam tabelas.
O script seed é somente para o catálogo JSON local; ele não atualiza o PostgreSQL.
Alterações feitas no site não são copiadas de volta para os JSONs do repositório.
Use os recursos de backup/exportação do provedor para proteger os dados do banco.

Se edições ou pedidos de um deploy antigo nunca foram gravados com sucesso,
não há como recuperá-los do código; a importação preserva os JSONs disponíveis.

O aplicativo exige login (sessão JWT) e o registro de atividades é visível apenas
para o usuário com papel de administrador. Para uso exclusivo do proprietário em
um endereço público, restrinja o acesso ao deployment na plataforma.

## Testes

- npm run test:postgres: executa o SQL real em PostgreSQL embarcado em memória,
  sem credenciais nem alterações no banco remoto.
- node scripts/test-persistence.cjs: verifica o modo local em pasta temporária.
- npm run build: verifica a compilação. Não conecta nem inicializa o banco remoto.

Os testes locais não substituem a verificação da conexão Neon/Vercel após configurar
DATABASE_URL e executar a migração.

## Instalação no celular

Após publicar na Vercel (HTTPS), abra o site e use a opção de instalação do navegador.
No Android/Chrome, também é possível usar o menu ⋮ → Instalar aplicativo / Adicionar à tela inicial.
No iPhone/Safari, use Compartilhar → Adicionar à Tela de Início.

O app abre em modo standalone, com o nome Sistema OCA e ícones derivados de ICON_APP.png.
Inclua public/icons/ no commit. O manifesto é servido em /manifest.webmanifest.
Não há migração de banco, novas variáveis de ambiente nem instalação pela loja de aplicativos.
O sistema continua dependendo de internet; não há cache offline de produtos ou orçamentos.
Para testar a instalação no celular, use o endereço HTTPS do Preview/deploy; HTTP na rede local não equivale a HTTPS.

Referência: https://nextjs.org/docs/app/guides/progressive-web-apps
