const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

async function main() {
  const jose = await import("jose");
  const anteriores = { segredo: process.env.AUTH_SECRET, database: process.env.DATABASE_URL, vercel: process.env.VERCEL };
  process.env.AUTH_SECRET = "chave-de-teste-exclusiva-com-mais-de-32-caracteres";
  delete process.env.DATABASE_URL; delete process.env.VERCEL;
  function load(file, mocks = {}) {
    const filename = path.resolve(file);
    const mod = new Module(filename, module); mod.filename = filename; mod.paths = module.paths;
    mod.require = name => Object.hasOwn(mocks, name) ? mocks[name] : name.startsWith("jose/") ? jose : name.startsWith(".") ? load(path.resolve(path.dirname(filename), name + ".ts"), mocks) : require(name);
    mod._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, filename);
    return mod.exports;
  }
  try {
    const auth = load("src/lib/auth.ts");
    const { USUARIOS } = load("src/lib/usuarios.ts");
    const agora = new Date("2026-10-25T12:00:00Z");
    for (const usuario of USUARIOS) {
      const token = await auth.criarSessao(usuario, true, agora);
      assert.deepEqual((await auth.validarSessao(token, agora)).usuario, usuario);
      assert.equal(await auth.validarSessao(token + "adulterado", agora), null);
      assert.ok(await auth.validarSessao(token, new Date(agora.getTime() + 29 * 86400000)));
      assert.equal(await auth.validarSessao(token, new Date(agora.getTime() + 30 * 86400000)), null);
    }
    const temporario = await auth.criarSessao(USUARIOS[0], false, agora);
    assert.equal(await auth.validarSessao(temporario, new Date(agora.getTime() + 12 * 3600000)), null);
    assert.equal(await auth.validarSessao(undefined), null);
    const chave = new TextEncoder().encode(process.env.AUTH_SECRET);
    const invalido = await new jose.SignJWT({ manter: true }).setProtectedHeader({ alg: "HS256" }).setSubject("intruso").setIssuer("sistema-oca").setAudience("oca-usuarios").setIssuedAt().setExpirationTime("1h").sign(chave);
    assert.equal(await auth.validarSessao(invalido), null);
    process.env.AUTH_SECRET = "outra-chave-de-teste-com-mais-de-32-caracteres";
    assert.equal(await auth.validarSessao(temporario, agora), null);
    delete process.env.AUTH_SECRET;
    await assert.rejects(() => auth.criarSessao(USUARIOS[0], true));
    assert.equal(await auth.validarSessao(temporario), null);
    for (const destino of ["https://externo.com", "//externo.com", "/\\externo.com", "/\t/externo.com", "/", "/api/pedidos"]) assert.equal(auth.destinoSeguro(destino), "/home");
    assert.equal(auth.destinoSeguro("/orcamentos?dia=2026-10-25"), "/orcamentos?dia=2026-10-25");
    assert.equal(auth.origemPermitida(new Headers({ host: "oca.local", origin: "https://externo.com" })), false);
    assert.equal(auth.origemPermitida(new Headers({ host: "oca.local", origin: "https://oca.local" })), true);
    const login = load("src/lib/login-servidor.ts");
    assert.equal(login.conferirSenha("1012"), true);
    for (const senha of ["1013", "", 1012, null]) assert.equal(login.conferirSenha(senha), false);
    let limite;
    for (let i = 0; i < 10; i++) assert.equal((limite = await login.limitarLogin("teste-local")).permitido, true);
    assert.equal((await login.limitarLogin("teste-local")).permitido, false);
    await login.limparTentativas(limite.chave);
    assert.equal((await login.limitarLogin("teste-local")).permitido, true);
    let recebido;
    let negado = false;
    const api = load("src/app/api/pedidos/route.ts", {
      "@/lib/auth-servidor": { verificarAcessoApi: async () => negado ? new Response("{}", { status: 401 }) : null, obterSessao: async () => ({ usuario: USUARIOS[0] }) },
      "@/lib/db": { createPedido: async body => { recebido = body; return { id: "teste", ...body }; }, getPedidos: async () => [] },
      "@/lib/revalidarHistorico": { revalidarHistorico() {} },
    });
    const req = new Request("http://oca.local/api/pedidos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ criado_por: USUARIOS[2], itens: [{ produto_id: "p", produto_nome: "Produto", quantidade: 1, pack_quantidade: 1, preco_unitario: 10 }] }) });
    assert.equal((await api.POST(req)).status, 201);
    assert.deepEqual(recebido.criado_por, USUARIOS[0]);
    negado = true;
    assert.equal((await api.GET()).status, 401);
    console.log("OK: quatro usuários, senha, assinatura, expiração, destinos seguros, limite de tentativas e responsável obtido da sessão.");
  } finally {
    for (const [nome, valor] of [["AUTH_SECRET", anteriores.segredo], ["DATABASE_URL", anteriores.database], ["VERCEL", anteriores.vercel]]) {
      if (valor === undefined) delete process.env[nome]; else process.env[nome] = valor;
    }
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
