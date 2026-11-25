import Link from "next/link";
import type { Pedido } from "@/lib/types";
import { formatBRL, formatData } from "@/lib/format";
import { diaLocal, dataCurta, formasPagamento } from "@/lib/periodoOrcamentos";
import { situacaoPrazo, valorPago, valorRestante } from "@/lib/pagamentos";
import { ExcluirOrcamento } from "./ExcluirOrcamento";
import { EfetivarPagamento } from "./EfetivarPagamento";

const tomPrazo = {
  atraso: "text-red-700",
  hoje: "text-amber-800",
  proximo: "text-amber-700",
  futuro: "text-slate-500",
} as const;

export function ListaOrcamentos({ pedidos, retorno, vendas = false, admin = false, parcial = false }: {
  pedidos: Pedido[]; retorno: string; vendas?: boolean; admin?: boolean; parcial?: boolean;
}) {
  const grupos = new Map<string, Pedido[]>();
  for (const p of pedidos) {
    const dia = diaLocal(p.created_at);
    const grupo = grupos.get(dia) ?? [];
    grupo.push(p); grupos.set(dia, grupo);
  }
  if (!pedidos.length) return <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
    <h2 className="font-semibold">{vendas ? "Nenhuma venda neste período" : parcial ? "Nenhum recebimento parcial pendente" : "Nenhum orçamento pendente neste período"}</h2>
    <p className="mt-1 text-sm text-slate-500">{vendas ? "Escolha outro período para consultar as vendas finalizadas."
      : parcial ? "Orçamentos com pagamento parcial aparecem aqui até a quitação."
      : "Escolha outro período ou crie um novo orçamento."}</p>
  </div>;
  return <div className="flex flex-col gap-4">{[...grupos].map(([dia, lista]) => <section key={dia} className="flex flex-col gap-2">
    <h2 className="text-sm font-semibold text-slate-600">{dataCurta(dia)} <span className="font-normal">· {lista.length} {vendas ? "venda(s)" : parcial ? "recebimento(s)" : "pendente(s)"}</span></h2>
    {lista.map(pedido => {
      const pago = valorPago(pedido);
      const restante = valorRestante(pedido);
      const prazo = situacaoPrazo(pedido.previsao_recebimento);
      return <article key={pedido.id} className="rounded-2xl border border-slate-200 bg-white p-3">
        <Link href={`/orcamento/${pedido.id}`} className="flex flex-col gap-1.5 rounded-lg focus-visible:outline-2 focus-visible:outline-slate-900">
          <div className="flex items-start justify-between gap-3">
            <strong className="min-w-0 truncate text-sm text-slate-900">{pedido.cliente_nome || "Cliente não informado"}</strong>
            <div className="shrink-0 text-right leading-tight">
              <strong className="text-sm tabular-nums">{formatBRL(pedido.valor_total)}</strong>
              <p className={`text-[11px] ${pedido.lucro_bruto == null ? "text-slate-500" : pedido.lucro_bruto < 0 ? "text-red-700" : "text-emerald-700"}`}>Lucro bruto: {pedido.lucro_bruto == null ? "---" : formatBRL(pedido.lucro_bruto)}</p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-slate-600">{vendas ? "Venda" : "Orçamento"} #{pedido.numero}</span>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${vendas ? "bg-sky-100 text-sky-900" : parcial ? "bg-amber-200 text-amber-950" : "bg-amber-100 text-amber-800"}`}>
              {vendas ? `Finalizado${pedido.forma_pagamento ? ` · ${formasPagamento[pedido.forma_pagamento]}` : ""}` : parcial ? "Recebimento parcial" : "Pagamento pendente"}
            </span>
          </div>

          {parcial && <div className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs">
            <p className="text-slate-600">Já pago: <strong className="tabular-nums text-slate-800">{formatBRL(pago)}</strong>
              <span className="px-1 text-amber-400">·</span>
              <span className="font-semibold text-amber-900">Falta receber: <strong className="text-sm tabular-nums">{formatBRL(restante)}</strong></span>
            </p>
            {pedido.previsao_recebimento
              ? <p className={`mt-0.5 text-[11px] font-medium ${prazo ? tomPrazo[prazo.tom] : "text-slate-500"}`}>Receber até {dataCurta(pedido.previsao_recebimento)}{prazo ? ` · ${prazo.texto}` : ""}</p>
              : <p className="mt-0.5 text-[11px] text-slate-500">Sem lembrete de recebimento.</p>}
          </div>}

          <p className="text-[11px] leading-tight text-slate-500">
            Por {pedido.criado_por?.nome ?? "não informado"} · {formatData(pedido.created_at)} · {pedido.itens.length} produto(s)
            {vendas ? ` · Confirmado por ${pedido.finalizado_por?.nome ?? "não informado"}` : ""}
          </p>
        </Link>

        {(pedido.status_pagamento !== "finalizado" || admin) && (
          <div className="mt-2 border-t border-slate-100 pt-2">
            <div className="flex items-center justify-between gap-2">
              {pedido.status_pagamento !== "finalizado"
                ? <span className="text-[11px] font-medium text-slate-500">{parcial ? "Receber o restante com" : "Receber com"}</span>
                : <span />}
              <div className="ml-auto flex items-center gap-3">
                <Link href={`/orcamento/${pedido.id}/editar?retorno=${encodeURIComponent(retorno)}`} className="text-xs font-medium text-slate-700 underline">Editar</Link>
                <ExcluirOrcamento id={pedido.id} numero={pedido.numero} venda={vendas} link />
              </div>
            </div>
            {pedido.status_pagamento !== "finalizado" && <div className="mt-1.5">
              <EfetivarPagamento id={pedido.id} numero={pedido.numero} revisao={pedido.revisao ?? 0} restante={restante} parcial={parcial} />
            </div>}
          </div>
        )}
      </article>;
    })}
  </section>)}</div>;
}
