import { neon } from "@neondatabase/serverless";
import type { Pedido } from "./types";

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

export async function listar<T>(colecao: string): Promise<T[]> {
  const rows = await sql().query("SELECT dados FROM oca_registros WHERE colecao = $1", [colecao]);
  return rows.map(row => row.dados as T);
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

type ProdutoExcluido = { id: string; excluido_em: string };

// Exclusão lógica sem alterar o contador de orçamentos.
export async function excluirPedido(id: string): Promise<boolean> {
  const rows = await sql().query(`
    UPDATE oca_registros SET dados = dados || jsonb_build_object('excluido_em', $2::text)
    WHERE colecao = 'pedidos' AND id = $1 AND dados->>'excluido_em' IS NULL
    RETURNING id
  `, [id, new Date().toISOString()]);
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
