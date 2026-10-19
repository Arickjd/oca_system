import { NextResponse } from "next/server";
import { getCategorias } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const cats = await getCategorias();
  return NextResponse.json(cats);
}
