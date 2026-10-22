import Link from "next/link";
import { getPedidos } from "@/lib/db";
import { formatBRL, formatData } from "@/lib/format";
import { ExcluirOrcamento } from "@/components/ExcluirOrcamento";

export const dynamic = "force-dynamic";

export default async function OrcamentosPage() {
  const pedidos = await getPedidos();
  return <section className="flex flex-col gap-4">
    <h1 className="text-xl font-bold text-slate-900">Orçamentos realizados</h1>
    <p className="text-sm text-slate-500">Histórico completo · {pedidos.length} orçamento(s)</p>
    <Link href="/produtos" className="text-sm font-semibold underline">Montar novo orçamento</Link>
    {!pedidos.length && <p className="rounded-xl bg-white p-6">Nenhum orçamento realizado ainda.</p>}
    {pedidos.map((pedido) => <article key={pedido.id} className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col gap-3">
      <Link href={`/orcamento/${pedido.id}`} className="flex flex-col gap-2 hover:underline">
      <div className="flex justify-between gap-3"><strong>Orçamento #{pedido.numero}</strong><div className="text-right">
        <strong>{formatBRL(pedido.valor_total)}</strong>
        <p className={`mt-1 text-sm ${pedido.lucro_bruto == null ? "text-slate-500" : pedido.lucro_bruto < 0 ? "text-red-700" : "text-emerald-700"}`}>
          Lucro bruto: {pedido.lucro_bruto == null ? "---" : formatBRL(pedido.lucro_bruto)}
        </p>
        {pedido.lucro_bruto == null && <p className="text-xs text-slate-500">Custo não registrado em todos os itens</p>}
      </div></div>
      <span>{pedido.cliente_nome || "Cliente não informado"}</span>
      <span className={`self-start rounded-full px-3 py-1 text-xs font-semibold ${pedido.status_pagamento === "finalizado" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
        {pedido.status_pagamento === "finalizado" ? `Finalizado${pedido.forma_pagamento ? ` · ${{ pix: "Pix", cartao: "Cartão", dinheiro: "Dinheiro" }[pedido.forma_pagamento]}` : ""}` : "Pagamento pendente"}
      </span>
      <span className="text-sm text-slate-500">{formatData(pedido.created_at)} · {pedido.itens.length} produto(s)</span>
      <span className="text-sm font-medium">Ver orçamento →</span>
      </Link>
      <ExcluirOrcamento id={pedido.id} numero={pedido.numero} />
    </article>)}
  </section>;
}
