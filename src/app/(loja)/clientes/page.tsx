import Link from "next/link";
import { exigirSessao } from "@/lib/auth-servidor";
import { getClientes, getPedidos } from "@/lib/db";
import { clienteCombina } from "@/lib/clientes";
import { formatBRL } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ClientesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await exigirSessao();
  const { q } = await searchParams;
  const busca = typeof q === "string" ? q.trim() : "";
  const [clientes, pedidos] = await Promise.all([getClientes(), getPedidos()]);
  const filtrados = busca ? clientes.filter(cliente => clienteCombina(cliente, busca)) : clientes;

  const resumo = new Map<string, { pedidos: number; vendas: number; total: number; ultima: string }>();
  for (const pedido of pedidos) {
    if (!pedido.cliente_id) continue;
    const atual = resumo.get(pedido.cliente_id) ?? { pedidos: 0, vendas: 0, total: 0, ultima: "" };
    atual.pedidos += 1;
    if (pedido.status_pagamento === "finalizado") {
      atual.vendas += 1;
      atual.total += pedido.valor_total;
    }
    if (pedido.created_at > atual.ultima) atual.ultima = pedido.created_at;
    resumo.set(pedido.cliente_id, atual);
  }

  return <section className="flex flex-col gap-5 pb-6">
    <div className="anim-entrada flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-slate-900 text-amber-300 shadow-sm">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="size-5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>
        </span>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">Cadastros</p>
          <h1 className="text-2xl font-bold leading-tight text-slate-900">Clientes</h1>
          <p className="mt-0.5 text-sm text-slate-500">Clientes recorrentes, com histórico de orçamentos e vendas.</p>
        </div>
      </div>
      <Link href="/clientes/novo" className="inline-flex min-h-11 items-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800">+ Novo cliente</Link>
    </div>

    <form action="/clientes" className="anim-entrada flex flex-wrap items-center gap-2" style={{ animationDelay: "60ms" }}>
      <input type="search" name="q" defaultValue={busca} placeholder="Buscar nome, telefone ou documento" aria-label="Buscar clientes" className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-amber-500" />
      <button className="min-h-11 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">Buscar</button>
      {busca && <Link href="/clientes" className="text-sm font-medium text-slate-500 underline">Limpar</Link>}
    </form>

    <p className="text-sm font-medium text-slate-600">{filtrados.length} {filtrados.length === 1 ? "cliente" : "clientes"}{busca ? ` para “${busca}”` : ""}</p>

    {!filtrados.length ? <div className="anim-entrada flex flex-col items-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-500">
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="size-6"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M19 8v6M22 11h-6" /></svg>
      </span>
      <h2 className="mt-3 font-semibold text-slate-900">{busca ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}</h2>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{busca ? "Tente outro nome, telefone ou documento." : "Cadastre quem compra com frequência para reaproveitar os dados e acompanhar o histórico."}</p>
      {!busca && <Link href="/clientes/novo" className="mt-4 inline-flex min-h-10 items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Cadastrar cliente</Link>}
    </div> : <div className="grid gap-2.5 sm:grid-cols-2">
      {filtrados.map((cliente, indice) => {
        const dados = resumo.get(cliente.id);
        return <Link key={cliente.id} href={`/clientes/${cliente.id}`} style={{ animationDelay: `${Math.min(indice, 8) * 45}ms` }} className="anim-entrada group flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-100 font-semibold text-amber-800">{cliente.nome[0]}</span>
            <div className="min-w-0 flex-1">
              <strong className="block truncate text-sm text-slate-900">{cliente.nome}</strong>
              <p className="mt-0.5 truncate text-xs text-slate-500">{cliente.telefone || "Telefone não informado"}{cliente.documento ? ` · ${cliente.documento}` : ""}</p>
            </div>
            <span aria-hidden="true" className="text-slate-400 transition-transform group-hover:translate-x-0.5">→</span>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-2 text-xs">
            <span className="text-slate-500">{dados?.pedidos ? `${dados.pedidos} ${dados.pedidos === 1 ? "orçamento" : "orçamentos"}` : "Sem compras registradas"}</span>
            {dados?.vendas ? <strong className="tabular-nums text-slate-800">{formatBRL(dados.total)}</strong> : <span className="text-slate-400">—</span>}
          </div>
        </Link>;
      })}
    </div>}
  </section>;
}
