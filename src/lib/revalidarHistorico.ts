import { revalidatePath } from "next/cache";

export function revalidarHistorico() {
  for (const pagina of ["/home", "/orcamentos", "/vendas", "/relatorios"]) revalidatePath(pagina);
}
