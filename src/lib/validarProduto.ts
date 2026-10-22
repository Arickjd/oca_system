import { getCategorias } from "./db";

export async function validarProduto(body: unknown) {
  if (!body || typeof body !== "object") throw new Error("Dados inválidos.");
  const b = body as Record<string, unknown>;
  if (typeof b.nome !== "string" || !b.nome.trim() ||
      typeof b.preco_pack !== "number" || !Number.isFinite(b.preco_pack) || b.preco_pack < 0 ||
      typeof b.pack_quantidade !== "number" || !Number.isSafeInteger(b.pack_quantidade) || b.pack_quantidade < 1)
    throw new Error("Informe nome, preço válido e quantidade inteira por pacote.");
  const patch: { nome: string; descricao?: string; preco_pack: number; pack_quantidade: number; categoria_id?: string; custo_pack?: number | null } = {
    nome: b.nome.trim(), preco_pack: Math.round(b.preco_pack * 100) / 100, pack_quantidade: b.pack_quantidade,
  };
  if (b.descricao !== undefined) {
    if (typeof b.descricao !== "string") throw new Error("A descrição deve ser um texto.");
    patch.descricao = b.descricao.trim();
  }
  if (b.custo_pack !== undefined) {
    if (b.custo_pack !== null && (typeof b.custo_pack !== "number" || !Number.isFinite(b.custo_pack) || b.custo_pack < 0 || !Number.isSafeInteger(Math.round(b.custo_pack * 100))))
      throw new Error("Informe um custo de compra válido, maior ou igual a zero.");
    patch.custo_pack = b.custo_pack === null ? null : Math.round((b.custo_pack as number) * 100) / 100 || null;
  }
  if (b.categoria_id !== undefined) {
    if (typeof b.categoria_id !== "string" || (b.categoria_id && !(await getCategorias()).some(c => c.id === b.categoria_id)))
      throw new Error("Categoria inválida.");
    patch.categoria_id = b.categoria_id;
  }
  return patch;
}
