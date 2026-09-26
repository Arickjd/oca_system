import { getCategorias } from "@/lib/db";
import { CategoriasManager } from "@/components/admin/CategoriasManager";

export const dynamic = "force-dynamic";

export default async function CategoriasPage() {
  const categorias = await getCategorias();
  return <CategoriasManager categorias={categorias} />;
}
