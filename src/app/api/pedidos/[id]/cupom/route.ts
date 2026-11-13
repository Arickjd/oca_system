import { verificarAcessoApi } from "@/lib/auth-servidor";
import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getPedido } from "@/lib/db";
import { getConfig } from "@/lib/config";
import { gerarCupomPdf } from "@/lib/cupomPdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const negado = await verificarAcessoApi(); if (negado) return negado;
  try {
    const { id } = await params;
    const pedido = await getPedido(id);
    if (!pedido) return NextResponse.json({ error: "Orçamento não encontrado." }, { status: 404 });
    const pendente = pedido.status_pagamento !== "finalizado";
    const [config, logo, qrCode] = await Promise.all([
      getConfig(),
      readFile(path.join(process.cwd(), "public", "logo.png")).catch(() => null),
      pendente ? readFile(path.join(process.cwd(), "public", "pix", "qrcode_pix.png")).catch(() => null) : Promise.resolve(null),
    ]);
    const pdf = gerarCupomPdf(pedido, config, logo, qrCode);
    return new Response(pdf, { headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="cupom-${pedido.numero}.pdf"`,
      "Cache-Control": "private, no-store",
    } });
  } catch {
    return NextResponse.json({ error: "Não foi possível gerar o cupom. Tente novamente." }, { status: 500 });
  }
}
