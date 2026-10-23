import Link from "next/link";
import { getPedidos } from "@/lib/db";
import { formatBRL, formatData } from "@/lib/format";
import { ExcluirOrcamento } from "@/components/ExcluirOrcamento";
import { FiltroOrcamentos } from "@/components/FiltroOrcamentos";
import { RelatorioOrcamentos } from "@/components/RelatorioOrcamentos";
import { resolverPeriodo, filtrarPeriodo, resumoPeriodo, diaLocal, dataCurta, formasPagamento } from "@/lib/periodoOrcamentos";
import type { Pedido } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function OrcamentosPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const valor = (key: string) => typeof params[key] === "string" ? params[key] as string : undefined;
  let periodo;
  try { periodo = resolverPeriodo({ periodo: valor("periodo"), inicio: valor("inicio"), fim: valor("fim") }); }
  catch { return <section className="rounded-2xl bg-white p-6"><h1 className="text-xl font-bold">Período inválido</h1><p className="my-3">Escolha datas válidas, com início anterior ou igual ao fim.</p><Link href="/orcamentos" className="underline">Voltar aos orçamentos de hoje</Link></section>; }
  const pedidos = filtrarPeriodo(await getPedidos(), periodo);
  const resumo = resumoPeriodo(pedidos);
  const grupos = new Map<string, Pedido[]>();
  for (const p of pedidos) { const dia = diaLocal(p.created_at); grupos.set(dia, [...(grupos.get(dia) ?? []), p]); }
  const retorno = `/orcamentos?${new URLSearchParams({ periodo: "personalizado", inicio: periodo.inicio, fim: periodo.fim })}`;
  return <section className="flex flex-col gap-5 pb-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-bold text-slate-900">Orçamentos</h1><p className="mt-1 text-sm text-slate-500">Acompanhe as vendas e os pagamentos.</p></div>
      <Link href="/produtos" className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white">+ Novo orçamento</Link>
    </div>
    <FiltroOrcamentos key={`${periodo.tipo}-${periodo.inicio}-${periodo.fim}`} periodo={periodo} />
    <div><p className="text-sm font-medium text-slate-600">{dataCurta(periodo.inicio)}{periodo.inicio !== periodo.fim && ` a ${dataCurta(periodo.fim)}`} · {pedidos.length} orçamento(s)</p>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-slate-900 p-4 text-white"><p className="text-sm text-slate-300">Total em orçamentos</p><strong className="text-xl">{formatBRL(resumo.total)}</strong></div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900"><p className="text-sm">Finalizados · {resumo.pagos}</p><strong className="text-xl">{formatBRL(resumo.recebido)}</strong></div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900"><p className="text-sm">Pendentes · {resumo.pendentes}</p><strong className="text-xl">{formatBRL(resumo.pendente)}</strong></div>
      </div>
    </div>
    <RelatorioOrcamentos key={`${periodo.inicio}-${periodo.fim}`} periodo={periodo} vazio={!pedidos.length} />
    {!pedidos.length && <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center"><h2 className="font-semibold">Nenhum orçamento neste período</h2><p className="mt-1 text-sm text-slate-500">Selecione outros dias ou crie um novo orçamento.</p></div>}
    {[...grupos].map(([dia, lista]) => <section key={dia} className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-slate-600">{dataCurta(dia)} <span className="font-normal">· {lista.length} orçamento(s)</span></h2>
      {lista.map(pedido => <article key={pedido.id} className="rounded-2xl border border-slate-200 bg-white p-4">
        <Link href={`/orcamento/${pedido.id}`} className="flex flex-col gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-slate-900">
          <div className="flex justify-between gap-3"><strong>Orçamento #{pedido.numero}</strong><div className="text-right"><strong>{formatBRL(pedido.valor_total)}</strong>
            <p className={`mt-1 text-xs ${pedido.lucro_bruto == null ? "text-slate-500" : pedido.lucro_bruto < 0 ? "text-red-700" : "text-emerald-700"}`}>Lucro bruto: {pedido.lucro_bruto == null ? "---" : formatBRL(pedido.lucro_bruto)}</p>
          </div></div>
          <span className="break-words">{pedido.cliente_nome || "Cliente não informado"}</span>
          <span className={`self-start rounded-full px-3 py-1 text-xs font-semibold ${pedido.status_pagamento === "finalizado" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
            {pedido.status_pagamento === "finalizado" ? `Finalizado${pedido.forma_pagamento ? ` · ${formasPagamento[pedido.forma_pagamento]}` : ""}` : "Pagamento pendente"}
          </span>
          <span className="text-xs text-slate-500">{formatData(pedido.created_at)} · {pedido.itens.length} produto(s)</span>
          <span className="text-sm font-medium underline">Ver orçamento</span>
        </Link>
        <div className="mt-4 flex flex-wrap items-start gap-2 border-t border-slate-100 pt-3">
          <ExcluirOrcamento id={pedido.id} numero={pedido.numero} />
          {pedido.status_pagamento !== "finalizado" && <>
            <Link href={`/orcamento/${pedido.id}/editar?retorno=${encodeURIComponent(retorno)}`} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium">Editar</Link>
            <Link href={`/orcamento/${pedido.id}#pagamento`} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white">Efetivar</Link>
          </>}
        </div>
      </article>)}
    </section>)}
  </section>;
}
