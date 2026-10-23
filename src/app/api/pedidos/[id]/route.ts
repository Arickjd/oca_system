import { NextRequest, NextResponse } from "next/server";
import { getPedido, excluirPedido, finalizarPagamento, editarPedido, EdicaoInvalida } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { FormaPagamento } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const pedido = await editarPedido(id, await req.json().catch(() => null));
    if (!pedido) return NextResponse.json({ error: "O orçamento foi alterado, efetivado ou excluído. Recarregue a página antes de continuar." }, { status: 409 });
    revalidatePath("/orcamentos");
    revalidatePath(`/orcamento/${id}`);
    revalidatePath(`/orcamento/${id}/editar`);
    return NextResponse.json({ id: pedido.id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof EdicaoInvalida ? error.message : "Não foi possível salvar o orçamento. Tente novamente." }, { status: error instanceof EdicaoInvalida ? 400 : 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body || !["pix", "cartao", "dinheiro"].includes(body.forma_pagamento)) {
    return NextResponse.json({ error: "Selecione Pix, cartão ou dinheiro." }, { status: 400 });
  }
  if (!Number.isSafeInteger(body.revisao) || body.revisao < 0) return NextResponse.json({ error: "Atualize a página antes de confirmar o pagamento." }, { status: 400 });
  try {
    const pedido = await finalizarPagamento(id, body.forma_pagamento as FormaPagamento, body.revisao);
    if (!pedido) {
      const existe = await getPedido(id);
      return NextResponse.json({ error: existe ? "Este orçamento foi alterado ou já foi finalizado. Atualize a página e confira o valor." : "Orçamento não encontrado." }, { status: existe ? 409 : 404 });
    }
    revalidatePath("/orcamentos");
    revalidatePath(`/orcamento/${id}`);
    return NextResponse.json({ status_pagamento: pedido.status_pagamento, forma_pagamento: pedido.forma_pagamento });
  } catch {
    return NextResponse.json({ error: "Não foi possível finalizar o pagamento. Tente novamente." }, { status: 500 });
  }
}

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
