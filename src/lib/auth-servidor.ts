import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { COOKIE_SESSAO, validarSessao, origemPermitida } from "./auth";

export async function obterSessao() {
  return validarSessao((await cookies()).get(COOKIE_SESSAO)?.value);
}

export async function exigirSessao() {
  const sessao = await obterSessao();
  if (!sessao) redirect("/");
  return sessao;
}

export async function verificarAcessoApi() {
  if (!origemPermitida(await headers())) return NextResponse.json({ error: "Origem da solicitação não permitida." }, { status: 403 });
  if (!await obterSessao()) return NextResponse.json({ error: "Sua sessão expirou. Entre novamente." }, { status: 401 });
  return null;
}
