import { readFile } from "node:fs/promises";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import { schema, importQueries } from "./database-schema.mjs";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL ausente");
  const sql = neon(process.env.DATABASE_URL);
  const registros = [];
  for (const colecao of ["categorias", "produtos", "pedidos"]) {
    const dados = JSON.parse(await readFile(path.join(process.cwd(), "data", colecao + ".json"), "utf8"));
    if (!Array.isArray(dados)) throw new Error("Arquivo inválido");
    const ids = new Set();
    for (const item of dados) {
      if (!item || typeof item.id !== "string" || !item.id || ids.has(item.id)) throw new Error("ID inválido ou duplicado");
      if (colecao === "pedidos" && (!Number.isSafeInteger(item.numero) || item.numero < 1)) throw new Error("Número inválido");
      ids.add(item.id);
      registros.push({ colecao, id: item.id, dados: item });
    }
  }
  try {
    const dados = JSON.parse(await readFile("data/config.json", "utf8"));
    registros.push({ colecao: "config", id: "principal", dados });
  } catch (error) { if (error.code !== "ENOENT") throw error; }
  await sql.transaction([
    ...schema.map(query => sql.query(query)),
    ...importQueries(registros).map(([query, params]) => sql.query(query, params)),
  ]);
  console.log("Banco preparado. Importação concluída sem sobrescrever registros existentes.");
  for (const row of await sql.query("SELECT colecao, COUNT(*) AS total FROM oca_registros GROUP BY colecao ORDER BY colecao"))
    console.log(row.colecao + ": " + row.total);
}
main().catch(() => {
  console.error("Migração falhou. Verifique DATABASE_URL, conexão, permissões e os JSONs (IDs/números duplicados). Nenhuma importação parcial foi aplicada.");
  process.exitCode = 1;
});
