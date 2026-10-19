import { NextResponse } from "next/server";
import { getConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET() {
  const cfg = await getConfig();
  return NextResponse.json(cfg);
}
