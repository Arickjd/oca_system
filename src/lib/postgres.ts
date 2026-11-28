import { neon } from "@neondatabase/serverless";
import type { Pedido } from "./types";
import type { SnapshotBanco } from "./snapshotBanco";
import type { MovimentoEstoque } from "./estoque";

export function usarPostgres() {
  if (process.env.DATABASE_URL) return true;
  if (process.env.VERCEL) {
    throw new Error("Configure DATABASE_URL na Vercel e execute npm run db:migrate antes de usar o sistema.");
  }
  return false;
}

function sql() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não configurada.");
  return neon(process.env.DATABASE_URL);
}

// A coleção config já existe; as tentativas usam IDs próprios, sem afetar a configuração principal.
export async function registrarTentativaLogin(chave: string, agora: number, janela: number, limite: number) {
  const rows = await sql().query(`
    INSERT INTO oca_registros (colecao, id, dados)
    VALUES ('config', $1, jsonb_build_object('quantidade', 1, 'ate', $2::bigint + $3::bigint))
    ON CONFLICT (colecao, id) DO UPDATE SET dados = CASE
      WHEN (oca_registros.dados->>'ate')::bigint <= $2::bigint
        THEN jsonb_build_object('quantidade', 1, 'ate', $2::bigint + $3::bigint)
      ELSE jsonb_build_object('quantidade', (oca_registros.dados->>'quantidade')::integer + 1, 'ate', (oca_registros.dados->>'ate')::bigint)
    END RETURNING dados
  `, [chave, agora, janela]);
  const dados = rows[0].dados as { quantidade: number; ate: number };
  return { permitido: dados.quantidade <= limite, espera: Math.max(1, Math.ceil((dados.ate - agora) / 1000)), chave };
}

export async function limparTentativasLogin(chave: string) {
  await sql().query("DELETE FROM oca_registros WHERE colecao = 'config' AND id = $1 AND id LIKE 'auth-tentativas:%'", [chave]);
}

export async function listar<T>(colecao: string): Promise<T[]> {
  const rows = await sql().query("SELECT dados FROM oca_registros WHERE colecao = $1", [colecao]);
  return rows.map(row => row.dados as T);
}

/* ------------------------------- Estoque ------------------------------- */

// Ledger filtrado/paginado no SQL: o histórico cresce sem limite e nunca é
// carregado inteiro para a memória da função (padrão listar() não serve aqui).
export async function listarMovimentosEstoque(filtro: { produtoId?: string; limite?: number; antes?: string }): Promise<MovimentoEstoque[]> {
  const limite = Math.min(200, Math.max(1, Math.trunc(filtro.limite ?? 50)));
  const rows = await sql().query(`
    SELECT dados FROM oca_registros
    WHERE colecao = 'estoque_movimentos'
      AND ($1::text IS NULL OR dados->>'produto_id' = $1)
      AND ($2::text IS NULL OR dados->>'em' < $2)
    ORDER BY dados->>'em' DESC, id DESC
    LIMIT $3
  `, [filtro.produtoId ?? null, filtro.antes ?? null, limite]);
  return rows.map(row => row.dados as MovimentoEstoque);
}

// Saldos atuais lidos numa única instrução (sem dados de catálogo extensos).
export async function saldosEstoque(): Promise<Map<string, number>> {
  const rows = await sql().query(`
    SELECT id, (dados->>'estoque_atual')::numeric AS saldo FROM oca_registros
    WHERE colecao = 'produtos' AND dados->>'estoque_atual' IS NOT NULL AND dados->>'excluido_em' IS NULL
  `, []);
  return new Map(rows.map(row => [row.id as string, Number(row.saldo)]));
}

