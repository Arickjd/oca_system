import { Checkout } from "@/components/Checkout";
import { getProdutos } from "@/lib/db";

export default async function CheckoutPage() {
  const produtos = await getProdutos();
  const precos = Object.fromEntries(produtos.map(produto => [produto.id, produto.preco_pack]));
  return <Checkout precos={precos} />;
}
