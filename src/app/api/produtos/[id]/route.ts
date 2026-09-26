import { NextRequest, NextResponse } from "next/server";
import { updateProduto, deleteProduto, getProduto } from "@/lib/db";
import { estaAutenticado } from "@/lib/auth";
import type { Produto } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const produto = await getProduto(id);
  if (!produto) {
    return NextResponse.json(
      { error: "Produto não encontrado" },
      { status: 404 }
    );
  }
  return NextResponse.json(produto);
}

export async function PUT(req: NextRequest, { params }: Params) {
  if (!(await estaAutenticado())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const patch: Partial<Produto> = {};
  if (typeof body?.nome === "string") patch.nome = body.nome.trim();
  if (typeof body?.codigo === "string") patch.codigo = body.codigo.trim();
  if (typeof body?.descricao === "string") patch.descricao = body.descricao;
  if (body?.preco !== undefined) patch.preco = Number(body.preco) || 0;
  if (body?.preco_pack !== undefined)
    patch.preco_pack = Number(body.preco_pack) || 0;
  if (body?.pack_quantidade !== undefined)
    patch.pack_quantidade = Number(body.pack_quantidade) || 1;
  if (typeof body?.unidade === "string") patch.unidade = body.unidade;
  if (typeof body?.imagem_url === "string") patch.imagem_url = body.imagem_url;
  if (typeof body?.categoria_id === "string")
    patch.categoria_id = body.categoria_id;
  if (typeof body?.ativo === "boolean") patch.ativo = body.ativo;

  const produto = await updateProduto(id, patch);
  if (!produto) {
    return NextResponse.json(
      { error: "Produto não encontrado" },
      { status: 404 }
    );
  }
  return NextResponse.json(produto);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  if (!(await estaAutenticado())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const ok = await deleteProduto(id);
  if (!ok) {
    return NextResponse.json(
      { error: "Produto não encontrado" },
      { status: 404 }
    );
  }
  return NextResponse.json({ ok: true });
}
