import { NextRequest, NextResponse } from "next/server";
import { getPedido, updatePedidoStatus, deletePedido } from "@/lib/db";
import { estaAutenticado } from "@/lib/auth";
import type { PedidoStatus } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

const STATUS_VALIDOS: PedidoStatus[] = [
  "novo",
  "em_separacao",
  "concluido",
  "cancelado",
];

// Leitura de um pedido — pública (recibo acessado por id/UUID).
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

// Alteração de status — somente administrador.
export async function PATCH(req: NextRequest, { params }: Params) {
  if (!(await estaAutenticado())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const status = body?.status as PedidoStatus;
  if (!STATUS_VALIDOS.includes(status)) {
    return NextResponse.json({ error: "Status inválido" }, { status: 400 });
  }
  const pedido = await updatePedidoStatus(id, status);
  if (!pedido) {
    return NextResponse.json(
      { error: "Pedido não encontrado" },
      { status: 404 }
    );
  }
  return NextResponse.json(pedido);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  if (!(await estaAutenticado())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const ok = await deletePedido(id);
  if (!ok) {
    return NextResponse.json(
      { error: "Pedido não encontrado" },
      { status: 404 }
    );
  }
  return NextResponse.json({ ok: true });
}
