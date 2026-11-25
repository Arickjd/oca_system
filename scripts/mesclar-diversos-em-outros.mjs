// Mescla a categoria "Diversos" em "Outros" e move os produtos sem categoria para "Outros".
// Funciona nos dois modos: JSON local (sem DATABASE_URL) ou PostgreSQL (com DATABASE_URL).
// Uso: npm run db:mesclar-categorias
import { readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const OUTROS = "Outros";
const DIVERSOS = "Diversos";
const mesmoNome = (a, b) => String(a ?? "").trim().localeCompare(b, "pt-BR", { sensitivity: "base" }) === 0;

async function gravar(caminho, dados) {
  const tmp = caminho + ".tmp";
  await writeFile(tmp, JSON.stringify(dados, null, 2), "utf8");
  await rename(tmp, caminho);
}

async function local() {
  const dir = path.join(process.cwd(), "data");
  const arquivoCategorias = path.join(dir, "categorias.json");
  const arquivoProdutos = path.join(dir, "produtos.json");
  const categorias = JSON.parse(await readFile(arquivoCategorias, "utf8"));
  const produtos = JSON.parse(await readFile(arquivoProdutos, "utf8"));

  let outros = categorias.find(c => mesmoNome(c.nome, OUTROS));
  const diversos = categorias.find(c => mesmoNome(c.nome, DIVERSOS));
  if (!outros) {
    outros = { id: randomUUID(), nome: OUTROS, ativo: true, created_at: new Date().toISOString() };
    categorias.push(outros);
  }
  let movidos = 0;
  for (const produto of produtos) {
    const semCategoria = !produto.categoria_id;
    const eraDiversos = diversos && produto.categoria_id === diversos.id;
    if (semCategoria || eraDiversos) {
      produto.categoria_id = outros.id;
      movidos++;
    }
  }
  await gravar(arquivoProdutos, produtos);
  await gravar(arquivoCategorias, diversos ? categorias.filter(c => c.id !== diversos.id) : categorias);
  return { movidos, removida: Boolean(diversos), outros: outros.id };
}

async function postgres() {
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(process.env.DATABASE_URL);
  const categorias = (await sql.query("SELECT id, dados FROM oca_registros WHERE colecao = 'categorias'"))
    .map(row => ({ id: row.id, nome: row.dados?.nome }));
  let outros = categorias.find(c => mesmoNome(c.nome, OUTROS));
  const diversos = categorias.find(c => mesmoNome(c.nome, DIVERSOS));
  if (!outros) {
    outros = { id: randomUUID(), nome: OUTROS };
    const dados = { id: outros.id, nome: OUTROS, ativo: true, created_at: new Date().toISOString() };
    await sql.query("INSERT INTO oca_registros (colecao, id, dados) VALUES ('categorias', $1, $2::jsonb)",
      [outros.id, JSON.stringify(dados)]);
  }
  const movimento = await sql.query(`
    UPDATE oca_registros SET dados = jsonb_set(dados, '{categoria_id}', to_jsonb($1::text))
    WHERE colecao = 'produtos' AND COALESCE(dados->>'categoria_id', '') IN ('', $2::text)
    RETURNING id
  `, [outros.id, diversos?.id ?? ""]);
  if (diversos) await sql.query("DELETE FROM oca_registros WHERE colecao = 'categorias' AND id = $1", [diversos.id]);
  return { movidos: movimento.length, removida: Boolean(diversos), outros: outros.id };
}

const usarPostgres = Boolean(process.env.DATABASE_URL);
const resultado = usarPostgres ? await postgres() : await local();
console.log(`${usarPostgres ? "PostgreSQL" : "JSON local"}: ${resultado.movidos} produto(s) para "Outros" (${resultado.outros})` +
  `${resultado.removida ? '; categoria "Diversos" removida.' : '; "Diversos" não existia.'}`);
