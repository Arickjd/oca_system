const assert = require("node:assert/strict");

module.exports = async function testarEdicao(api) {
  const p = await api.criarProduto({ nome: "Produto para editar", preco_pack: 20, custo_pack: 10, pack_quantidade: 6, categoria_id: "" });
  const extra = await api.criarProduto({ nome: "Produto adicional", preco_pack: 30, custo_pack: 15, pack_quantidade: 12, categoria_id: "" });
  const original = await api.createPedido({ cliente_nome: "Antes", criado_por: { id: "jardel", nome: "Jardel" }, itens: [{ produto_id: p.id, produto_nome: p.nome, modo: "pacote", quantidade: 2, pack_quantidade: 6, preco_unitario: 20 }] });
  const edicao = { revisao: 0, cliente_nome: "Depois", criado_por: { id: "gisele", nome: "Gisele" }, telefone: "123", observacao: "Entregar amanhã", itens: [
    { ...original.itens[0], quantidade: 3, preco_unitario: 25, produto_nome: "Nome negociado", custo_unitario: 999, subtotal: 999 },
    { produto_id: extra.id, produto_nome: extra.nome, modo: "pacote", quantidade: 2, pack_quantidade: 12, preco_unitario: 30 },
  ] };
  await api.atualizarProduto(p.id, { nome: p.nome, preco_pack: 99, custo_pack: 50, pack_quantidade: 6 });
  const alterado = await api.editarPedido(original.id, edicao);
  assert.equal(alterado.numero, original.numero);
  assert.equal(alterado.created_at, original.created_at);
  assert.equal(alterado.valor_total, 135);
  assert.equal(alterado.lucro_bruto, 75);
  assert.equal(alterado.itens[0].custo_unitario, 10);
  assert.equal(alterado.itens[1].custo_unitario, 15);
  assert.equal(alterado.revisao, 1);
  assert.equal(alterado.cliente_nome, "Depois");
  assert.deepEqual(alterado.criado_por, { id: "jardel", nome: "Jardel" });
  assert.equal((await api.getProduto(p.id)).preco_pack, 99);
  assert.equal(await api.editarPedido(original.id, edicao), undefined); // Edição obsoleta.
  assert.equal(await api.finalizarPagamento(original.id, "pix", 0), undefined);
  for (const body of [null, { ...edicao, itens: [] }, { ...edicao, itens: [{ ...edicao.itens[0], quantidade: -1 }] }, { ...edicao, itens: [{ ...edicao.itens[0], preco_unitario: Infinity }] }]) {
    await assert.rejects(() => api.editarPedido(original.id, body));
  }
  await assert.rejects(() => api.editarPedido(original.id, { ...edicao, revisao: 1, itens: [{ ...edicao.itens[0], id: "inventado" }] }));
  const segunda = { ...edicao, revisao: 1, itens: [{ ...alterado.itens[0], quantidade: 1 }] };
  const concorrentes = await Promise.all([api.editarPedido(original.id, segunda), api.editarPedido(original.id, segunda)]);
  assert.equal(concorrentes.filter(Boolean).length, 1);
  assert.equal((await api.getPedido(original.id)).itens.length, 1);
  assert.equal((await api.getPedido(original.id)).valor_total, 25);
  await api.finalizarPagamento(original.id, "dinheiro", 2);
  assert.deepEqual((await api.getPedido(original.id)).criado_por, { id: "jardel", nome: "Jardel" });
  assert.equal(await api.editarPedido(original.id, { ...segunda, revisao: 2 }), undefined);
  const proximo = await api.createPedido({ itens: [edicao.itens[1]] });
  assert.equal(proximo.numero, original.numero + 1);
  await api.excluirPedido(proximo.id);
  assert.equal(await api.editarPedido(proximo.id, edicao), undefined);
  console.log("OK: edição, totais, custos históricos, catálogo preservado, versão obsoleta e bloqueio após pagamento/exclusão.");
};
