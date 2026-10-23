import { notFound } from "next/navigation";
import Link from "next/link";
import { getPedido, getProdutos } from "@/lib/db";
import { EditarOrcamento } from "@/components/EditarOrcamento";

export const dynamic = "force-dynamic";
export default async function EditarPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ retorno?: string }> }) {
  const { id } = await params;
  const pedido = await getPedido(id);
  if (!pedido) notFound();
  if (pedido.status_pagamento === "finalizado") return <section className="rounded-2xl bg-white p-6"><h1 className="text-xl font-bold">Orçamento já finalizado</h1><p className="my-3">Somente orçamentos pendentes podem ser editados.</p><Link href={`/orcamento/${id}`} className="underline">Ver orçamento</Link></section>;
  const { retorno } = await searchParams;
  const seguro = typeof retorno === "string" && (retorno === "/orcamentos" || retorno.startsWith("/orcamentos?")) ? retorno : "/orcamentos";
  return <EditarOrcamento pedido={pedido} produtos={(await getProdutos()).filter(p => p.ativo)} retorno={seguro} />;
}
