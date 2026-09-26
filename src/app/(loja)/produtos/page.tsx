import { getProdutos, getCategorias } from "@/lib/db";
import { ProdutosBrowser } from "@/components/ProdutosBrowser";

export const dynamic = "force-dynamic";

export default async function ProdutosPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>;
}) {
  const { categoria } = await searchParams;
  const [produtos, categorias] = await Promise.all([
    getProdutos(),
    getCategorias(),
  ]);

  return (
    <ProdutosBrowser
      produtos={produtos.filter((p) => p.ativo)}
      categorias={categorias.filter((c) => c.ativo)}
      categoriaInicial={categoria ?? ""}
    />
  );
}
