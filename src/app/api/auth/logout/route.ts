import { NextRequest, NextResponse } from "next/server";
import { COOKIE_SESSAO, origemPermitida } from "@/lib/auth";

export async function POST(req: NextRequest) {
  if (!origemPermitida(req.headers)) return NextResponse.json({ error: "Origem não permitida." }, { status: 403 });
  const resposta = NextResponse.redirect(new URL("/", req.url), 303);
  resposta.cookies.set(COOKIE_SESSAO, "", { httpOnly: true, secure: req.nextUrl.protocol === "https:", sameSite: "lax", path: "/", maxAge: 0 });
  resposta.headers.set("Cache-Control", "no-store");
  return resposta;
}
