import { NextRequest, NextResponse } from "next/server";
import { updateCategoria, deleteCategoria } from "@/lib/db";
import { estaAutenticado } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  if (!(await estaAutenticado())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};
  if (typeof body?.nome === "string") patch.nome = body.nome.trim();
  if (typeof body?.ativo === "boolean") patch.ativo = body.ativo;
  const cat = await updateCategoria(id, patch);
  if (!cat) {
    return NextResponse.json(
      { error: "Categoria não encontrada" },
      { status: 404 }
    );
  }
  return NextResponse.json(cat);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  if (!(await estaAutenticado())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const ok = await deleteCategoria(id);
  if (!ok) {
    return NextResponse.json(
      { error: "Categoria não encontrada" },
      { status: 404 }
    );
  }
  return NextResponse.json({ ok: true });
}
