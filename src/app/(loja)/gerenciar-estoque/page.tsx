import { exigirSessao } from "@/lib/auth-servidor";
import { getProdutos, getCategorias, getMovimentosEstoque } from "@/lib/db";
import { consolidarSaldos } from "@/lib/estoque";
import { GerenciarEstoque } from "@/components/GerenciarEstoque";

export const dynamic = "force-dynamic";

export default async function GerenciarEstoquePage({ searchParams }: { searchParams: Promise<{ produto?: string }> }) {
  const { usuario } = await exigirSessao();
  const { produto: produtoId } = await searchParams;
  const [produtos, categorias, movimentos] = await Promise.all([
    getProdutos(), getCategorias(), getMovimentosEstoque({ produtoId: produtoId || undefined, limite: 50 }),
  ]);
  const nomeFiltrado = produtoId ? produtos.find(p => p.id === produtoId)?.nome : undefined;
  return <GerenciarEstoque saldos={consolidarSaldos(produtos)} categorias={categorias} movimentos={movimentos} admin={usuario.papel === "admin"} produtoFiltrado={nomeFiltrado} />;
}
