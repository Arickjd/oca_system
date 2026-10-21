const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

function load(file) {
  const filename = path.resolve(file);
  const mod = new Module(filename, module);
  mod.filename = filename; mod.paths = module.paths;
  mod.require = name => name === "@/lib/format" ? load("src/lib/format.ts")
    : name === "./db" ? { getCategorias: async () => [] } : require(name);
  mod._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, filename);
  return mod.exports;
}

async function main() {
  const { RentabilidadeProduto } = load("src/components/RentabilidadeProduto.tsx");
  const render = (venda, custo) => renderToStaticMarkup(React.createElement(RentabilidadeProduto, { venda, custo }));
  assert.match(render(100, 80), /20%/);
  assert.match(render(100, 120), /-20%/);
  assert.match(render(100, 120), /text-red-800/);
  assert.match(render(100, 100), /0%/);
  for (const custo of [undefined, null, 0]) assert.equal((render(100, custo).match(/---/g) || []).length, 2);
  assert.match(render(0, 80), /---/); // Sem divisão por zero.
  const { validarProduto } = load("src/lib/validarProduto.ts");
  const base = { nome: "Produto", preco_pack: 100, pack_quantidade: 6 };
  for (const custo_pack of [-1, Infinity, NaN, "10"]) await assert.rejects(() => validarProduto({ ...base, custo_pack }));
  assert.equal((await validarProduto({ ...base, custo_pack: 12.345 })).custo_pack, 12.35);
  assert.equal((await validarProduto({ ...base, custo_pack: 0 })).custo_pack, null);
  assert.equal((await validarProduto({ ...base, custo_pack: null })).custo_pack, null);
  assert.ok(!Object.hasOwn(await validarProduto(base), "custo_pack")); // Edição antiga não apaga custo.
  console.log("OK: margens, prejuízo, custo ausente/zero, validação e compatibilidade de edição.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
