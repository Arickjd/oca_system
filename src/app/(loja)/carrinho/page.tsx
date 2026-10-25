import Carrinho from "@/components/Carrinho";
import { getProdutos } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function CarrinhoPage() {
  const produtos = await getProdutos();
  return <Carrinho produtos={produtos.map(({ id, custo_pack, preco_pack }) => ({ id, custo_pack, preco_pack }))} />;
}
