// Ícone (emoji) sugerido por categoria, com base no nome. Fallback genérico.
export function iconeCategoria(nome: string): string {
  const n = (nome || "").toLowerCase();
  if (n.includes("não alco") || n.includes("nao alco")) return "🥤";
  if (n.includes("alco")) return "🍺";
  if (n.includes("condiment") || n.includes("molho")) return "🧂";
  if (n.includes("embalag") || n.includes("descart")) return "🥡";
  if (n.includes("mercearia") || n.includes("doce") || n.includes("snack"))
    return "🍫";
  if (n.includes("tabac")) return "🚬";
  if (n.includes("divers")) return "📦";
  return "🛒";
}
