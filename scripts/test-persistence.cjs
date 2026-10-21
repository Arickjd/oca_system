const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

async function main() {
  const root = process.cwd();
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "oca-test-"));
  try {
    const source = await fs.readFile(path.join(root, "src/lib/db.ts"), "utf8");
    process.chdir(temp);
    await fs.mkdir("data");
    await fs.writeFile("data/produtos.json", "[]");
    const mod = new Module(path.join(root, "src/lib/db.cjs"), module);
    mod.filename = path.join(root, "src/lib/db.cjs");
    mod.paths = module.paths;
    mod.require = name => name === "./postgres" ? { usarPostgres: () => false } : require(name);
    mod._compile(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, mod.filename);
    const db = mod.exports;
    const produto = await db.criarProduto({ nome: "Teste", preco_pack: 12.5, pack_quantidade: 6, categoria_id: "" });
    await db.atualizarProduto(produto.id, { nome: "Atualizado", preco_pack: 15, pack_quantidade: 12 });
    assert.equal((await db.getProduto(produto.id)).nome, "Atualizado");
    const input = { itens: [{ produto_id: produto.id, produto_nome: "Snapshot", modo: "pacote", quantidade: 3, pack_quantidade: 12, preco_unitario: 15 }] };
    await Promise.all(Array.from({ length: 20 }, () => db.createPedido(input)));
    const pedidos = await db.getPedidos();
    assert.equal(pedidos.length, 20);
    assert.equal(new Set(pedidos.map(p => p.numero)).size, 20);
    assert.ok(pedidos.every(p => p.valor_total === 45));
    await db.atualizarProduto(produto.id, { nome: "Outro nome", preco_pack: 25, pack_quantidade: 6 });
    assert.equal((await db.getPedidos())[0].itens[0].produto_nome, "Snapshot");
    assert.equal(await db.excluirPedido(pedidos[0].id), true);
    assert.equal(await db.excluirPedido(pedidos[0].id), false);
    assert.equal(await db.excluirPedido("inexistente"), false);
    assert.equal(await db.getPedido(pedidos[0].id), undefined);
    assert.equal((await db.createPedido(input)).numero, 21);
    await Promise.all((await db.getPedidos()).map(p => db.excluirPedido(p.id)));
    assert.equal((await db.getPedidos()).length, 0);
    assert.equal((await db.createPedido(input)).numero, 22);
    await db.atualizarProduto(produto.id, { nome: "Com custo", preco_pack: 15, pack_quantidade: 12, custo_pack: 10 });
    const comCusto = await db.createPedido(input);
    assert.equal(comCusto.lucro_bruto, 15);
    assert.equal(comCusto.itens[0].custo_unitario, 10);
    await db.atualizarProduto(produto.id, { nome: "Custo alterado", preco_pack: 15, pack_quantidade: 12, custo_pack: null });
    assert.equal((await db.getPedido(comCusto.id)).lucro_bruto, 15);
    assert.equal((await db.createPedido(input)).lucro_bruto, null);
    const misto = { itens: [...input.itens, { ...input.itens[0], produto_id: "sem-cadastro" }] };
    assert.equal((await db.createPedido(misto)).lucro_bruto, null);
    await fs.writeFile("data/pedidos.json", "{invalid");
    await assert.rejects(() => db.createPedido(input));
    assert.equal(await fs.readFile("data/pedidos.json", "utf8"), "{invalid");
    console.log("OK: cadastro, edição, concorrência, exclusão sem reutilizar números e proteção contra JSON corrompido.");
  } finally {
    process.chdir(root);
    await fs.rm(temp, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
