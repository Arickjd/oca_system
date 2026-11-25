const assert = require("node:assert/strict");
const { criarLoader } = require("./load-ts.cjs");

const { normalizarBusca, produtoCombina } = criarLoader(process.cwd())("src/lib/busca.ts");

assert.equal(normalizarBusca("  Água Mineral, 1,5L "), "agua mineral 1 5l");
assert.equal(normalizarBusca("PÃO-D'ÁGUA"), "pao d agua");
assert.ok(produtoCombina({ nome: "Café Torrado" }, "cafe"), "acento");
assert.ok(produtoCombina({ nome: "Café Torrado" }, "CAFE torrado"), "caixa e dois termos");
assert.ok(produtoCombina({ nome: "Água Mineral 1,5L" }, "mineral agua"), "ordem dos termos");
assert.ok(produtoCombina({ nome: "Água Mineral 1,5L" }, "agua 1.5"), "pontuação");
assert.ok(produtoCombina({ nome: "Refrigerante", codigo: "CX-001" }, "cx 001"), "código");
assert.ok(produtoCombina({ nome: "COCA COLA 1,5L PADRAO" }, "coca 1.5"), "número quebrado");
assert.ok(!produtoCombina({ nome: "PAÇOCA PADRAO" }, "coca 1.5"), "não casa no meio da palavra");
assert.ok(!produtoCombina({ nome: "Café Torrado" }, "leite"), "não combina");
assert.ok(produtoCombina({ nome: "Café" }, ""), "consulta vazia");
assert.ok(!produtoCombina({ nome: "Café" }, "café gelado"), "todos os termos são exigidos");
console.log("OK: busca ignora acentos, caixa, pontuação e ordem dos termos.");