// Baixa/estorno em lote: uma instrução trava os produtos envolvidos (FOR UPDATE),
// confere os saldos esperados e grava saldos + movimentos atomicamente. Se outra
// instância mexeu no saldo entre a leitura e a escrita, nada é gravado (retry no chamador).
export async function aplicarMovimentosEstoque(
  movimentos: MovimentoEstoque[],
  esperados: Map<string, number>,
): Promise<boolean> {
  if (!movimentos.length) return true;
  const ids = [...esperados.keys()];
  const esperadoJson = Object.fromEntries(esperados);
  const novoJson = Object.fromEntries(ids.map(id => {
    const ultimo = [...movimentos].reverse().find(m => m.produto_id === id)!;
    return [id, ultimo.saldo_apos];
  }));
  const rows = await sql().query(`
    WITH alvo AS (
      SELECT id, dados FROM oca_registros
      WHERE colecao = 'produtos' AND id = ANY($1::text[]) AND dados->>'excluido_em' IS NULL
      FOR UPDATE
    ), conferencia AS (
      SELECT COUNT(*) AS faltando FROM jsonb_each_text($2::jsonb) esperado(id, valor)
      WHERE NOT EXISTS (SELECT 1 FROM alvo WHERE alvo.id = esperado.id AND (alvo.dados->>'estoque_atual')::numeric = esperado.valor::numeric)
    ), atualizados AS (
      UPDATE oca_registros p SET dados = jsonb_set(p.dados, '{estoque_atual}', to_jsonb((($3::jsonb)->>p.id)::numeric))
      FROM alvo WHERE p.colecao = 'produtos' AND p.id = alvo.id AND (SELECT faltando FROM conferencia) = 0
      RETURNING p.id
    ), inseridos AS (
      INSERT INTO oca_registros (colecao, id, dados)
      SELECT 'estoque_movimentos', m->>'id', m FROM jsonb_array_elements($4::jsonb) m
      WHERE (SELECT faltando FROM conferencia) = 0
      RETURNING id
    )
    SELECT (SELECT COUNT(*) FROM atualizados)::integer AS produtos, (SELECT COUNT(*) FROM inseridos)::integer AS movimentos
  `, [ids, JSON.stringify(esperadoJson), JSON.stringify(novoJson), JSON.stringify(movimentos)]);
  return rows[0].produtos === ids.length && rows[0].movimentos === movimentos.length;
}

// Movimento manual (entrada/ajuste/perda) de um único produto, atômico.
export async function aplicarMovimentoManual(movimento: MovimentoEstoque, esperado: number | null): Promise<boolean> {
  const rows = await sql().query(`
    WITH alvo AS (
      SELECT id, dados FROM oca_registros
      WHERE colecao = 'produtos' AND id = $1 AND dados->>'excluido_em' IS NULL
        AND (($2::numeric IS NULL AND dados->>'estoque_atual' IS NULL)
          OR (dados->>'estoque_atual')::numeric = $2::numeric)
      FOR UPDATE
    ), atualizado AS (
      UPDATE oca_registros p SET dados = jsonb_set(p.dados, '{estoque_atual}', to_jsonb($3::numeric))
      FROM alvo WHERE p.colecao = 'produtos' AND p.id = alvo.id RETURNING p.id
    ), inserido AS (
      INSERT INTO oca_registros (colecao, id, dados)
      SELECT 'estoque_movimentos', $4, $5::jsonb WHERE EXISTS (SELECT 1 FROM atualizado)
      RETURNING id
    )
    SELECT EXISTS (SELECT 1 FROM inserido) AS ok
  `, [movimento.produto_id, esperado, movimento.saldo_apos, movimento.id, JSON.stringify(movimento)]);
  return rows[0].ok === true;
}

// Soma do ledger por produto, para reconciliação saldo × histórico.
export async function somaLedgerEstoque(): Promise<Map<string, number>> {
  const rows = await sql().query(`
    SELECT dados->>'produto_id' AS produto_id, SUM((dados->>'quantidade')::numeric) AS soma
    FROM oca_registros WHERE colecao = 'estoque_movimentos' GROUP BY 1
  `, []);
  return new Map(rows.map(row => [row.produto_id as string, Number(row.soma)]));
}


export async function lerBancoCompleto(): Promise<SnapshotBanco> {
  // Uma única instrução lê as duas tabelas na mesma visão consistente do banco.
  const rows = await sql().query(`SELECT jsonb_build_object(
    'registros', (SELECT COALESCE(jsonb_agg(jsonb_build_object('colecao', colecao, 'id', id, 'dados', dados) ORDER BY colecao, id), '[]'::jsonb) FROM oca_registros),
    'contadores', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'valor', valor::text) ORDER BY id), '[]'::jsonb) FROM oca_contadores),
    'gerado_em', CURRENT_TIMESTAMP, 'origem', 'postgres'
  ) AS snapshot`, []);
  return rows[0].snapshot as SnapshotBanco;
}

export async function buscar<T>(colecao: string, id: string): Promise<T | undefined> {
  const rows = await sql().query("SELECT dados FROM oca_registros WHERE colecao = $1 AND id = $2", [colecao, id]);
  return rows[0]?.dados as T | undefined;
}

