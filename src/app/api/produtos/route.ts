import { NextRequest, NextResponse } from "next/server";
import { getProdutos, criarProduto } from "@/lib/db";
import { validarProduto } from "@/lib/validarProduto";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let input;
  try { input = await validarProduto(await req.json()); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Dados inválidos." }, { status: 400 }); }
  try {
    const produto = await criarProduto({ ...input, categoria_id: input.categoria_id ?? "" });
    revalidatePath("/produtos");
    revalidatePath("/categorias");
    revalidatePath("/gerenciar-produtos");
    return NextResponse.json(produto, { status: 201 });
  } catch { return NextResponse.json({ error: "Não foi possível salvar o produto." }, { status: 500 }); }
}

export async function GET() {
  const prods = await getProdutos();
  return NextResponse.json(prods);
}
