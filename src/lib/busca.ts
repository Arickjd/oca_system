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

function combinaTermos(palavras: string[], compacto: string, termos: string[]): boolean {
  return termos.every(termo => {
    if (palavras.some(palavra => palavra.startsWith(termo))) return true;
    // Números sem separador: "15" encontra "1,5"; "350" encontra "350ml".
    if (termo.length >= 2 && /^\d+$/.test(termo) && compacto.includes(termo)) return true;
    // Trecho no meio da palavra ou palavras coladas: "cocacola", "artica".
    return termo.length >= 5 && compacto.includes(termo);
  });
}

// Todos os termos precisam aparecer, em qualquer ordem, tolerando acentos,
// pontuação, palavras coladas e números escritos sem vírgula.
export function textoCombina(texto: string, consulta: string): boolean {
  const termos = termosBusca(consulta);
  if (!termos.length) return true;
  const palavras = normalizarBusca(texto).split(" ").filter(Boolean);
  const compacto = palavras.join("");
  if (combinaTermos(palavras, compacto, termos)) return true;
  // "coca15" / "51lata": separa letras e números e tenta novamente.
  const expandidos = termos.flatMap(termo => termo.match(/[a-z]+|\d+/g) ?? [termo]);
  return expandidos.length > termos.length && combinaTermos(palavras, compacto, expandidos);
}

// Todos os termos precisam iniciar alguma palavra do nome ou do código
// (evita que "coca" encontre "paçoca", por exemplo).
export function produtoCombina(produto: { nome: string; codigo?: string }, consulta: string): boolean {
  if (textoCombina(produto.nome, consulta)) return true;
  const codigo = produto.codigo?.trim();
  if (!codigo) return false;
  const termos = termosBusca(consulta);
  if (!termos.length) return true;
  // O código só casa por início de palavra; evita que "15" ache qualquer código com 15.
  const palavras = normalizarBusca(codigo).split(" ").filter(Boolean);
  return termos.every(termo => palavras.some(palavra => palavra.startsWith(termo)));
}
