import { getProdutos, getCategorias } from "@/lib/db";
import { ProdutosManager } from "@/components/admin/ProdutosManager";

export const dynamic = "force-dynamic";

export default async function ProdutosPage() {
  const [produtos, categorias] = await Promise.all([
    getProdutos(),
    getCategorias(),
  ]);
  return <ProdutosManager produtos={produtos} categorias={categorias} />;
}
