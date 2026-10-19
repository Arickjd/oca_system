const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const Module = require("node:module");
const assert = require("node:assert/strict");
function load(file) {
  const filename = path.resolve(file);
  const mod = new Module(filename, module);
  mod.filename = filename; mod.paths = module.paths;
  mod.require = name => name === "./format" ? load("src/lib/format.ts") : require(name);
  mod._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText, filename);
  return mod.exports;
}
const { gerarOrcamentoPdf } = load("src/lib/orcamentoPdf.ts");
const itens = Array.from({ length: 75 }, (_, i) => ({
  id: String(i), produto_id: String(i), produto_nome: "Água mineral e refrigerante - descrição longa para verificar quebra de linha " + (i + 1),
  modo: "pacote", pack_quantidade: 12, quantidade: 2, preco_unitario: 35.5, subtotal: 71,
}));
const pdf = gerarOrcamentoPdf({
  id: "teste", numero: 123, cliente_nome: "José da Conceição", telefone: "(00) 90000-0000",
  created_at: "2026-10-19T12:00:00Z", itens, valor_total: 5325,
  observacao: "Entrega pela manhã. " + "Conferir os pacotes e o endereço de entrega. ".repeat(15), status: "novo",
}, { distribuidora_nome: "OCA Distribuidora", distribuidora_contato: "(89) 99427-0756", endereco: "", whatsapp: "", pack_padrao: 6 },
fs.readFileSync("public/logo.png"));
assert.equal(Buffer.from(pdf).subarray(0, 5).toString(), "%PDF-");
fs.mkdirSync("tmp/pdfs", { recursive: true });
fs.writeFileSync("tmp/pdfs/orcamento-teste.pdf", pdf);
console.log("PDF válido gerado para inspeção em tmp/pdfs/orcamento-teste.pdf");
