import { NextRequest, NextResponse } from "next/server";
import { getConfig, saveConfig } from "@/lib/config";
import { estaAutenticado } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const cfg = await getConfig();
  return NextResponse.json(cfg);
}

export async function PUT(req: NextRequest) {
  if (!(await estaAutenticado())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};
  for (const campo of [
    "distribuidora_nome",
    "distribuidora_contato",
    "whatsapp",
    "endereco",
  ]) {
    if (typeof body?.[campo] === "string") patch[campo] = body[campo].trim();
  }
  if (body?.pack_padrao !== undefined)
    patch.pack_padrao = Number(body.pack_padrao) || 6;

  const cfg = await saveConfig(patch);
  return NextResponse.json(cfg);
}