export async function inserir<T extends { id: string }>(colecao: string, dados: T): Promise<T> {
  const rows = await sql().query("INSERT INTO oca_registros (colecao, id, dados) VALUES ($1, $2, $3::jsonb) RETURNING dados",
    [colecao, dados.id, JSON.stringify(dados)]);
  return rows[0].dados as T;
}

export async function atualizar<T>(colecao: string, id: string, patch: object): Promise<T | undefined> {
  const rows = await sql().query("UPDATE oca_registros SET dados = dados || $3::jsonb WHERE colecao = $1 AND id = $2 AND dados->>'excluido_em' IS NULL RETURNING dados",
    [colecao, id, JSON.stringify(patch)]);
  return rows[0]?.dados as T | undefined;
}

export async function excluirProduto(id: string): Promise<boolean> {
  const produto = await atualizar<ProdutoExcluido>("produtos", id, { ativo: false, excluido_em: new Date().toISOString() });
  return !!produto;
}

export async function finalizarPagamento(id: string, patch: object, revisao?: number): Promise<Pedido | undefined> {
  const rows = await sql().query(`
    UPDATE oca_registros SET dados = dados || $2::jsonb || jsonb_build_object('revisao', COALESCE((dados->>'revisao')::integer, 0) + 1)
    WHERE colecao = 'pedidos' AND id = $1
      AND dados->>'excluido_em' IS NULL
      AND dados->>'status_pagamento' IS DISTINCT FROM 'finalizado'
      AND ($3::integer IS NULL OR COALESCE((dados->>'revisao')::integer, 0) = $3)
    RETURNING dados
  `, [id, JSON.stringify(patch), revisao ?? null]);
  return rows[0]?.dados as Pedido | undefined;
}

type ProdutoExcluido = { id: string; excluido_em: string };

// Move todos os produtos de uma categoria para outra (usado ao excluir a categoria).
export async function moverProdutosParaCategoria(de: string, para: string) {
  await sql().query(
    "UPDATE oca_registros SET dados = jsonb_set(dados, '{categoria_id}', to_jsonb($2::text)) WHERE colecao = 'produtos' AND dados->>'categoria_id' = $1",
    [de, para]);
}

export async function remover(colecao: string, id: string) {
  await sql().query("DELETE FROM oca_registros WHERE colecao = $1 AND id = $2", [colecao, id]);
}

export async function editarPedido(id: string, patch: object, revisao: number, permitirVenda = false): Promise<Pedido | undefined> {
  const rows = await sql().query(`
    UPDATE oca_registros SET dados = dados || $2::jsonb
    WHERE colecao = 'pedidos' AND id = $1 AND dados->>'excluido_em' IS NULL
      AND ($4::boolean OR dados->>'status_pagamento' IS DISTINCT FROM 'finalizado')
      AND COALESCE((dados->>'revisao')::integer, 0) = $3
    RETURNING dados
  `, [id, JSON.stringify(patch), revisao, permitirVenda]);
  return rows[0]?.dados as Pedido | undefined;
}

// Exclusão lógica sem alterar o contador de orçamentos.
export async function excluirPedido(id: string, permitirVenda = false): Promise<boolean> {
  const rows = await sql().query(`
    UPDATE oca_registros SET dados = dados || jsonb_build_object('excluido_em', $2::text)
    WHERE colecao = 'pedidos' AND id = $1 AND dados->>'excluido_em' IS NULL
      AND ($3::boolean OR dados->>'status_pagamento' IS DISTINCT FROM 'finalizado')
    RETURNING id
  `, [id, new Date().toISOString(), permitirVenda]);
  return rows.length > 0;
}

// O contador e o orçamento são gravados atomicamente, mesmo entre várias funções Vercel.
export async function inserirPedido(dados: Pedido): Promise<Pedido> {
  const rows = await sql().query(`
    WITH proximo AS (
      INSERT INTO oca_contadores (id, valor) VALUES ('pedidos', 1)
      ON CONFLICT (id) DO UPDATE SET valor = oca_contadores.valor + 1
      RETURNING valor
    )
    INSERT INTO oca_registros (colecao, id, dados)
    SELECT 'pedidos', $1, $2::jsonb || jsonb_build_object('numero', valor) FROM proximo
    RETURNING dados
  `, [dados.id, JSON.stringify(dados)]);
  return rows[0].dados as Pedido;
}
