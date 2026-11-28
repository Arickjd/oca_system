const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { criarLoader } = require("./load-ts.cjs");

async function main() {
  const root = process.cwd();
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "oca-clientes-"));
  try {
    process.chdir(temp);
    await fs.mkdir("data");
    await fs.writeFile("data/produtos.json", "[]");
    const carregar = criarLoader(root, { "./postgres": { usarPostgres: () => false } });
    const db = carregar("src/lib/db.ts");
    const { clienteCombina } = carregar("src/lib/clientes.ts");

    const mercado = await db.criarCliente({
      nome: "Mercado São João", telefone: "(89) 99999-0000",
      documento: "12.345.678/0001-90", observacao: "Entrega pela manhã",
    });
    assert.ok(mercado.id);
    assert.equal(mercado.nome, "Mercado São João");
    assert.equal((await db.getClientes()).length, 1);
    assert.equal((await db.getCliente(mercado.id)).telefone, "(89) 99999-0000");
    assert.equal(await db.getCliente("nao-existe"), undefined);

    assert.ok(clienteCombina(mercado, "sao joao"), "busca sem acento pelo nome");
    assert.ok(clienteCombina(mercado, "mercado 9999"), "busca por nome e telefone");
    assert.ok(clienteCombina(mercado, "12345"), "busca por documento");
    assert.ok(!clienteCombina(mercado, "padaria"), "não encontra outro nome");

    const atualizado = await db.atualizarCliente(mercado.id, {
      nome: "Mercado São João", telefone: "(89) 98888-1111",
      documento: mercado.documento, observacao: "Entregar após as 10h",
    });
    assert.equal(atualizado.telefone, "(89) 98888-1111");
    assert.equal((await db.getCliente(mercado.id)).observacao, "Entregar após as 10h");
    assert.equal(await db.atualizarCliente("nao-existe", {
      nome: "X", telefone: "", documento: "", observacao: "",
    }), undefined);

    const item = { produto_id: "p1", produto_nome: "Produto", modo: "pacote", pack_quantidade: 6, quantidade: 1, preco_unitario: 60 };
    const comCliente = await db.createPedido({ cliente_id: mercado.id, cliente_nome: mercado.nome, telefone: mercado.telefone, itens: [item] });
    assert.equal(comCliente.cliente_id, mercado.id);
    assert.equal(comCliente.cliente_nome, mercado.nome);

    const generico = await db.createPedido({ cliente_nome: "Cliente de passagem", itens: [item] });
    assert.equal(generico.cliente_id, undefined);

    const pedidos = await db.getPedidos();
    assert.equal(pedidos.filter(p => p.cliente_id === mercado.id).length, 1);
    assert.equal(pedidos.filter(p => !p.cliente_id).length, 1);

    const snapshot = await db.lerBancoCompleto();
    assert.ok(snapshot.registros.some(r => r.colecao === "clientes" && r.id === mercado.id));

    const arquivo = JSON.parse(await fs.readFile("data/clientes.json", "utf8"));
    assert.equal(arquivo.length, 1);
    assert.equal(arquivo[0].nome, "Mercado São João");
    console.log("OK: clientes cadastram, atualizam, buscam sem acento e vinculam orçamentos; vendas avulsas ficam sem vínculo.");
  } finally {
    process.chdir(root);
    await fs.rm(temp, { recursive: true, force: true });
  }
}

main().catch(error => { console.error(error); process.exit(1); });
