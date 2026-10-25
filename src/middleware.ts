import { NextRequest, NextResponse } from "next/server";
import { COOKIE_SESSAO, validarSessao, origemPermitida } from "./lib/auth";

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (path.startsWith("/api/") && !["GET", "HEAD", "OPTIONS"].includes(req.method) && !origemPermitida(req.headers)) {
    return NextResponse.json({ error: "Origem da solicitação não permitida." }, { status: 403 });
  }
  const publico = path === "/" || path === "/api/auth/login" || path === "/api/auth/logout";
  if (!publico && !await validarSessao(req.cookies.get(COOKIE_SESSAO)?.value)) {
    if (path.startsWith("/api/")) return NextResponse.json({ error: "Entre para acessar o sistema." }, { status: 401, headers: { "Cache-Control": "no-store" } });
    const url = new URL("/", req.url);
    url.searchParams.set("proxima", path + req.nextUrl.search);
    return NextResponse.redirect(url);
  }
  const resposta = NextResponse.next();
  resposta.headers.set("Cache-Control", "private, no-store");
  return resposta;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.png|icons/|manifest.webmanifest).*)"],
};
