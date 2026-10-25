const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const ExcelJS = require("exceljs");

async function main() {
  const filename = path.resolve("src/lib/exportarBancoXlsx.ts");
  const mod = new Module(filename, module); mod.filename = filename; mod.paths = module.paths;
  mod._compile(ts.transpileModule(await fs.readFile(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, filename);
  const { gerarBancoXlsx, dividirJson } = mod.exports;
  const textoLongo = "a".repeat(29999) + "😀" + "b".repeat(40000);
  const dados = { nome: "=HYPERLINK(\"https://externo.com\")", preco_pack: 99.9, custo_pack: 0, pack_quantidade: 100, descricao: textoLongo, categoria_id: "cat-1", ativo: false, created_at: "2026-10-25T03:30:00Z", excluido_em: "2026-10-25T04:00:00Z", campo_futuro: { preservado: true } };
  const pedido = { numero: 42, cliente_nome: "Cliente de teste", telefone: "001234", observacao: "+Nome literal", criado_por: { id: "gisele", nome: "Gisele" }, valor_total: 179.8, lucro_bruto: null, status: "novo", status_pagamento: "pendente", created_at: "2026-10-25T03:30:00Z", excluido_em: "2026-10-25T05:00:00Z", itens: [{ id: "item-1", produto_id: "p-1", produto_nome: "Produto histórico", modo: "pacote", quantidade: 2, pack_quantidade: 100, preco_original: 99.9, desconto_unitario: 10, preco_unitario: 89.9, custo_unitario: null, subtotal: 179.8 }] };
  const snapshot = { origem: "postgres", gerado_em: "2026-10-25T06:00:00Z", contadores: [{ id: "pedidos", valor: "9007199254740993" }], registros: [
    { colecao: "produtos", id: "p-1", dados },
    { colecao: "categorias", id: "cat-1", dados: { nome: "Descartáveis", ativo: true, created_at: "2026-10-25T03:00:00Z" } },
    { colecao: "pedidos", id: "orc-1", dados: pedido },
    { colecao: "config", id: "principal", dados: { distribuidora_nome: "OCA Distribuidora", pack_padrao: 6, whatsapp: "001234" } },
    { colecao: "config", id: "auth-tentativas:teste", dados: { quantidade: 2, ate: 123456 } },
  ] };
  const buffer = await gerarBancoXlsx(snapshot, "Jardel");
  const wb = new ExcelJS.Workbook(); await wb.xlsx.load(buffer);
  assert.deepEqual(wb.worksheets.map(s => s.name), ["Resumo", "Produtos", "Categorias", "Orçamentos", "Itens", "Configurações", "Contadores", "Registros brutos"]);
  assert.equal(wb.getWorksheet("Produtos").getCell("C2").value, dados.nome);
  assert.equal(wb.getWorksheet("Produtos").getCell("C2").type, ExcelJS.ValueType.String);
  assert.equal(wb.getWorksheet("Produtos").getCell("G2").value, 99.9);
  assert.equal(wb.getWorksheet("Produtos").getCell("H2").value, 0);
  assert.equal(wb.getWorksheet("Produtos").getCell("M2").value.toISOString(), "2026-10-25T00:30:00.000Z");
  assert.equal(wb.getWorksheet("Orçamentos").getCell("D2").value, "001234");
  assert.equal(wb.getWorksheet("Orçamentos").getCell("G2").value, "Gisele");
  assert.equal(wb.getWorksheet("Orçamentos").getCell("I2").value, null);
  assert.equal(wb.getWorksheet("Itens").getCell("L2").value, 89.9);
  assert.equal(wb.getWorksheet("Contadores").getCell("B2").value, "9007199254740993");
  const raw = wb.getWorksheet("Registros brutos");
  for (const registro of snapshot.registros) {
    const partes = [];
    raw.eachRow((row, index) => { if (index > 1 && row.getCell(1).value === registro.colecao && row.getCell(2).value === registro.id) partes.push({ parte: row.getCell(3).value, json: row.getCell(5).value }); });
    assert.deepEqual(JSON.parse(partes.sort((a, b) => a.parte - b.parte).map(p => p.json).join("")), registro.dados);
  }
  assert.equal(dividirJson(textoLongo).join(""), textoLongo);
  for (const s of wb.worksheets) {
    s.eachRow(row => row.eachCell(cell => { assert.notEqual(cell.type, ExcelJS.ValueType.Formula); if (typeof cell.value === "string") assert.ok(cell.value.length <= 32767); }));
    if (s.name !== "Resumo") { assert.equal(s.views[0].ySplit, 1); assert.ok(s.autoFilter); }
  }
  const vazio = new ExcelJS.Workbook(); await vazio.xlsx.load(await gerarBancoXlsx({ ...snapshot, registros: [], contadores: [] }, "Jairo"));
  assert.equal(vazio.getWorksheet("Produtos").rowCount, 1);
  assert.equal(vazio.getWorksheet("Itens").rowCount, 1);
  await fs.mkdir("tmp/xlsx", { recursive: true });
  await fs.writeFile("tmp/xlsx/exportacao-banco-teste.xlsx", buffer);
  console.log("OK: todas as abas, exclusões, datas de Brasília, valores tipados, precisão, vínculos, texto literal e JSON completo em partes.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
