import assert from "node:assert/strict";

// Execute somente contra a prévia local, com DATABASE_URL e VERCEL vazias.
const base = process.argv[2] || "http://localhost:3015";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw new Error("Use somente uma prévia local.");
const request = (url, options = {}) => fetch(base + url, { redirect: "manual", ...options });
const paginas = ["/home", "/categorias", "/produtos", "/carrinho", "/checkout", "/gerenciar-produtos", "/orcamentos", "/vendas", "/relatorios", "/orcamento/inexistente", "/orcamento/inexistente/editar"];
for (const pagina of paginas) {
  const res = await request(pagina);
  assert.equal(res.status, 307, pagina);
  assert.equal(new URL(res.headers.get("location"), base).pathname, "/");
}
const apis = ["/api/config", "/api/categorias", "/api/produtos", "/api/produtos/inexistente", "/api/pedidos", "/api/pedidos/inexistente", "/api/pedidos/inexistente/pdf", "/api/orcamentos/relatorio?tipo=resumido"];
for (const api of apis) assert.equal((await request(api)).status, 401, api);
for (const [url, method] of [["/api/produtos", "POST"], ["/api/categorias", "POST"], ["/api/produtos/inexistente", "PUT"], ["/api/pedidos", "POST"], ["/api/pedidos/inexistente", "PUT"], ["/api/pedidos/inexistente", "PATCH"], ["/api/pedidos/inexistente", "DELETE"]]) {
  assert.equal((await request(url, { method })).status, 401);
}
const login = (usuario, senha, manter = false, proxima = "/home") => request("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json", Origin: base }, body: JSON.stringify({ usuario, senha, manter, proxima }) });
assert.equal((await login("jardel", "errada")).status, 401);
assert.equal((await login("intruso", "1012")).status, 401);
for (const [usuario, nome] of [["jardel", "Jardel"], ["jairo", "Jairo"], ["gisele", "Gisele"], ["keylane", "Keylane"]]) {
  const res = await login(usuario, "1012", true);
  assert.equal(res.status, 200, usuario);
  const cookie = res.headers.get("set-cookie");
  assert.match(cookie, /HttpOnly/i); assert.match(cookie, /SameSite=lax/i); assert.match(cookie, /Max-Age=2592000/i);
  const header = cookie.split(";")[0];
  const home = await request("/home", { headers: { Cookie: header } });
  assert.equal(home.status, 200);
  assert.ok((await home.text()).includes(nome));
  assert.equal((await request("/api/produtos", { headers: { Cookie: header } })).status, 200);
  assert.equal((await request("/api/produtos", { headers: { Cookie: header + "adulterado" } })).status, 401);
  const crossSite = await request("/api/pedidos", { method: "POST", headers: { Cookie: header, Origin: "https://externo.com" } });
  assert.equal(crossSite.status, 403);
  // Tenta contornar o middleware: o próprio handler também exige sessão.
  assert.equal((await request("/api/pedidos", { headers: { "x-middleware-subrequest": "middleware:middleware:middleware:middleware:middleware" } })).status, 401);
  const sair = await request("/api/auth/logout", { method: "POST", headers: { Cookie: header, Origin: base } });
  assert.equal(sair.status, 303); assert.match(sair.headers.get("set-cookie"), /Max-Age=0/i);
}
const temporaria = await login("jardel", "1012", false, "//externo.com");
assert.equal((await temporaria.json()).destino, "/home");
assert.ok(!/Max-Age|Expires/i.test(temporaria.headers.get("set-cookie")));
console.log("OK: páginas e APIs fechadas, quatro logins, cookie persistente/temporário, adulteração, origem externa e saída.");
