// Seed do banco de dados (arquivos JSON) a partir de produtos.txt
// Uso: npm run seed
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data");
const TXT = path.join(ROOT, "produtos.txt");

function parseMoney(str) {
  // "1.234,56" -> 1234.56 ; "5,00" -> 5
  const clean = String(str).trim().replace(/\./g, "").replace(",", ".");
  const n = Number(clean);
  return Number.isFinite(n) ? n : 0;
}

async function main() {
  const raw = await readFile(TXT, "utf8");
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  lines.shift(); // remove cabeçalho

  const categoriasMap = new Map(); // nome -> objeto categoria
  const produtos = [];
  const now = new Date().toISOString();

  for (const line of lines) {
    const parts = line.split(";");
    if (parts.length < 4) continue;
    const [codigo, nome, precoAtacado, categoriaNome] = parts.map((p) => p.trim());

    const catNome = categoriaNome || "Sem categoria";
    if (!categoriasMap.has(catNome)) {
      categoriasMap.set(catNome, {
        id: randomUUID(),
        nome: catNome,
        ativo: true,
        created_at: now,
      });
    }
    const categoria = categoriasMap.get(catNome);

    produtos.push({
      id: randomUUID(),
      codigo,
      nome,
      descricao: "",
      preco_pack: parseMoney(precoAtacado),
      pack_quantidade: 6,
      unidade: "un",
      imagem_url: "",
      categoria_id: categoria.id,
      ativo: true,
      created_at: now,
    });
  }

  const categorias = [...categoriasMap.values()].sort((a, b) =>
    a.nome.localeCompare(b.nome, "pt-BR")
  );
  produtos.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(
    path.join(DATA_DIR, "categorias.json"),
    JSON.stringify(categorias, null, 2),
    "utf8"
  );
  await writeFile(
    path.join(DATA_DIR, "produtos.json"),
    JSON.stringify(produtos, null, 2),
    "utf8"
  );
  // Não sobrescreve pedidos existentes
  console.log(
    `Seed concluído: ${categorias.length} categorias, ${produtos.length} produtos.`
  );
}

main().catch((err) => {
  console.error("Falha no seed:", err);
  process.exit(1);
});
