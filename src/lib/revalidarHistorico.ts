import { revalidatePath } from "next/cache";

export function revalidarHistorico() {
  for (const pagina of ["/orcamentos", "/vendas", "/relatorios"]) revalidatePath(pagina);
}
