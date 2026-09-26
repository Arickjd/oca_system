import { NextRequest, NextResponse } from "next/server";
import { getPedidos, createPedido, type NovoItem } from "@/lib/db";
import { estaAutenticado } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Lista de pedidos — somente administrador.
export async function GET() {
  if (!(await estaAutenticado())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const pedidos = await getPedidos();
  return NextResponse.json(pedidos);
}

// Criação de pedido — pública (finalização do carrinho).
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const itensRaw = Array.isArray(body?.itens) ? body.itens : [];

  const itens: NovoItem[] = itensRaw
    .map((it: Record<string, unknown>) => ({
      produto_id: String(it?.produto_id ?? ""),
      produto_nome: String(it?.produto_nome ?? "Produto"),
      modo: it?.modo === "pacote" ? "pacote" : "unidade",
      quantidade: Math.max(1, Number(it?.quantidade) || 1),
      preco_unitario: Number(it?.preco_unitario) || 0,
    }))
    .filter((it: NovoItem) => it.preco_unitario >= 0);

  if (itens.length === 0) {
    return NextResponse.json(
      { error: "O pedido precisa ter pelo menos um item." },
      { status: 400 }
    );
  }

  const pedido = await createPedido({
    cliente_nome: body?.cliente_nome,
    telefone: body?.telefone,
    observacao: body?.observacao,
    itens,
  });

  return NextResponse.json(pedido, { status: 201 });
}
