const assert = require("node:assert/strict");

module.exports = async function testarCategorias(db) {
  const antes = (await db.getCategorias()).length;
  await assert.rejects(() => db.criarCategoria("   "));
  await assert.rejects(() => db.criarCategoria("x".repeat(101)));
  const categoria = await db.criarCategoria("  Descartáveis   novos  ");
  assert.equal(categoria.nome, "Descartáveis novos");
  assert.equal(categoria.ativo, true);
  assert.ok(categoria.id);
  assert.ok(categoria.created_at);
  assert.equal((await db.criarCategoria("descartaveis novos")).id, categoria.id);
  assert.equal((await db.getCategorias()).length, antes + 1);
  const produto = await db.criarProduto({ nome: "Produto categoria teste", preco_pack: 10, pack_quantidade: 1, categoria_id: categoria.id });
  assert.equal((await db.getProduto(produto.id)).categoria_id, categoria.id);
  await db.excluirProduto(produto.id);
  console.log("OK: criação, validação, reutilização e vínculo de categorias.");
};
