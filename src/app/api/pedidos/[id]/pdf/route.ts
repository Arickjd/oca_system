import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getPedido } from "@/lib/db";
import { getConfig } from "@/lib/config";
import { gerarOrcamentoPdf } from "@/lib/orcamentoPdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const pedido = await getPedido(id);
    if (!pedido) return NextResponse.json({ error: "Orçamento não encontrado." }, { status: 404 });
    const [config, logo] = await Promise.all([getConfig(), readFile(path.join(process.cwd(), "public", "logo.png"))]);
    const pdf = gerarOrcamentoPdf(pedido, config, logo);
    return new Response(pdf, { headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="orcamento-' + pedido.numero + '.pdf"',
      "Cache-Control": "private, no-store",
    } });
  } catch {
    return NextResponse.json({ error: "Não foi possível gerar o PDF. Tente novamente." }, { status: 500 });
  }
}
