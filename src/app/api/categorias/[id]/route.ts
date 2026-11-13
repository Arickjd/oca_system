import { verificarAcessoApi } from "@/lib/auth-servidor";
import { NextRequest, NextResponse } from "next/server";
import { excluirCategoria, CategoriaPadrao } from "@/lib/db";
import { revalidatePath } from "next/cache";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const negado = await verificarAcessoApi(); if (negado) return negado;
  const { id } = await params;
  try {
    if (!await excluirCategoria(id)) return NextResponse.json({ error: "Categoria não encontrada." }, { status: 404 });
    for (const pagina of ["/gerenciar-produtos", "/categorias", "/produtos"]) revalidatePath(pagina);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof CategoriaPadrao) return NextResponse.json({ error: error.message }, { status: 409 });
    return NextResponse.json({ error: "Não foi possível excluir a categoria. Tente novamente." }, { status: 500 });
  }
}
