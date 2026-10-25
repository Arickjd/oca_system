import { SignJWT } from "jose/jwt/sign";
import { jwtVerify } from "jose/jwt/verify";
import { buscarUsuario, type Usuario } from "./usuarios";

export const COOKIE_SESSAO = "oca_sessao";
export const DURACAO_SESSAO = 12 * 60 * 60;
export const DURACAO_PERSISTENTE = 30 * 24 * 60 * 60;

function chaveSessao() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("Configure AUTH_SECRET com pelo menos 32 caracteres no servidor.");
  return new TextEncoder().encode(secret);
}

export async function criarSessao(usuario: Usuario, manter: boolean, agora = new Date()) {
  const duracao = manter ? DURACAO_PERSISTENTE : DURACAO_SESSAO;
  const inicio = Math.floor(agora.getTime() / 1000);
  return new SignJWT({ manter })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(usuario.id).setIssuer("sistema-oca").setAudience("oca-usuarios")
    .setIssuedAt(inicio).setExpirationTime(inicio + duracao)
    .sign(chaveSessao());
}

export async function validarSessao(token: string | undefined, agora = new Date()) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, chaveSessao(), {
      algorithms: ["HS256"], issuer: "sistema-oca", audience: "oca-usuarios", currentDate: agora,
      requiredClaims: ["sub", "exp", "iat"],
    });
    const usuario = buscarUsuario(payload.sub);
    if (!usuario || typeof payload.manter !== "boolean") return null;
    return { usuario, manter: payload.manter };
  } catch { return null; }
}

export function destinoSeguro(valor: unknown) {
  if (typeof valor !== "string" || !valor.startsWith("/") || /[\\\u0000-\u0020]/.test(valor)) return "/home";
  try {
    const url = new URL(valor, "https://oca.local");
    return url.origin === "https://oca.local" && url.pathname !== "/" && !url.pathname.startsWith("/api/")
      ? url.pathname + url.search + url.hash : "/home";
  } catch { return "/home"; }
}

export function origemPermitida(headers: Headers) {
  if (headers.get("sec-fetch-site") === "cross-site") return false;
  const origem = headers.get("origin");
  if (!origem) return true;
  try {
    const url = new URL(origem);
    return ["http:", "https:"].includes(url.protocol) && url.host === headers.get("host");
  } catch { return false; }
}
