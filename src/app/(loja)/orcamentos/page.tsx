import Link from "next/link";
import { getPedidos } from "@/lib/db";
import { formatBRL, formatData } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function OrcamentosPage() {
  const pedidos = await getPedidos();
  return <section className="flex flex-col gap-4">
    <h1 className="text-xl font-bold text-slate-900">Orçamentos realizados</h1>
    <p className="text-sm text-slate-500">Histórico completo · {pedidos.length} orçamento(s)</p>
    <Link href="/produtos" className="text-sm font-semibold underline">Montar novo orçamento</Link>
    {!pedidos.length && <p className="rounded-xl bg-white p-6">Nenhum orçamento realizado ainda.</p>}
    {pedidos.map((pedido) => <Link key={pedido.id} href={`/orcamento/${pedido.id}`} className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col gap-2 hover:border-amber-500">
      <div className="flex justify-between gap-3"><strong>Orçamento #{pedido.numero}</strong><strong>{formatBRL(pedido.valor_total)}</strong></div>
      <span>{pedido.cliente_nome || "Cliente não informado"}</span>
      <span className="text-sm text-slate-500">{formatData(pedido.created_at)} · {pedido.itens.length} produto(s)</span>
      <span className="text-sm font-medium">Ver orçamento →</span>
    </Link>)}
  </section>;
}
