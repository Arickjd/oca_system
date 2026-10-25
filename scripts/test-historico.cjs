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

const { separarHistorico, diasPendentes, movimentoDiario } = load("src/lib/historicoOrcamentos.ts");
const { filtrarPeriodo, resumoPeriodo } = load("src/lib/periodoOrcamentos.ts");
const registro = (id, created_at, status_pagamento) => ({ id, numero: Number(id), created_at, status_pagamento, valor_total: 10 });
const pedidos = [
  registro("1", "2026-10-24T02:59:59Z"), // Legado pendente, dia 23 no Brasil.
  registro("2", "2026-10-24T03:00:00Z", "pendente"),
  registro("3", "2026-10-24T14:00:00Z", "finalizado"),
  registro("4", "2026-10-25T14:00:00Z", "pendente"),
  { ...registro("5", "2026-10-24T15:00:00Z", "pendente"), excluido_em: "2026-10-25" },
];
assert.deepEqual(separarHistorico(pedidos).pendentes.map(p => p.id), ["1", "2", "4"]);
assert.deepEqual(separarHistorico(pedidos).vendas.map(p => p.id), ["3"]);
assert.deepEqual(diasPendentes(pedidos), [{ dia: "2026-10-25", quantidade: 1 }, { dia: "2026-10-24", quantidade: 1 }, { dia: "2026-10-23", quantidade: 1 }]);
const periodo = { tipo: "personalizado", inicio: "2026-10-23", fim: "2026-10-26" };
const grafico = movimentoDiario(pedidos, periodo);
assert.deepEqual(grafico.dias, [
  { dia: "2026-10-23", pendentes: 1, vendas: 0 },
  { dia: "2026-10-24", pendentes: 1, vendas: 1 },
  { dia: "2026-10-25", pendentes: 1, vendas: 0 },
  { dia: "2026-10-26", pendentes: 0, vendas: 0 },
]);
const resumo = resumoPeriodo(filtrarPeriodo(pedidos, periodo));
assert.equal(grafico.dias.reduce((s, d) => s + d.pendentes, 0), resumo.pendentes);
assert.equal(grafico.dias.reduce((s, d) => s + d.vendas, 0), resumo.pagos);
// Ao efetivar, deixa as pendências e passa a ser venda sem duplicar o gráfico.
pedidos[1].status_pagamento = "finalizado";
assert.equal(diasPendentes(pedidos).some(d => d.dia === "2026-10-24"), false);
assert.equal(separarHistorico(pedidos).vendas.length, 2);
assert.deepEqual(movimentoDiario(pedidos, periodo).dias[1], { dia: "2026-10-24", pendentes: 0, vendas: 2 });
const longo = movimentoDiario(pedidos, { tipo: "personalizado", inicio: "2020-01-01", fim: "2027-01-01" });
assert.equal(longo.somenteComRegistros, true);
assert.equal(longo.dias.length, 3);
assert.deepEqual(movimentoDiario([], { tipo: "hoje", inicio: "2026-10-25", fim: "2026-10-25" }).dias, [{ dia: "2026-10-25", pendentes: 0, vendas: 0 }]);
console.log("OK: pendências, vendas, dias disponíveis, fuso, gráfico, totais, exclusões e efetivação sem duplicidade.");
