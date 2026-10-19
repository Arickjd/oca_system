import { NextRequest, NextResponse } from "next/server";
import { getPedidos, createPedido, type NovoItem } from "@/lib/db";

export const dynamic = "force-dynamic";

// O sistema possui um único usuário: o dono da distribuidora.
export async function GET() {
  const pedidos = await getPedidos();
  return NextResponse.json(pedidos);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const itensRaw = Array.isArray(body?.itens) ? body.itens : [];

  if (["cliente_nome", "telefone", "observacao"].some(key => body?.[key] !== undefined && typeof body[key] !== "string") ||
      itensRaw.some((it: Record<string, unknown>) => !it ||
        typeof it.produto_id !== "string" || !it.produto_id.trim() ||
        typeof it.produto_nome !== "string" || !it.produto_nome.trim() ||
        typeof it.quantidade !== "number" || !Number.isSafeInteger(it.quantidade) || it.quantidade < 1 ||
        typeof it.pack_quantidade !== "number" || !Number.isSafeInteger(it.pack_quantidade) || it.pack_quantidade < 1 ||
        typeof it.preco_unitario !== "number" || !Number.isFinite(it.preco_unitario) || it.preco_unitario < 0 ||
        !Number.isSafeInteger(Math.round(it.preco_unitario * it.quantidade * 100)))) {
    return NextResponse.json({ error: "Revise os itens: nome obrigatório, preço válido e quantidades inteiras positivas." }, { status: 400 });
  }

  const itens: NovoItem[] = itensRaw
    .map((it: Record<string, unknown>) => ({
      produto_id: String(it?.produto_id ?? ""),
      produto_nome: String(it?.produto_nome ?? "Produto"),
      modo: "pacote" as const,
      pack_quantidade: Math.max(
        1,
        Math.trunc(Number(it?.pack_quantidade) || 1)
      ),
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

  try {
  const pedido = await createPedido({
    cliente_nome: body?.cliente_nome,
    telefone: body?.telefone,
    observacao: body?.observacao,
    itens,
  });

  return NextResponse.json(pedido, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Não foi possível registrar o orçamento. Tente novamente." }, { status: 500 });
  }
}
