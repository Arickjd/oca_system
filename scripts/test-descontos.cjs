const assert = require("node:assert/strict");

module.exports = async function testarDescontos(api) {
  const produto = await api.criarProduto({ nome: "Desconto na venda", preco_pack: 100, custo_pack: 60, pack_quantidade: 10, categoria_id: "" });
  // O mesmo patch usado pelo carrinho deve preservar o preço global.
  await api.atualizarProduto(produto.id, { nome: "Nome atualizado", pack_quantidade: 10 });
  assert.equal((await api.getProduto(produto.id)).preco_pack, 100);
  const item = { produto_id: produto.id, produto_nome: produto.nome, modo: "pacote", quantidade: 3, pack_quantidade: 10, preco_unitario: 80, preco_original: 999, desconto_unitario: 999 };
  const pedido = await api.createPedido({ itens: [item] });
  assert.equal(pedido.itens[0].preco_original, 100); // Fonte confiável: catálogo no servidor.
  assert.equal(pedido.itens[0].desconto_unitario, 20);
  assert.equal(pedido.valor_total, 240);
  assert.equal(pedido.lucro_bruto, 60);
  assert.equal((await api.getProduto(produto.id)).preco_pack, 100);
  await api.atualizarProduto(produto.id, { nome: produto.nome, preco_pack: 150, custo_pack: 90, pack_quantidade: 10 });
  const alterado = await api.editarPedido(pedido.id, { revisao: 0, itens: [{ ...pedido.itens[0], preco_unitario: 70, preco_original: 999, desconto_unitario: 999 }] });
  assert.equal(alterado.itens[0].preco_original, 100); // Histórico não acompanha o catálogo.
  assert.equal(alterado.itens[0].desconto_unitario, 30);
  assert.equal(alterado.valor_total, 210);
  assert.equal(alterado.lucro_bruto, 30);
  const semDesconto = await api.editarPedido(pedido.id, { revisao: 1, itens: [{ ...alterado.itens[0], preco_unitario: 100 }] });
  assert.equal(semDesconto.itens[0].desconto_unitario, 0);
  const gratis = await api.editarPedido(pedido.id, { revisao: 2, itens: [{ ...semDesconto.itens[0], preco_unitario: 0 }] });
  assert.equal(gratis.itens[0].desconto_unitario, 100);
  assert.equal(gratis.valor_total, 0);
  await api.finalizarPagamento(pedido.id, "pix", 3);
  assert.equal((await api.getPedido(pedido.id)).itens[0].preco_original, 100);
  assert.equal((await api.getProduto(produto.id)).preco_pack, 150);
  const centavos = await api.createPedido({ itens: [{ ...item, preco_unitario: 149.99, quantidade: 3 }] });
  assert.equal(centavos.itens[0].desconto_unitario, 0.01);
  assert.equal(centavos.valor_total, 449.97);
  const unidade = await api.createPedido({ itens: [{ ...item, modo: "unidade", preco_unitario: 12 }] });
  assert.equal(unidade.itens[0].preco_original, 15);
  assert.equal(unidade.itens[0].desconto_unitario, 3);
  console.log("OK: desconto por venda, preço global preservado, referência histórica, totais, lucro e pagamento.");
};
