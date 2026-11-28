import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirSessao } from "@/lib/auth-servidor";
import { getCliente, getPedidos } from "@/lib/db";
import { formatBRL, formatData } from "@/lib/format";
import { formasPagamento } from "@/lib/periodoOrcamentos";

export const dynamic = "force-dynamic";

const badge = (pedido: { status_pagamento?: string }) => pedido.status_pagamento === "finalizado"
  ? "bg-sky-100 text-sky-900"
  : pedido.status_pagamento === "parcial"
    ? "bg-amber-200 text-amber-950"
    : "bg-amber-100 text-amber-800";

const rotulo = (pedido: { status_pagamento?: string; forma_pagamento?: keyof typeof formasPagamento }) => pedido.status_pagamento === "finalizado"
  ? `Venda${pedido.forma_pagamento ? ` · ${formasPagamento[pedido.forma_pagamento]}` : ""}`
  : pedido.status_pagamento === "parcial" ? "Recebimento parcial" : "Orçamento";

export default async function ClientePage({ params }: { params: Promise<{ id: string }> }) {
  await exigirSessao();
  const { id } = await params;
  const [cliente, todos] = await Promise.all([getCliente(id), getPedidos()]);
  if (!cliente) notFound();
  const pedidos = todos.filter(pedido => pedido.cliente_id === cliente.id).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const vendas = pedidos.filter(pedido => pedido.status_pagamento === "finalizado");
  const total = vendas.reduce((soma, pedido) => soma + pedido.valor_total, 0);
  const ultima = pedidos[0]?.created_at;

  return <section className="flex flex-col gap-5 pb-6">
    <div className="anim-entrada">
      <Link href="/clientes" className="text-sm underline text-slate-600">Voltar aos clientes</Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-amber-100 text-xl font-bold text-amber-800">{cliente.nome[0]}</span>
          <div>
            <h1 className="text-2xl font-bold leading-tight text-slate-900">{cliente.nome}</h1>
            <p className="mt-0.5 text-sm text-slate-500">{cliente.telefone || "Telefone não informado"}{cliente.documento ? ` · ${cliente.documento}` : ""}</p>
            <p className="mt-1 text-[11px] text-slate-400">Cadastrado em {formatData(cliente.created_at)}</p>
          </div>
        </div>
        <Link href={`/clientes/${cliente.id}/editar`} className="inline-flex min-h-10 items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Editar cliente</Link>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
      <div className="anim-entrada rounded-2xl border border-amber-200 bg-white p-3.5 shadow-sm" style={{ animationDelay: "60ms" }}><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Orçamentos</p><p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{pedidos.length}</p><p className="mt-0.5 text-[11px] text-slate-500">{ultima ? `último em ${formatData(ultima)}` : "nenhum registro"}</p></div>
      <div className="anim-entrada rounded-2xl border border-sky-200 bg-white p-3.5 shadow-sm" style={{ animationDelay: "100ms" }}><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Vendas</p><p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{vendas.length}</p><p className="mt-0.5 text-[11px] text-slate-500">pagamentos finalizados</p></div>
      <div className="anim-entrada col-span-2 rounded-2xl border border-emerald-200 bg-white p-3.5 shadow-sm sm:col-span-1" style={{ animationDelay: "140ms" }}><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Total comprado</p><p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{formatBRL(total)}</p><p className="mt-0.5 text-[11px] text-slate-500">somente vendas finalizadas</p></div>
    </div>

    {cliente.observacao && <div className="anim-entrada rounded-2xl border border-slate-200 bg-white p-4" style={{ animationDelay: "180ms" }}>
      <h2 className="text-sm font-semibold text-slate-800">Observação</h2>
      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{cliente.observacao}</p>
    </div>}

    <section aria-labelledby="historico-cliente" className="anim-entrada" style={{ animationDelay: "220ms" }}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 id="historico-cliente" className="text-lg font-bold text-slate-900">Histórico</h2>
          <p className="mt-0.5 text-xs text-slate-500">Orçamentos e vendas vinculados a este cadastro, mais recentes primeiro.</p>
        </div>
      </div>
      {!pedidos.length ? <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center">
        <p className="font-semibold text-slate-800">Nenhum orçamento vinculado ainda</p>
        <p className="mt-1 text-sm text-slate-500">Ao fechar um orçamento e selecionar este cliente, o histórico aparece aqui.</p>
        <Link href="/produtos" className="mt-4 inline-flex min-h-10 items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Criar orçamento</Link>
      </div> : <div className="mt-3 flex flex-col gap-2">
        {pedidos.map(pedido => <Link key={pedido.id} href={`/orcamento/${pedido.id}`} className="group flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <strong className="text-sm text-slate-900">{pedido.status_pagamento === "finalizado" ? "Venda" : "Orçamento"} #{pedido.numero}</strong>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge(pedido)}`}>{rotulo(pedido)}</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">{formatData(pedido.created_at)} · {pedido.itens.length} {pedido.itens.length === 1 ? "produto" : "produtos"}</p>
          </div>
          <div className="shrink-0 text-right">
            <strong className="block text-sm tabular-nums text-slate-900">{formatBRL(pedido.valor_total)}</strong>
            <span aria-hidden="true" className="text-xs text-slate-400 transition-transform group-hover:translate-x-0.5">→</span>
          </div>
        </Link>)}
      </div>}
    </section>
  </section>;
}
