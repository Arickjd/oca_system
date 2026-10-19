import { getProdutos, getCategorias } from "@/lib/db";
import { CadastroProdutos } from "@/components/CadastroProdutos";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [produtos, categorias] = await Promise.all([getProdutos(), getCategorias()]);
  return <CadastroProdutos produtos={produtos} categorias={categorias} />;
}
