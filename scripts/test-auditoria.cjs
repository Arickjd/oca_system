const assert = require("node:assert/strict");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { criarLoader } = require("./load-ts.cjs");

const root = process.cwd();

function load(file) {
  const filename = path.resolve(file);
  const mod = new Module(filename, module); mod.filename = filename; mod.paths = module.paths;
  mod.require = name => name.endsWith(".css") ? new Proxy({}, { get: (_, key) => key === "__esModule" ? false : String(key) })
    : name.startsWith("@/") ? load(path.resolve("src", name.slice(2)) + (name.endsWith(".css") ? "" : ".ts"))
    : name.startsWith(".") ? load(path.resolve(path.dirname(filename), name + ".ts")) : require(name);
  mod._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText, filename);
  return mod.exports;
}

const { AuditoriaLog } = load("src/components/AuditoriaLog.tsx");
const eventos = [
  { id: "e2", em: "2026-11-16T18:05:00Z", usuario: { id: "jairo", nome: "Jairo" }, acao: "pagamento.parcial", titulo: "Recebimento parcial", alvo: "Mercado X #12", resumo: "R$ 50,00 via Pix · falta R$ 230,00", detalhes: [{ rotulo: "Cliente", valor: "Mercado X" }, { rotulo: "Valor recebido", valor: "R$ 50,00" }] },
  { id: "e1", em: "2026-11-16T17:00:00Z", usuario: { id: "jardel", nome: "Jardel" }, acao: "pedido.criado", titulo: "Orçamento criado", alvo: "Padaria Y #13", detalhes: [{ rotulo: "Total", valor: "R$ 280,00" }] },
];
const html = renderToStaticMarkup(React.createElement(AuditoriaLog, { eventos }));
for (const texto of ["Registro de atividades", "mais recentes primeiro", "Recebimento parcial - Mercado X #12", "Orçamento criado - Padaria Y #13", "Jairo", "16/11/2026", "15:05", "<details", "<summary", "Valor recebido", "50,00"]) assert.ok(html.includes(texto), texto);
assert.ok(html.indexOf("Mercado X") < html.indexOf("Padaria Y"), "mais recente primeiro");
assert.ok(html.includes('<span class="block text-sm font-semibold text-slate-900">Recebimento parcial - Mercado X #12</span>'), "operação, cliente e número no título");
const vazio = renderToStaticMarkup(React.createElement(AuditoriaLog, { eventos: [] }));
assert.ok(vazio.includes("Nenhuma ação registrada"));
console.log("ok componente");

(async () => {
  const temp = await fsp.mkdtemp(path.join(os.tmpdir(), "oca-aud-"));
  try {
    process.chdir(temp);
    await fsp.mkdir("data");
    await fsp.writeFile("data/produtos.json", "[]");
    const carregar = criarLoader(root, { "./postgres": { usarPostgres: () => false } });
    const db = carregar("src/lib/db.ts");

    await db.registrarAuditoria({ usuario: { id: "jairo", nome: "Jairo" }, acao: "pedido.criado", titulo: "Orçamento criado", alvo: "Orçamento #1", detalhes: [{ rotulo: "Total", valor: "R$ 10,00" }] });
    await new Promise(resolve => setTimeout(resolve, 5));
    await db.registrarAuditoria({ usuario: { id: "gisele", nome: "Gisele" }, acao: "produto.criado", titulo: "Produto criado", alvo: "Coca 2L", detalhes: [{ rotulo: "Preço", valor: "R$ 9,99" }] });
    await new Promise(resolve => setTimeout(resolve, 5));
    await db.registrarAuditoria({ usuario: { id: "jardel", nome: "Jardel" }, acao: "pagamento.parcial", titulo: "Recebimento parcial", alvo: "Orçamento #1", detalhes: [{ rotulo: "Valor recebido", valor: "R$ 4,00" }] });

    const lista = await db.getAuditoria(10);
    assert.equal(lista.length, 3);
    assert.equal(lista[0].acao, "pagamento.parcial");
    assert.equal(lista[2].acao, "pedido.criado");
    assert.ok(lista[0].em > lista[1].em && lista[1].em > lista[2].em);
    assert.deepEqual(lista[2].detalhes[0], { rotulo: "Total", valor: "R$ 10,00" });
    assert.equal(lista[1].usuario.nome, "Gisele");
    const dois = await db.getAuditoria(2);
    assert.equal(dois.length, 2);
    assert.equal(dois[0].acao, "pagamento.parcial");

    const bruto = JSON.parse(await fsp.readFile("data/auditoria.json", "utf8"));
    assert.equal(bruto.length, 3);
    assert.ok(bruto.every(evento => evento.id && evento.em && evento.titulo && evento.alvo));
  } finally {
    process.chdir(root);
    await fsp.rm(temp, { recursive: true, force: true });
  }
  console.log("OK: auditoria registra, ordena, limita, persiste e mostra detalhes ao expandir.");
})().catch(error => { console.error(error); process.exit(1); });
