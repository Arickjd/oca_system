import { getCategorias } from "./db";

export async function validarProduto(body: unknown) {
  if (!body || typeof body !== "object") throw new Error("Dados inválidos.");
  const b = body as Record<string, unknown>;
  if (typeof b.nome !== "string" || !b.nome.trim() ||
      typeof b.preco_pack !== "number" || !Number.isFinite(b.preco_pack) || b.preco_pack < 0 ||
      typeof b.pack_quantidade !== "number" || !Number.isSafeInteger(b.pack_quantidade) || b.pack_quantidade < 1)
    throw new Error("Informe nome, preço válido e quantidade inteira por pacote.");
  const patch: { nome: string; preco_pack: number; pack_quantidade: number; categoria_id?: string } = {
    nome: b.nome.trim(), preco_pack: Math.round(b.preco_pack * 100) / 100, pack_quantidade: b.pack_quantidade,
  };
  if (b.categoria_id !== undefined) {
    if (typeof b.categoria_id !== "string" || (b.categoria_id && !(await getCategorias()).some(c => c.id === b.categoria_id)))
      throw new Error("Categoria inválida.");
    patch.categoria_id = b.categoria_id;
  }
  return patch;
}
