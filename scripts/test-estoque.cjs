const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { criarLoader } = require("./load-ts.cjs");

const jardel = { id: "jardel", nome: "Jardel" };

function produtoBase(id, extra = {}) {
  return { id, nome: `Produto ${id}`, descricao: "", preco_pack: 60, pack_quantidade: 6, categoria_id: "cat", unidade: "un", imagem_url: "", ativo: true, created_at: new Date().toISOString(), ...extra };
}

// Fluxo completo do estoque contra uma API db (local ou pglite).
async function exercitar(db, { modo }) {
  // Catálogo: um produto que será controlado (inventário inicial 24 un) e um sem controle.
  let controlado, livre;
  if (modo === "local") {
    await fs.writeFile("data/produtos.json", JSON.stringify([produtoBase("p1"), produtoBase("p2")], null, 2));
    controlado = "p1"; livre = "p2";
  } else {
    await db.criarProduto({ nome: "Produto p1", preco_pack: 60, pack_quantidade: 6, categoria_id: "cat" });
    await db.criarProduto({ nome: "Produto p2", preco_pack: 60, pack_quantidade: 6, categoria_id: "cat" });
    const [p1, p2] = await db.getProdutos();
    controlado = p1.id; livre = p2.id;
  }
  // Inventário inicial via ajuste (todo saldo nasce de um movimento no ledger).
  const inicial = await db.registrarMovimentoManual(controlado, { tipo: "ajuste", quantidade: 24, motivo: "Inventário inicial" }, jardel);
  assert.equal(inicial.movimento.saldo_apos, 24);

  // Validações de entrada manual.
  await assert.rejects(() => db.registrarMovimentoManual(controlado, { tipo: "entrada", quantidade: 0 }, jardel), db.MovimentoInvalido);
  await assert.rejects(() => db.registrarMovimentoManual(controlado, { tipo: "entrada", quantidade: -5 }, jardel), db.MovimentoInvalido);
  await assert.rejects(() => db.registrarMovimentoManual(controlado, { tipo: "saida", quantidade: 5 }, jardel), db.MovimentoInvalido);
  await assert.rejects(() => db.registrarMovimentoManual(controlado, { tipo: "ajuste", quantidade: 10 }, jardel), db.MovimentoInvalido); // ajuste exige motivo
  assert.equal(await db.registrarMovimentoManual("inexistente", { tipo: "entrada", quantidade: 1 }, jardel), undefined);

  // Entrada em pacotes: 2 pacotes × 6 = +12 un (24 → 36).
  let r = await db.registrarMovimentoManual(controlado, { tipo: "entrada", quantidade: 2, modo: "pacote", motivo: "Compra" }, jardel);
  assert.equal(r.movimento.quantidade, 12);
  assert.equal(r.movimento.saldo_apos, 36);
  assert.equal((await db.getProduto(controlado)).estoque_atual, 36);

  // Perda em unidades: -3 (36 → 33).
  r = await db.registrarMovimentoManual(controlado, { tipo: "perda", quantidade: 3, motivo: "Quebra" }, jardel);
  assert.equal(r.movimento.saldo_apos, 33);

  // Venda de 2 pacotes do controlado + 1 do livre: só o controlado baixa (33 → 21).
  const venda = await db.createPedido({ cliente_nome: "Mercado X", itens: [
    { produto_id: controlado, produto_nome: "Produto p1", modo: "pacote", pack_quantidade: 6, quantidade: 2, preco_unitario: 60 },
    { produto_id: livre, produto_nome: "Produto p2", modo: "pacote", pack_quantidade: 6, quantidade: 1, preco_unitario: 60 },
  ] });
  assert.equal((await db.getProduto(controlado)).estoque_atual, 33); // criação não baixa
  const paga = await db.finalizarPagamento(venda.id, "pix", 0, jardel);
  assert.ok(paga);
  assert.equal((await db.getProduto(controlado)).estoque_atual, 21);
  assert.equal((await db.getProduto(livre)).estoque_atual, undefined); // sem controle continua sem

  // Histórico: saída registrada com vínculo à venda; filtro por produto.
  const movimentos = await db.getMovimentosEstoque({ produtoId: controlado, limite: 100 });
  const saida = movimentos.find(m => m.tipo === "saida");
  assert.equal(saida.quantidade, -12);
  assert.equal(saida.saldo_apos, 21);
  assert.equal(saida.pedido_numero, venda.numero);
  assert.equal(saida.registrado_por.nome, "Jardel");
  assert.ok((await db.getMovimentosEstoque({ produtoId: livre })).length === 0);

  // Exclusão de venda finalizada estorna (+12 → 33).
  assert.equal(await db.excluirPedido(venda.id, true), true);
  assert.equal((await db.getProduto(controlado)).estoque_atual, 33);
  const estorno = (await db.getMovimentosEstoque({ produtoId: controlado })).find(m => m.tipo === "estorno");
  assert.equal(estorno.quantidade, 12);
  assert.equal(estorno.saldo_apos, 33);

  // Nova venda para testar edição de venda finalizada (delta por item).
  const venda2 = await db.createPedido({ itens: [
    { produto_id: controlado, produto_nome: "Produto p1", modo: "pacote", pack_quantidade: 6, quantidade: 2, preco_unitario: 60 },
  ] });
  await db.finalizarPagamento(venda2.id, "dinheiro", 0, jardel); // 33 → 21
  // Edita quantidade 2 → 3 pacotes: delta -6 un (21 → 15).
  const corpo = { revisao: 1, itens: [{ id: venda2.itens[0].id, produto_id: controlado, produto_nome: "Produto p1", modo: "pacote", pack_quantidade: 6, quantidade: 3, preco_unitario: 60 }] };
  const editada = await db.editarPedido(venda2.id, corpo, true);
  assert.ok(editada);
  assert.equal((await db.getProduto(controlado)).estoque_atual, 15);
  // Edita de volta 3 → 1 pacote: delta +12 (15 → 27).
  const corpo2 = { revisao: 2, itens: [{ ...corpo.itens[0], quantidade: 1 }] };
  await db.editarPedido(venda2.id, corpo2, true);
  assert.equal((await db.getProduto(controlado)).estoque_atual, 27);

  // Ajuste de inventário define o saldo exato (27 → 20, movimento -7).
  r = await db.registrarMovimentoManual(controlado, { tipo: "ajuste", quantidade: 20, motivo: "Contagem" }, jardel);
  assert.equal(r.movimento.quantidade, -7);
  assert.equal(r.movimento.saldo_apos, 20);

  // Saldo negativo é permitido (venda física já aconteceu): perda de 25 (20 → -5).
  r = await db.registrarMovimentoManual(controlado, { tipo: "perda", quantidade: 25, motivo: "Roubo" }, jardel);
  assert.equal(r.movimento.saldo_apos, -5);

  // Conferência saldo × ledger: consistente.
  assert.deepEqual(await db.reconciliarEstoque(), []);

  // Primeira movimentação de produto sem controle inicia em base 0.
  r = await db.registrarMovimentoManual(livre, { tipo: "entrada", quantidade: 10 }, jardel);
  assert.equal(r.movimento.saldo_apos, 10);
  assert.equal((await db.getProduto(livre)).estoque_atual, 10);

  // Paginação/ordenação do histórico: mais recente primeiro, limite respeitado.
  const recentes = await db.getMovimentosEstoque({ limite: 3 });
  assert.equal(recentes.length, 3);
  for (let i = 1; i < recentes.length; i++) assert.ok(recentes[i - 1].em >= recentes[i].em);

  // Exclusão de orçamento pendente NÃO mexe no estoque.
  const pendente = await db.createPedido({ itens: [{ produto_id: controlado, produto_nome: "Produto p1", modo: "pacote", pack_quantidade: 6, quantidade: 1, preco_unitario: 60 }] });
  const saldoAntes = (await db.getProduto(controlado)).estoque_atual;
  await db.excluirPedido(pendente.id);
  assert.equal((await db.getProduto(controlado)).estoque_atual, saldoAntes);

  // Snapshot completo inclui a coleção de movimentos.
  const snapshot = await db.lerBancoCompleto();
  assert.ok(snapshot.registros.some(reg => reg.colecao === "estoque_movimentos"));
}

