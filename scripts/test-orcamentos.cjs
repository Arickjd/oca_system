const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
function load(file) {
  const filename = path.resolve(file);
  const mod = new Module(filename, module); mod.filename = filename; mod.paths = module.paths;
  mod.require = name => name.startsWith(".") ? load(path.resolve(path.dirname(filename), name + ".ts")) : require(name);
  mod._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, filename);
  return mod.exports;
}
const { resolverPeriodo, diaLocal, filtrarPeriodo, resumoPeriodo } = load("src/lib/periodoOrcamentos.ts");
const agora = new Date("2026-10-23T02:59:59Z");
assert.equal(diaLocal(agora), "2026-10-22");
assert.equal(diaLocal("2026-10-23T03:00:00Z"), "2026-10-23");
assert.deepEqual(resolverPeriodo({}, agora), { tipo: "hoje", inicio: "2026-10-22", fim: "2026-10-22" });
assert.equal(resolverPeriodo({ periodo: "semana" }, new Date("2026-01-03T12:00Z")).inicio, "2025-12-28");
for (const params of [{ periodo: "x" }, { periodo: "personalizado", inicio: "2026-02-30", fim: "2026-03-01" }, { periodo: "personalizado", inicio: "2026-10-23", fim: "2026-10-22" }]) assert.throws(() => resolverPeriodo(params));
const periodo = resolverPeriodo({ periodo: "personalizado", inicio: "2026-10-22", fim: "2026-10-22" });
const candidatos = ["2026-10-22T02:59:59Z", "2026-10-22T03:00:00Z", "2026-10-23T02:59:59Z", "2026-10-23T03:00:00Z"].map((created_at, i) => ({ id: String(i), numero: i, created_at, valor_total: 10.1, status_pagamento: i === 1 ? "finalizado" : "pendente" }));
const filtrados = filtrarPeriodo([...candidatos, { ...candidatos[1], excluido_em: "hoje" }], periodo);
assert.deepEqual(filtrados.map(p => p.id), ["2", "1"]);
assert.deepEqual(resumoPeriodo(filtrados), { total: 20.2, recebido: 10.1, pendente: 10.1, pagos: 1, pendentes: 1 });
assert.equal(filtrarPeriodo([], periodo).length, 0);
const { gerarRelatorioOrcamentos } = load("src/lib/relatorioOrcamentosPdf.ts");
const pedidos = Array.from({ length: 8 }, (_, i) => ({ id: String(i), numero: 101 + i,
  cliente_nome: i === 0 ? "João da Conceição - Comércio de embalagens e descartáveis" : `Cliente ${i + 1}`,
  telefone: "", observacao: "", created_at: "2026-10-22T15:30:00Z", status: "novo",
  status_pagamento: i % 2 ? "finalizado" : "pendente", forma_pagamento: i % 2 ? ["pix", "cartao", "dinheiro"][i % 3] : undefined,
  itens: Array.from({ length: i === 0 ? 22 : 4 }, (_, j) => ({ id: `${i}-${j}`, produto_id: String(j), produto_nome: `Produto ${j + 1} - Copo descartável resistente com descrição para teste de quebra de linha`, modo: "pacote", pack_quantidade: 100, quantidade: 2, preco_unitario: 10.1, subtotal: 20.2 })),
  valor_total: (i === 0 ? 22 : 4) * 20.2,
}));
fs.mkdirSync("tmp/pdfs", { recursive: true });
for (const tipo of ["resumido", "detalhado"]) {
  const pdf = gerarRelatorioOrcamentos(pedidos, periodo, tipo, "OCA Distribuidora");
  assert.equal(Buffer.from(pdf).subarray(0, 5).toString(), "%PDF-");
  fs.writeFileSync(`tmp/pdfs/relatorio-${tipo}-teste.pdf`, pdf);
}
console.log("OK: fuso, limites inclusivos, datas inválidas, semana, resumo e relatórios PDF.");
