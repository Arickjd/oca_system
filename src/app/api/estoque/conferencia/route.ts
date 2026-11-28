import { obterSessao, verificarAcessoApi } from "@/lib/auth-servidor";
import { NextResponse } from "next/server";
import { reconciliarEstoque } from "@/lib/db";

export const dynamic = "force-dynamic";

// Conferência admin: saldo gravado × soma do ledger de movimentações.
export async function GET() {
  const negado = await verificarAcessoApi(); if (negado) return negado;
  const sessao = await obterSessao();
  if (sessao?.usuario.papel !== "admin") {
    return NextResponse.json({ error: "Apenas o administrador pode conferir o estoque." }, { status: 403 });
  }
  const divergencias = await reconciliarEstoque();
  return NextResponse.json({ consistente: divergencias.length === 0, divergencias });
}
