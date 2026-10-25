import { verificarAcessoApi } from "@/lib/auth-servidor";
import { NextResponse } from "next/server";
import { getConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET() {
  const negado = await verificarAcessoApi(); if (negado) return negado;
  const cfg = await getConfig();
  return NextResponse.json(cfg);
}
