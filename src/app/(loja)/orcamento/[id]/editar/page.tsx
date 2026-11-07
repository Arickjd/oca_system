import { notFound, redirect } from "next/navigation";
import { getPedido, getProdutos } from "@/lib/db";
import { EditarOrcamento } from "@/components/EditarOrcamento";
import { exigirSessao } from "@/lib/auth-servidor";

export const dynamic = "force-dynamic";
export default async function EditarPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ retorno?: string }> }) {
  const { id } = await params;
  const { usuario } = await exigirSessao();
  const pedido = await getPedido(id);
  if (!pedido) notFound();
  const venda = pedido.status_pagamento === "finalizado";
  if (venda && usuario.papel !== "admin") redirect(`/orcamento/${id}`);
  const { retorno } = await searchParams;
  const lista = venda ? "/vendas" : "/orcamentos";
  const seguro = typeof retorno === "string" && (retorno === lista || retorno.startsWith(`${lista}?`)) ? retorno : lista;
  return <EditarOrcamento pedido={pedido} produtos={(await getProdutos()).filter(p => p.ativo)} retorno={seguro} />;
}
