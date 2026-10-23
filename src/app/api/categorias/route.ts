import { NextResponse } from "next/server";
import { getCategorias, criarCategoria } from "@/lib/db";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let nome: string;
  try {
    const body = await req.json();
    if (typeof body?.nome !== "string") throw new Error();
    nome = body.nome.trim().replace(/\s+/g, " ");
    if (!nome || nome.length > 100) throw new Error();
  } catch {
    return NextResponse.json({ error: "Informe um nome de categoria com até 100 caracteres." }, { status: 400 });
  }
  try {
    const categoria = await criarCategoria(nome);
    revalidatePath("/gerenciar-produtos");
    revalidatePath("/categorias");
    revalidatePath("/produtos");
    return NextResponse.json(categoria, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Não foi possível salvar a categoria. Tente novamente." }, { status: 500 });
  }
}

export async function GET() {
  const cats = await getCategorias();
  return NextResponse.json(cats);
}
