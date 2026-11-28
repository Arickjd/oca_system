const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { criarLoader } = require("./load-ts.cjs");

const dia = (offset) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  // O app compara com o dia local de Brasília; o teste precisa usar o mesmo fuso.
  return d.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
};

async function main() {
  const root = process.cwd();
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "oca-pag-"));
  try {
    process.chdir(temp);
    await fs.mkdir("data");
    await fs.writeFile("data/produtos.json", "[]");
    const carregar = criarLoader(root, { "./postgres": { usarPostgres: () => false } });
    const db = carregar("src/lib/db.ts");
    const { valorPago, valorRestante, dataDoLembrete, totalAReceber } = carregar("src/lib/pagamentos.ts");
    const { separarHistorico } = carregar("src/lib/historicoOrcamentos.ts");

    const item = { produto_id: "p1", produto_nome: "Produto", modo: "pacote", pack_quantidade: 6, quantidade: 1, preco_unitario: 100 };
    const pedido = await db.createPedido({ cliente_nome: "Cliente", itens: [item] });
    assert.equal(pedido.valor_total, 100);
    assert.equal(pedido.status_pagamento, "pendente");

    // Primeiro recebimento parcial, com lembrete.
    const previsao = dia(7);
    let atual = await db.registrarPagamentoParcial(pedido.id, { valor: 40, forma_pagamento: "pix", previsao_recebimento: previsao }, { id: "jardel", nome: "Jardel" }, 0);
    assert.equal(atual.status_pagamento, "parcial");
    assert.equal(atual.valor_pago, 40);
    assert.equal(valorRestante(atual), 60);
    assert.equal(atual.pagamentos.length, 1);
    assert.equal(atual.pagamentos[0].registrado_por.nome, "Jardel");
    assert.equal(atual.previsao_recebimento, previsao);
    assert.equal(atual.revisao, 1);

    // Segundo recebimento, sem novo lembrete: mantém a data anterior.
    atual = await db.registrarPagamentoParcial(pedido.id, { valor: 10, forma_pagamento: "dinheiro" }, undefined, 1);
    assert.equal(atual.valor_pago, 50);
    assert.equal(valorRestante(atual), 50);
    assert.equal(atual.pagamentos.length, 2);
    assert.equal(atual.previsao_recebimento, previsao);

    // Valor que cobre o restante é rejeitado (deve usar o pagamento total).
    await assert.rejects(() => db.registrarPagamentoParcial(pedido.id, { valor: 50, forma_pagamento: "pix" }, undefined, 2), db.PagamentoInvalido);
    await assert.rejects(() => db.registrarPagamentoParcial(pedido.id, { valor: 0, forma_pagamento: "pix" }, undefined, 2), db.PagamentoInvalido);
    await assert.rejects(() => db.registrarPagamentoParcial(pedido.id, { valor: 10, forma_pagamento: "boleto" }, undefined, 2), db.PagamentoInvalido);
    await assert.rejects(() => db.registrarPagamentoParcial(pedido.id, { valor: 10, forma_pagamento: "pix", previsao_recebimento: dia(-1) }, undefined, 2), db.PagamentoInvalido);
    await assert.rejects(() => db.registrarPagamentoParcial(pedido.id, { valor: 10, forma_pagamento: "pix", previsao_recebimento: "31/12/2026" }, undefined, 2), db.PagamentoInvalido);

    // Revisão desatualizada não grava.
    assert.equal(await db.registrarPagamentoParcial(pedido.id, { valor: 5, forma_pagamento: "pix" }, undefined, 0), undefined);

    // Quitação: entra o restante como último recebimento e limpa o lembrete.
    const quitado = await db.finalizarPagamento(pedido.id, "cartao", 2, { id: "jardel", nome: "Jardel" });
    assert.equal(quitado.status_pagamento, "finalizado");
    assert.equal(quitado.forma_pagamento, "cartao");
    assert.equal(quitado.valor_pago, 100);
    assert.equal(quitado.previsao_recebimento, null);
    assert.equal(quitado.pagamentos.length, 3);
    assert.equal(quitado.pagamentos[2].valor, 50);
    assert.equal(quitado.pagamentos[2].forma_pagamento, "cartao");
    assert.equal(valorPago(quitado), 100);
    assert.equal(valorRestante(quitado), 0);

    // Orçamento sem parcelas finaliza sem inventar histórico.
    const simples = await db.createPedido({ itens: [item] });
    const fechado = await db.finalizarPagamento(simples.id, "pix");
    assert.equal(fechado.pagamentos, undefined);
    assert.equal(fechado.valor_pago, 100);

    // Separação das abas.
    const aberto = await db.createPedido({ itens: [item] });
    const parcial = await db.createPedido({ itens: [item] });
    await db.registrarPagamentoParcial(parcial.id, { valor: 25, forma_pagamento: "pix" }, undefined, 0);
    const { abertos, parciais, pendentes, vendas } = separarHistorico(await db.getPedidos());
    assert.equal(abertos.length, 1);
    assert.equal(parciais.length, 1);
    assert.equal(pendentes.length, 2);
    assert.equal(vendas.length, 2);
    assert.equal(abertos[0].id, aberto.id);
    assert.equal(totalAReceber(parciais), 75);

    // Não aceita parcial em orçamento já finalizado.
    assert.equal(await db.registrarPagamentoParcial(quitado.id, { valor: 1, forma_pagamento: "pix" }), undefined);

    // Edição não pode deixar o total abaixo do que já foi recebido.
    const alvo = await db.createPedido({ itens: [item] });
    await db.registrarPagamentoParcial(alvo.id, { valor: 30, forma_pagamento: "pix" }, undefined, 0);
    const corpoBaixo = { revisao: 1, itens: [{ id: alvo.itens[0].id, produto_id: "p1", produto_nome: "Produto", modo: "pacote", pack_quantidade: 6, quantidade: 1, preco_unitario: 10 }] };
    await assert.rejects(() => db.editarPedido(alvo.id, corpoBaixo, false), db.EdicaoInvalida);
    const corpoOk = { ...corpoBaixo, itens: [{ ...corpoBaixo.itens[0], preco_unitario: 150 }] };
    const editado = await db.editarPedido(alvo.id, corpoOk, false);
    assert.equal(editado.valor_total, 150);
    assert.equal(editado.status_pagamento, "parcial");

    // Datas rápidas do lembrete.
    assert.equal(dataDoLembrete("semana", undefined, new Date("2026-11-13T12:00:00Z")), "2026-11-20");
    assert.equal(dataDoLembrete("mes", undefined, new Date("2026-11-13T12:00:00Z")), "2026-12-13");
    assert.equal(dataDoLembrete("data", "2026-12-01", new Date("2026-11-13T12:00:00Z")), "2026-12-01");

    console.log("OK: recebimento parcial, acúmulo, limites, revisão, quitação, lembretes e separação das abas.");
  } finally {
    process.chdir(root);
    await fs.rm(temp, { recursive: true, force: true });
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
