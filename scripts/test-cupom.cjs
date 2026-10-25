const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

function load(file) {
  const filename = path.resolve(file);
  const mod = new Module(filename, module); mod.filename = filename; mod.paths = module.paths;
  mod.require = name => name.endsWith(".css") ? new Proxy({}, { get: (_, key) => key === "__esModule" ? false : String(key) })
    : name.startsWith("@/") ? load(path.resolve("src", name.slice(2)) + ".ts")
    : name.startsWith(".") ? load(path.resolve(path.dirname(filename), name + ".ts")) : require(name);
  mod._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText, filename);
  return mod.exports;
}
const { CupomConteudo } = load("src/components/CupomConteudo.tsx");
const pedido = {
  id: "teste", numero: 42, cliente_nome: "Cliente <script>", telefone: "001234", observacao: "Entregar amanhã.",
  criado_por: { id: "jardel", nome: "Jardel" }, created_at: "2026-10-25T15:00:00Z", status_pagamento: "pendente",
  lucro_bruto: 12345.67, valor_total: 160,
  itens: [{ id: "i", produto_nome: "Produto com nome longo & detalhes", modo: "pacote", quantidade: 2, pack_quantidade: 100, preco_original: 100, desconto_unitario: 20, preco_unitario: 80, custo_unitario: 9876.54, subtotal: 160 }],
};
const config = { distribuidora_nome: "OCA Distribuidora", distribuidora_contato: "Contato", endereco: "Endereço de teste" };
const render = p => renderToStaticMarkup(React.createElement(CupomConteudo, { pedido: p, config }));
const html = render(pedido);
for (const texto of ["80 mm", "DOCUMENTO NÃO FISCAL", "ORÇAMENTO", "Pagamento pendente", "Responsável:", "Jardel", "Valor Original:", "Valor final:", "Desconto total", "40,00", "160,00", "Cliente &lt;script&gt;"]) assert.ok(html.includes(texto), texto);
for (const texto of ["lucro", "custo", "9876", "9.876", "12345", "12.345", "<script>"]) assert.ok(!html.toLowerCase().includes(texto), texto);
const semDesconto = render({ ...pedido, itens: [{ ...pedido.itens[0], preco_unitario: 100, desconto_unitario: 0, subtotal: 200 }], valor_total: 200 });
assert.ok(!semDesconto.includes("Desconto"));
assert.ok(!semDesconto.includes("Valor final:"));
for (const [forma, nome] of [["pix", "Pix"], ["cartao", "Cartão"], ["dinheiro", "Dinheiro"]]) {
  const pago = render({ ...pedido, status_pagamento: "finalizado", forma_pagamento: forma, pago_em: "2026-10-25T16:00:00Z" });
  for (const texto of ["RECIBO DE VENDA", "Pagamento finalizado", nome, "Pago em:"]) assert.ok(pago.includes(texto));
  assert.ok(!pago.includes("Pagamento pendente"));
}
console.log("OK: cupom pendente/finalizado, descontos, valores, responsável, formas de pagamento e ausência de custo/lucro.");
