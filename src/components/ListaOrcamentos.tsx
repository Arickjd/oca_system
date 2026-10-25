import Link from "next/link";
import type { Pedido } from "@/lib/types";
import { formatBRL, formatData } from "@/lib/format";
import { diaLocal, dataCurta, formasPagamento } from "@/lib/periodoOrcamentos";
import { ExcluirOrcamento } from "./ExcluirOrcamento";

export function ListaOrcamentos({ pedidos, retorno, vendas = false }: { pedidos: Pedido[]; retorno: string; vendas?: boolean }) {
  const grupos = new Map<string, Pedido[]>();
  for (const p of pedidos) {
    const dia = diaLocal(p.created_at);
    const grupo = grupos.get(dia) ?? [];
    grupo.push(p); grupos.set(dia, grupo);
  }
  if (!pedidos.length) return <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
    <h2 className="font-semibold">{vendas ? "Nenhuma venda neste período" : "Nenhum orçamento pendente neste dia"}</h2>
    <p className="mt-1 text-sm text-slate-500">{vendas ? "Escolha outro período para consultar as vendas finalizadas." : "Selecione outro dia com pendências ou crie um novo orçamento."}</p>
  </div>;
  return <div className="flex flex-col gap-5">{[...grupos].map(([dia, lista]) => <section key={dia} className="flex flex-col gap-3">
    <h2 className="text-sm font-semibold text-slate-600">{dataCurta(dia)} <span className="font-normal">· {lista.length} {vendas ? "venda(s)" : "pendente(s)"}</span></h2>
    {lista.map(pedido => <article key={pedido.id} className="rounded-2xl border border-slate-200 bg-white p-4">
      <Link href={`/orcamento/${pedido.id}`} className="flex flex-col gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-slate-900">
        <div className="flex justify-between gap-3"><strong>{vendas ? "Venda" : "Orçamento"} #{pedido.numero}</strong><div className="text-right"><strong>{formatBRL(pedido.valor_total)}</strong>
          <p className={`mt-1 text-xs ${pedido.lucro_bruto == null ? "text-slate-500" : pedido.lucro_bruto < 0 ? "text-red-700" : "text-emerald-700"}`}>Lucro bruto: {pedido.lucro_bruto == null ? "---" : formatBRL(pedido.lucro_bruto)}</p>
        </div></div>
        <span className="break-words">{pedido.cliente_nome || "Cliente não informado"}</span>
        <span className="text-xs text-slate-500">Criado por: {pedido.criado_por?.nome || "Não informado"}</span>
        <span className={`self-start rounded-full px-3 py-1 text-xs font-semibold ${vendas ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
          {vendas ? `Finalizado${pedido.forma_pagamento ? ` · ${formasPagamento[pedido.forma_pagamento]}` : ""}` : "Pagamento pendente"}
        </span>
        <span className="text-xs text-slate-500">{formatData(pedido.created_at)} · {pedido.itens.length} produto(s)</span>
        <span className="text-sm font-medium underline">{vendas ? "Ver venda" : "Ver orçamento"}</span>
      </Link>
      <div className="mt-4 flex flex-wrap items-start gap-2 border-t border-slate-100 pt-3">
        <ExcluirOrcamento id={pedido.id} numero={pedido.numero} />
        {!vendas && pedido.status_pagamento !== "finalizado" && <>
          <Link href={`/orcamento/${pedido.id}/editar?retorno=${encodeURIComponent(retorno)}`} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium">Editar</Link>
          <Link href={`/orcamento/${pedido.id}#pagamento`} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white">Efetivar</Link>
        </>}
      </div>
    </article>)}
  </section>)}</div>;
}
