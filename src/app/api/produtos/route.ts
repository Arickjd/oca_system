import { NextRequest, NextResponse } from "next/server";
import { getProdutos, createProduto } from "@/lib/db";
import { estaAutenticado } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const prods = await getProdutos();
  return NextResponse.json(prods);
}

export async function POST(req: NextRequest) {
  if (!(await estaAutenticado())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const nome = String(body?.nome ?? "").trim();
  if (!nome) {
    return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
  }
  const produto = await createProduto({
    nome,
    codigo: body?.codigo,
    descricao: body?.descricao,
    preco: body?.preco,
    preco_pack: body?.preco_pack,
    pack_quantidade: body?.pack_quantidade,
    unidade: body?.unidade,
    imagem_url: body?.imagem_url,
    categoria_id: body?.categoria_id,
    ativo: body?.ativo,
  });
  return NextResponse.json(produto, { status: 201 });
}
