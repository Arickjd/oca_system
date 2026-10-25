import { NextResponse } from "next/server";
import { obterSessao, verificarAcessoApi } from "@/lib/auth-servidor";
import { lerBancoCompleto } from "@/lib/db";
import { gerarBancoXlsx } from "@/lib/exportarBancoXlsx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const negado = await verificarAcessoApi(); if (negado) return negado;
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Entre novamente para exportar o banco." }, { status: 401 });
  try {
    const snapshot = await lerBancoCompleto();
    const arquivo = await gerarBancoXlsx(snapshot, sessao.usuario.nome);
    const data = new Date(snapshot.gerado_em).toISOString().replace(/[:.]/g, "-");
    return new Response(arquivo, { headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="oca-banco-${data}.xlsx"`,
      "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
    } });
  } catch {
    return NextResponse.json({ error: "Não foi possível exportar o banco. Tente novamente." }, { status: 500 });
  }
}
