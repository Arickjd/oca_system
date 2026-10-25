const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const { PGlite } = require("@electric-sql/pglite");

async function main() {
  const db = new PGlite();
  const previous = process.env.DATABASE_URL;
  process.env.DATABASE_URL = "postgres://test-only";
  try {
    const { schema, importQueries } = await import("./database-schema.mjs");
    for (const query of schema) await db.exec(query);
    const produto = { id: "produto-1", nome: "Original", preco_pack: 12, pack_quantidade: 6, categoria_id: "cat" };
    const registros = [
      { colecao: "produtos", id: produto.id, dados: produto },
      { colecao: "pedidos", id: "antigo", dados: { id: "antigo", numero: 40, itens: [], valor_total: 0 } },
    ];
    async function importar() {
      await db.transaction(async tx => {
        for (const [query, params] of importQueries(registros)) await tx.query(query, params);
      });
    }
    await importar();
    function load() {
      const filename = path.join(process.cwd(), "src/lib/postgres.ts");
      const mod = new Module(filename, module);
      mod.filename = filename; mod.paths = module.paths;
      mod.require = name => name === "@neondatabase/serverless"
        ? { neon: () => ({ query: async (query, params) => (await db.query(query, params)).rows }) }
        : require(name);
      return fs.readFile(filename, "utf8").then(source => {
        mod._compile(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
        return mod.exports;
      });
    }
    let store = await load();
    await store.atualizar("produtos", produto.id, { nome: "Editado", preco_pack: 25 });
    await importar();
    assert.equal((await store.buscar("produtos", produto.id)).nome, "Editado");
    assert.equal((await store.buscar("produtos", produto.id)).categoria_id, "cat");
    await store.inserir("produtos", { ...produto, id: "novo" });
    const pedidos = await Promise.all(Array.from({ length: 20 }, (_, i) => store.inserirPedido({
      id: "pedido-" + i, numero: 0, itens: [{ produto_nome: "Snapshot", subtotal: 25 }], valor_total: 25,
    })));
    assert.equal(new Set(pedidos.map(p => p.numero)).size, 20);
    assert.equal(Math.min(...pedidos.map(p => p.numero)), 41);
    store = await load(); // Simula uma nova instância após redeploy.
    assert.equal((await store.listar("produtos")).length, 2);
    assert.equal((await store.listar("pedidos")).length, 21);
    await importar();
    assert.equal((await store.inserirPedido({ id: "ultimo", numero: 0, itens: [] })).numero, 61);
    await store.atualizar("produtos", produto.id, { nome: "Mudou novamente" });
    assert.equal((await store.buscar("pedidos", "pedido-0")).itens[0].produto_nome, "Snapshot");
    assert.equal(await store.atualizar("produtos", "inexistente", { nome: "x" }), undefined);
    const filename = path.join(process.cwd(), "src/lib/db.ts");
    const facade = new Module(filename, module);
    facade.filename = filename; facade.paths = module.paths;
    facade.require = name => name === "./postgres" ? store :
      name === "node:fs" ? { promises: new Proxy({}, { get() { throw new Error("Acesso indevido ao disco em modo PostgreSQL"); } }) } :
      require(name);
    facade._compile(ts.transpileModule(await fs.readFile(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText, filename);
    const api = facade.exports;
    await require("./test-categorias.cjs")(api);
    assert.equal((await api.getProdutos()).length, 2);
    const criado = await api.criarProduto({ nome: "Via aplicação", descricao: "Descrição inicial", preco_pack: 12.5, pack_quantidade: 6, categoria_id: "" });
    await api.atualizarProduto(criado.id, { nome: "Atualizado", preco_pack: 15, pack_quantidade: 12 });
    assert.equal((await api.getProduto(criado.id)).preco_pack, 15);
    assert.equal((await api.getProduto(criado.id)).descricao, "Descrição inicial");
    await api.atualizarProduto(criado.id, { nome: "Atualizado", preco_pack: 15, pack_quantidade: 12, descricao: "Nova descrição" });
    assert.equal((await api.getProduto(criado.id)).descricao, "Nova descrição");
    const pedido = await api.createPedido({ itens: [{
      produto_id: criado.id, produto_nome: "Atualizado", modo: "pacote", quantidade: 3, preco_unitario: 15, pack_quantidade: 12,
    }] });
    assert.equal(pedido.numero, 62);
    assert.equal((await api.getPedido(pedido.id)).valor_total, 45);
    assert.equal((await api.getPedidos()).length, 23);
    assert.equal(await api.readData("config.json", null), null);
    await assert.rejects(() => db.transaction(async tx => {
      for (const [query, params] of importQueries([{ colecao: "pedidos", id: "conflito", dados: { numero: 40 } }]))
        await tx.query(query, params);
    }));
    assert.equal(await store.buscar("pedidos", "conflito"), undefined);
    assert.equal(await api.excluirPedido(pedido.id), true);
    assert.equal(await api.excluirPedido(pedido.id), false);
    assert.equal(await api.excluirPedido("inexistente"), false);
    assert.equal(await api.getPedido(pedido.id), undefined);
    assert.equal((await api.getPedidos()).length, 22);
    await Promise.all((await api.getPedidos()).map(p => api.excluirPedido(p.id)));
    await importar(); // Importação não deve ressuscitar registros excluídos.
    assert.equal((await api.getPedidos()).length, 0);
    store = await load();
    const seguinte = await api.createPedido({ itens: [] });
    assert.equal(seguinte.numero, 63);
    assert.equal((await api.getPedidos()).length, 1);
    const venda = { itens: [{ produto_id: criado.id, produto_nome: "Teste de custo", modo: "pacote", quantidade: 3, preco_unitario: 15, pack_quantidade: 12 }] };
    assert.equal((await api.createPedido(venda)).lucro_bruto, null);
    await api.atualizarProduto(criado.id, { nome: "Com custo", preco_pack: 15, pack_quantidade: 12, custo_pack: 10 });
    const comCusto = await api.createPedido(venda);
    assert.equal(comCusto.lucro_bruto, 15);
    assert.equal(comCusto.itens[0].custo_unitario, 10);
    await api.atualizarProduto(criado.id, { nome: "Custo alterado", preco_pack: 15, pack_quantidade: 12, custo_pack: 20 });
    assert.equal((await api.getPedido(comCusto.id)).lucro_bruto, 15);
    assert.equal((await api.createPedido(venda)).lucro_bruto, -15);
    await api.atualizarProduto(criado.id, { nome: "Sem custo", preco_pack: 15, pack_quantidade: 12, custo_pack: 0 });
    assert.equal((await api.createPedido(venda)).lucro_bruto, null);
    assert.equal((await api.getPedido("antigo")), undefined);
    assert.equal(await api.excluirProduto(criado.id), true);
    assert.equal(await api.excluirProduto(criado.id), false);
    assert.equal(await api.excluirProduto("inexistente"), false);
    assert.equal(await api.getProduto(criado.id), undefined);
    assert.ok(!(await api.getProdutos()).some(p => p.id === criado.id));
    assert.equal(await api.atualizarProduto(criado.id, { nome: "Restaurado", preco_pack: 1, pack_quantidade: 1 }), undefined);
    assert.equal((await api.getPedido(comCusto.id)).lucro_bruto, 15);
    await api.excluirProduto(produto.id);
    await importar();
    assert.equal(await api.getProduto(produto.id), undefined);
    assert.equal(comCusto.status_pagamento, "pendente");
    const pagamentos = await Promise.all([api.finalizarPagamento(comCusto.id, "pix"), api.finalizarPagamento(comCusto.id, "cartao")]);
    assert.equal(pagamentos.filter(Boolean).length, 1);
    assert.equal((await api.getPedido(comCusto.id)).status_pagamento, "finalizado");
    assert.equal((await api.getPedido(comCusto.id)).lucro_bruto, 15);
    assert.equal(await api.finalizarPagamento("inexistente", "dinheiro"), undefined);
    await assert.rejects(() => api.finalizarPagamento(comCusto.id, "boleto"));
    assert.equal(await api.finalizarPagamento(pedido.id, "dinheiro"), undefined); // Excluído.
    const dinheiro = await api.createPedido({ itens: [] });
    assert.equal((await api.finalizarPagamento(dinheiro.id, "dinheiro")).forma_pagamento, "dinheiro");
    await require("./test-edicao.cjs")(api);
    await require("./test-descontos.cjs")(api);
    // A condição SQL também protege requisições de instâncias distintas.
    const protegido = await api.createPedido({ itens: [] });
    const disputas = await Promise.all([
      store.editarPedidoPendente(protegido.id, { revisao: 1 }, 0),
      store.editarPedidoPendente(protegido.id, { revisao: 1 }, 0),
    ]);
    assert.equal(disputas.filter(Boolean).length, 1);
    await api.finalizarPagamento(protegido.id, "pix", 1);
    assert.equal(await store.editarPedidoPendente(protegido.id, { revisao: 2 }, 1), undefined);
    const chaveLogin = "auth-tentativas:teste";
    const tentativasLogin = await Promise.all(Array.from({ length: 12 }, () => store.registrarTentativaLogin(chaveLogin, 1000, 900000, 10)));
    assert.equal(tentativasLogin.filter(t => t.permitido).length, 10);
    assert.equal((await store.registrarTentativaLogin(chaveLogin, 902000, 900000, 10)).permitido, true);
    await store.limparTentativasLogin(chaveLogin);
    assert.equal(await store.buscar("config", chaveLogin), undefined);
    const vercel = process.env.VERCEL;
    try {
      delete process.env.DATABASE_URL; process.env.VERCEL = "1";
      assert.throws(() => store.usarPostgres(), /DATABASE_URL/);
    } finally { if (vercel === undefined) delete process.env.VERCEL; else process.env.VERCEL = vercel; }
    console.log("OK: importação, edição, concorrência, exclusão, sequência após excluir todos, nova instância e configuração Vercel.");
  } finally {
    await db.close();
    if (previous === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = previous;
  }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
