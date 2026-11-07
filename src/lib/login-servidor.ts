import { createHash, scryptSync, timingSafeEqual } from "node:crypto";
import * as postgres from "./postgres";
import type { Usuario } from "./usuarios";

const senhaHash = Buffer.from("53041eb1433ba338a47107b752a5b781987cbd3df3f1bab072465eacfff17c10", "hex");
const senhaJardelHash = Buffer.from("c50fc20d04d13b3158a6fbbd1de27747b060e2a5c4ff979ee253e1c4545ece73", "hex");

export function conferirSenha(usuarioId: Usuario["id"], senha: unknown) {
  if (typeof senha !== "string" || senha.length > 128) return false;
  const jardel = usuarioId === "jardel";
  const sal = jardel ? "oca-login-jardel-v1" : "oca-login-v1";
  return timingSafeEqual(scryptSync(senha, sal, 32), jardel ? senhaJardelHash : senhaHash);
}

const tentativas = new Map<string, { quantidade: number; ate: number }>();
const JANELA = 15 * 60 * 1000;
const LIMITE = 10;

export async function limitarLogin(ip: string) {
  const chave = "auth-tentativas:" + createHash("sha256").update(ip).digest("hex");
  const agora = Date.now();
  if (postgres.usarPostgres()) return postgres.registrarTentativaLogin(chave, agora, JANELA, LIMITE);
  for (const [id, valor] of tentativas) if (valor.ate <= agora) tentativas.delete(id);
  const registro = tentativas.get(chave) ?? { quantidade: 0, ate: agora + JANELA };
  registro.quantidade++; tentativas.set(chave, registro);
  return { permitido: registro.quantidade <= LIMITE, espera: Math.ceil((registro.ate - agora) / 1000), chave };
}

export async function limparTentativas(chave: string) {
  if (postgres.usarPostgres()) return postgres.limparTentativasLogin(chave);
  tentativas.delete(chave);
}
