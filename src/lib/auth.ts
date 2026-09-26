import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const COOKIE_NAME = "oca_admin";

function getSecret(): string {
  return process.env.AUTH_SECRET || "oca-distribuidora-secret-mvp";
}

export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD || "oca2024";
}

// Token = HMAC(secret, "admin"). Simples e suficiente para o MVP de um único dono.
export function gerarToken(): string {
  return createHmac("sha256", getSecret()).update("admin").digest("hex");
}

export function tokenValido(token: string | undefined): boolean {
  if (!token) return false;
  const esperado = gerarToken();
  const a = Buffer.from(token);
  const b = Buffer.from(esperado);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// Verifica sessão nos Server Components / rotas.
export async function estaAutenticado(): Promise<boolean> {
  const store = await cookies();
  return tokenValido(store.get(COOKIE_NAME)?.value);
}
