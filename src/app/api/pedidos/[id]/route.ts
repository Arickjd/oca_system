import { NextRequest, NextResponse } from "next/server";
import { getPedido } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const pedido = await getPedido(id);
  if (!pedido) {
    return NextResponse.json(
      { error: "Pedido não encontrado" },
      { status: 404 }
    );
  }
  return NextResponse.json(pedido);
}
