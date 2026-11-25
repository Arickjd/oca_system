// Busca de produtos tolerante a acentos, caixa, pontuação e ordem das palavras.
export function normalizarBusca(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function termosBusca(consulta: string): string[] {
  const normalizada = normalizarBusca(consulta);
  return normalizada ? normalizada.split(" ") : [];
}

// Todos os termos precisam iniciar alguma palavra do nome ou do código
// (evita que "coca" encontre "paçoca", por exemplo).
export function produtoCombina(produto: { nome: string; codigo?: string }, consulta: string): boolean {
  const termos = termosBusca(consulta);
  if (!termos.length) return true;
  const palavras = normalizarBusca(`${produto.nome} ${produto.codigo ?? ""}`).split(" ").filter(Boolean);
  return termos.every(termo => palavras.some(palavra => palavra.startsWith(termo)));
}
