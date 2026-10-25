import { verificarAcessoApi } from "@/lib/auth-servidor";
import { NextRequest, NextResponse } from "next/server";
import { getPedidos } from "@/lib/db";
import { getConfig } from "@/lib/config";
import { resolverPeriodo, filtrarPeriodo } from "@/lib/periodoOrcamentos";
import { gerarRelatorioOrcamentos } from "@/lib/relatorioOrcamentosPdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const negado = await verificarAcessoApi(); if (negado) return negado;
  const query = req.nextUrl.searchParams;
  const tipo = query.get("tipo");
  if (tipo !== "resumido" && tipo !== "detalhado") return NextResponse.json({ error: "Tipo de relatório inválido." }, { status: 400 });
  let periodo;
  try { periodo = resolverPeriodo({ periodo: query.get("periodo") ?? undefined, inicio: query.get("inicio") ?? undefined, fim: query.get("fim") ?? undefined }); }
  catch { return NextResponse.json({ error: "Selecione um período válido." }, { status: 400 }); }
  try {
    const [todos, config] = await Promise.all([getPedidos(), getConfig()]);
    const pedidos = filtrarPeriodo(todos, periodo);
    const pdf = gerarRelatorioOrcamentos(pedidos, periodo, tipo, config.distribuidora_nome);
    return new Response(pdf, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="relatorio-${tipo}-${periodo.inicio}-${periodo.fim}.pdf"`, "Cache-Control": "private, no-store" } });
  } catch { return NextResponse.json({ error: "Não foi possível gerar o relatório. Tente novamente." }, { status: 500 }); }
}
