import { verificarAcessoApi } from "@/lib/auth-servidor";
import { NextRequest, NextResponse } from "next/server";
import { getProduto, atualizarProduto, excluirProduto } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { validarProduto } from "@/lib/validarProduto";

type Params = { params: Promise<{ id: string }> };

// O carrinho atualiza somente nome e apresentação; preço é negociado por venda.
export async function PATCH(req: NextRequest, { params }: Params) {
  const negado = await verificarAcessoApi(); if (negado) return negado;
  const { id } = await params;
  let patch;
  try {
    const body = await req.json();
    const validado = await validarProduto({ nome: body?.nome, pack_quantidade: body?.pack_quantidade, preco_pack: 0 });
    patch = { nome: validado.nome, pack_quantidade: validado.pack_quantidade };
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Dados inválidos." }, { status: 400 });
  }
  try {
    const produto = await atualizarProduto(id, patch);
    if (!produto) return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
    revalidatePath("/produtos");
    revalidatePath("/categorias");
    revalidatePath("/gerenciar-produtos");
    return NextResponse.json(produto);
  } catch {
    return NextResponse.json({ error: "Não foi possível salvar o catálogo. Tente novamente." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const negado = await verificarAcessoApi(); if (negado) return negado;
  const { id } = await params;
  try {
    if (!await excluirProduto(id)) return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
    revalidatePath("/", "layout");
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Não foi possível excluir o produto. Tente novamente." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  const negado = await verificarAcessoApi(); if (negado) return negado;
  const { id } = await params;
  let patch;
  try { patch = await validarProduto(await req.json()); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Dados inválidos." }, { status: 400 }); }
  try {
    const produto = await atualizarProduto(id, patch);
    if (!produto) return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
    revalidatePath("/produtos");
    revalidatePath("/categorias");
    revalidatePath("/gerenciar-produtos");
    return NextResponse.json(produto);
  } catch {
    return NextResponse.json({ error: "Não foi possível salvar o catálogo. Tente novamente." }, { status: 500 });
  }
}

export async function GET(_req: NextRequest, { params }: Params) {
  const negado = await verificarAcessoApi(); if (negado) return negado;
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
