import Link from "next/link";
import { getPedidos } from "@/lib/db";
import { ListaOrcamentos } from "@/components/ListaOrcamentos";
import { separarHistorico } from "@/lib/historicoOrcamentos";
import { situacaoPrazo, totalAReceber } from "@/lib/pagamentos";
import { formatBRL } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function RecebimentoParcialPage() {
  const todos = await getPedidos();
  const { parciais } = separarHistorico(todos);
  // Quem tem prazo aparece primeiro, do mais urgente para o mais distante.
  const pedidos = [...parciais].sort((a, b) =>
    (a.previsao_recebimento ?? "9999-12-31").localeCompare(b.previsao_recebimento ?? "9999-12-31") || b.numero - a.numero);
  const total = totalAReceber(pedidos);
  const atrasados = pedidos.filter(p => p.previsao_recebimento && (situacaoPrazo(p.previsao_recebimento)?.dias ?? 0) < 0).length;

  return <section className="flex flex-col gap-5 pb-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Recebimento parcial</h1>
        <p className="mt-1 text-sm text-slate-500">Orçamentos com parte do valor recebida, aguardando a quitação.</p>
      </div>
      <Link href="/orcamentos" className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800">Ver em aberto</Link>
    </div>

    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">Total a receber</p>
      <p className="mt-1 text-3xl font-bold tabular-nums text-amber-900">{formatBRL(total)}</p>
      <p className="mt-1 text-sm text-amber-900">
        {pedidos.length} {pedidos.length === 1 ? "orçamento" : "orçamentos"} · {atrasados ? `${atrasados} com prazo vencido` : "nenhum prazo vencido"}
      </p>
    </div>

    <ListaOrcamentos pedidos={pedidos} retorno="/orcamentos/recebimento-parcial" parcial />
  </section>;
}
