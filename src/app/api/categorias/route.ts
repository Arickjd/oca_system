import { NextRequest, NextResponse } from "next/server";
import { getCategorias, createCategoria } from "@/lib/db";
import { estaAutenticado } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const cats = await getCategorias();
  return NextResponse.json(cats);
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
  const cat = await createCategoria({ nome, ativo: body?.ativo ?? true });
  return NextResponse.json(cat, { status: 201 });
}
