import { NextRequest, NextResponse } from "next/server";
import { buscarUsuario } from "@/lib/usuarios";
import { conferirSenha, limitarLogin, limparTentativas } from "@/lib/login-servidor";
import { criarSessao, COOKIE_SESSAO, DURACAO_PERSISTENTE, destinoSeguro, origemPermitida } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!origemPermitida(req.headers)) return NextResponse.json({ error: "Origem não permitida." }, { status: 403 });
  const body = await req.json().catch(() => null);
  try {
    const limite = await limitarLogin(req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local");
    if (!limite.permitido) return NextResponse.json({ error: "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente." }, { status: 429, headers: { "Retry-After": String(limite.espera) } });
    const usuario = buscarUsuario(body?.usuario);
    if (!usuario || !conferirSenha(body?.senha)) return NextResponse.json({ error: "Usuário ou senha incorretos." }, { status: 401 });
    const manter = body?.manter === true;
    const token = await criarSessao(usuario, manter);
    await limparTentativas(limite.chave);
    const resposta = NextResponse.json({ destino: destinoSeguro(body?.proxima) });
    resposta.cookies.set(COOKIE_SESSAO, token, {
      httpOnly: true, secure: req.nextUrl.protocol === "https:", sameSite: "lax", path: "/",
      ...(manter ? { maxAge: DURACAO_PERSISTENTE } : {}),
    });
    resposta.headers.set("Cache-Control", "no-store");
    return resposta;
  } catch {
    return NextResponse.json({ error: "Não foi possível iniciar a sessão. Confira a configuração AUTH_SECRET e a conexão do servidor." }, { status: 503 });
  }
}
