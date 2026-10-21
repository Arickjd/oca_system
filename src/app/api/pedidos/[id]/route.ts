import { NextRequest, NextResponse } from "next/server";
import { getPedido, excluirPedido } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    if (!await excluirPedido(id)) {
      return NextResponse.json({ error: "Orçamento não encontrado." }, { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Não foi possível excluir o orçamento. Tente novamente." }, { status: 500 });
  }
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const pedido = await getPedido(id);
  if (!pedido) {
    return NextResponse.json(
      { error: "Pedido não encontrado" },
      { status: 404 }
    );
  }
  // A consulta individual acompanha o documento do cliente, sem dados internos.
  const { lucro_bruto: _lucro, ...publico } = pedido;
  return NextResponse.json({ ...publico, itens: pedido.itens.map(({ custo_unitario: _custo, ...item }) => item) });
}
