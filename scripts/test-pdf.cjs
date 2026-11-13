const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const Module = require("node:module");
const assert = require("node:assert/strict");
function load(file) {
  const filename = path.resolve(file);
  const mod = new Module(filename, module);
  mod.filename = filename; mod.paths = module.paths;
  mod.require = name => name.startsWith(".") ? load(path.resolve(path.dirname(filename), name + ".ts")) : require(name);
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
fs.readFileSync("public/logo.png"), { icone: fs.readFileSync("public/pix/icon_pix_green.jpg"), qrCode: fs.readFileSync("public/pix/qrcode_pix.png") });
assert.equal(Buffer.from(pdf).subarray(0, 5).toString(), "%PDF-");
fs.mkdirSync("tmp/pdfs", { recursive: true });
fs.writeFileSync("tmp/pdfs/orcamento-teste.pdf", pdf);
console.log("PDF válido gerado para inspeção em tmp/pdfs/orcamento-teste.pdf");

// Catálogo de produtos (com custo), agrupado por categoria.
const { gerarProdutosPdf } = load("src/lib/produtosPdf.ts");
const categorias = [
  { id: "c1", nome: "Bebidas", ativo: true, created_at: "2026-01-01T00:00:00Z" },
  { id: "c2", nome: "Outros", ativo: true, created_at: "2026-01-01T00:00:00Z" },
];
const produtoBase = { descricao: "", imagem_url: "", unidade: "un", ativo: true, created_at: "2026-01-01T00:00:00Z" };
const produtos = [
  { ...produtoBase, id: "1", nome: "Produto B", preco_pack: 10, custo_pack: 6, pack_quantidade: 6, categoria_id: "c1" },
  { ...produtoBase, id: "2", nome: "Produto A", preco_pack: 20, custo_pack: 0, pack_quantidade: 12, categoria_id: "c1" },
  { ...produtoBase, id: "3", nome: "Sem custo", preco_pack: 5, pack_quantidade: 1, categoria_id: "c2", ativo: false },
];
const catalogo = gerarProdutosPdf(produtos, categorias, "OCA Distribuidora");
assert.equal(Buffer.from(catalogo).subarray(0, 5).toString(), "%PDF-");
fs.writeFileSync("tmp/pdfs/produtos-teste.pdf", catalogo);
console.log("PDF do catálogo gerado em tmp/pdfs/produtos-teste.pdf");

// Cupom de 80 mm (sem logo/QR para não depender de imagens neste teste).
const { gerarCupomPdf } = load("src/lib/cupomPdf.ts");
const cupomPedido = {
  id: "teste", numero: 77, cliente_nome: "Cliente", telefone: "(00) 90000-0000", observacao: "Entregar pela manhã.",
  created_at: "2026-11-10T12:00:00Z", status_pagamento: "pendente", valor_total: 160,
  itens: [{ id: "1", produto_nome: "Produto de teste", modo: "pacote", pack_quantidade: 6, quantidade: 2, preco_original: 90, desconto_unitario: 10, preco_unitario: 80, subtotal: 160 }],
};
const cupom = gerarCupomPdf(cupomPedido, { distribuidora_nome: "OCA Distribuidora", distribuidora_contato: "(89) 99427-0756", endereco: "", whatsapp: "", pack_padrao: 6 }, null, null);
assert.equal(Buffer.from(cupom).subarray(0, 5).toString(), "%PDF-");
assert.ok(cupom.length > 1000);
fs.writeFileSync("tmp/pdfs/cupom-teste.pdf", cupom);
console.log("Cupom 80 mm gerado em tmp/pdfs/cupom-teste.pdf");