async function modoLocal() {
  const root = process.cwd();
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "oca-estq-"));
  try {
    process.chdir(temp);
    await fs.mkdir("data");
    await fs.writeFile("data/categorias.json", "[]");
    const db = criarLoader(root, { "./postgres": { usarPostgres: () => false } })("src/lib/db.ts");
    await exercitar(db, { modo: "local" });
    // Persistência: arquivo do ledger existe e recarrega.
    const ledger = JSON.parse(await fs.readFile("data/estoque_movimentos.json", "utf8"));
    assert.ok(ledger.length >= 8);
    // Concorrência: duas entradas simultâneas somam corretamente (writeChain).
    const [a, b] = await Promise.all([
      db.registrarMovimentoManual("p1", { tipo: "entrada", quantidade: 1 }, jardel),
      db.registrarMovimentoManual("p1", { tipo: "entrada", quantidade: 1 }, jardel),
    ]);
    assert.equal(new Set([a.movimento.saldo_apos, b.movimento.saldo_apos]).size, 2);
    assert.deepEqual(await db.reconciliarEstoque(), []);
  } finally {
    process.chdir(root);
    await fs.rm(temp, { recursive: true, force: true });
  }
}

async function modoPostgres() {
  const { PGlite } = require("@electric-sql/pglite");
  const { schema } = await import("./database-schema.mjs");
  const pg = new PGlite();
  const previous = process.env.DATABASE_URL;
  process.env.DATABASE_URL = "postgres://test-only";
  try {
    for (const query of schema) await pg.exec(query);
    const store = criarLoader(process.cwd(), {
      "@neondatabase/serverless": { neon: () => ({ query: async (query, params) => (await pg.query(query, params)).rows }) },
    })("src/lib/postgres.ts");
    const db = criarLoader(process.cwd(), { "./postgres": store })("src/lib/db.ts");
    await exercitar(db, { modo: "postgres" });
    // Concorrência real entre "instâncias": duas entradas manuais simultâneas.
    const [p1] = await db.getProdutos();
    const resultados = await Promise.all(Array.from({ length: 5 }, () =>
      db.registrarMovimentoManual(p1.id, { tipo: "entrada", quantidade: 1 }, jardel)));
    const saldos = resultados.map(r => r.movimento.saldo_apos);
    assert.equal(new Set(saldos).size, 5);
    assert.deepEqual(await db.reconciliarEstoque(), []);
  } finally {
    await pg.close();
    if (previous === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = previous;
  }
}

async function main() {
  // Helpers puros.
  const { unidadesDoItem, deltasDeEdicao, validarMovimentoManual, consolidarSaldos, situacaoDoSaldo } = criarLoader(process.cwd())("src/lib/estoque.ts");
  assert.equal(unidadesDoItem({ modo: "pacote", quantidade: 3, pack_quantidade: 12 }), 36);
  assert.equal(unidadesDoItem({ modo: "unidade", quantidade: 5 }), 5);
  const itemA = { id: "a", produto_id: "p", modo: "pacote", quantidade: 2, pack_quantidade: 6 };
  const deltas = deltasDeEdicao([itemA], [{ ...itemA, quantidade: 3 }]);
  assert.deepEqual(deltas.map(d => d.delta), [-6]);
  assert.deepEqual(deltasDeEdicao([itemA], []).map(d => d.delta), [12]);
  assert.equal(validarMovimentoManual({ tipo: "entrada", quantidade: 2, modo: "pacote" }, 6).unidades, 12);
  assert.equal(situacaoDoSaldo(null), "nao-controlado");
  assert.equal(situacaoDoSaldo(-1), "negativo");
  assert.equal(situacaoDoSaldo(0), "zerado");
  assert.equal(situacaoDoSaldo(6), "baixo");
  assert.equal(situacaoDoSaldo(7), "ok");
  const [consolidado] = consolidarSaldos([produtoBase("x", { estoque_atual: 25 })]);
  assert.equal(consolidado.pacotes, 4);

  await modoLocal();
  console.log("OK local: entradas, perdas, ajuste, baixa na venda, estorno, delta de edição, negativo, conferência, concorrência.");
  await modoPostgres();
  console.log("OK postgres: mesmos fluxos com SQL atômico, retry e conferência saldo × ledger.");
}

main().catch(error => { console.error(error); process.exitCode = 1; });
