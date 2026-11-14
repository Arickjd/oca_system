"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/cart";
import { formatBRL } from "@/lib/format";
import { dataCurta } from "@/lib/periodoOrcamentos";
import type { AvisoRecebimento } from "@/lib/avisos";

const tomPrazo = { atraso: "text-red-700", hoje: "text-amber-800", proximo: "text-amber-700", futuro: "text-slate-500" } as const;

export function SiteHeader({ usuario, admin, contagens, avisos = [] }: {
  usuario: string; admin: boolean; contagens?: { abertos: number; parciais: number }; avisos?: AvisoRecebimento[];
}) {
  const { totalItens } = useCart();
  const pathname = usePathname();
  const [abrirAvisos, setAbrirAvisos] = useState(false);
  const mostrarAbas = pathname === "/orcamentos" || pathname.startsWith("/orcamentos/");
  const mostrarAvisos = pathname === "/home";
  const atrasados = avisos.filter(aviso => aviso.prazo.tom === "atraso").length;
  const abas = [
    { href: "/orcamentos", nome: "Em aberto", quantidade: contagens?.abertos ?? 0, ativo: pathname === "/orcamentos" },
    { href: "/orcamentos/recebimento-parcial", nome: "Recebimento parcial", quantidade: contagens?.parciais ?? 0, ativo: pathname.startsWith("/orcamentos/recebimento-parcial") },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-3xl mx-auto grid grid-cols-[1fr_auto] items-center gap-x-1 gap-y-2 px-2 py-2 min-[400px]:h-20 min-[400px]:grid-cols-[auto_minmax(0,1fr)_auto] min-[400px]:py-0 sm:h-16 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-2 sm:px-3">
        <Link href="/home" aria-label="Ir para a página inicial" className="order-1 min-w-0 justify-self-start min-[400px]:order-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/WHITE_ICON.jpg"
            alt="OCA Distribuidora"
            className="h-12 w-16 max-w-none object-contain sm:h-9 sm:w-auto"
          />
        </Link>

        <nav aria-label="Navegação principal" className="order-3 col-span-2 flex max-w-full items-center justify-center justify-self-center gap-0.5 rounded-xl bg-slate-100 p-1 min-[400px]:order-none min-[400px]:col-span-1">
          {[{ href: "/orcamentos", nome: "Orçamentos" }, { href: "/vendas", nome: "Vendas" }, { href: "/relatorios", nome: "Relatórios" }].map(link => {
            const ativo = pathname === link.href || (link.href === "/orcamentos" && pathname.startsWith("/orcamento/"));
            return <Link key={link.href} href={link.href} aria-current={ativo ? "page" : undefined} className={`whitespace-nowrap rounded-lg px-2 py-2.5 text-sm font-semibold tracking-tight min-[400px]:px-0.5 sm:px-3 sm:tracking-normal ${ativo ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-white hover:text-slate-900"}`}>{link.nome}</Link>;
          })}
        </nav>
        <div className="order-2 flex items-center justify-self-end gap-2 min-[400px]:order-none">
          <Link
            href="/produtos"
            aria-label="Montar pedido"
            title="Montar pedido"
            className="inline-flex shrink-0 items-center rounded-full bg-amber-100 p-2 text-amber-950 transition hover:bg-amber-200 active:scale-95"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-5">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </Link>
          <Link
            href="/carrinho"
            aria-label="Ver carrinho"
            className="relative inline-flex items-center gap-2 rounded-full bg-slate-900 text-white p-2 text-sm font-medium transition active:scale-95 sm:px-4"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5"
            >
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            <span className="hidden sm:inline">Carrinho</span>
            {totalItens > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-amber-500 text-slate-900 text-xs font-bold grid place-items-center">
                {totalItens}
              </span>
            )}
          </Link>
        </div>
      </div>
      <div className={`mx-auto flex max-w-3xl flex-wrap items-center gap-x-3 gap-y-2 px-3 pb-2 text-sm text-slate-500 sm:text-xs ${mostrarAbas || mostrarAvisos ? "justify-between" : "justify-end"}`}>
        {mostrarAbas && <nav aria-label="Situação dos orçamentos" className="flex min-w-0 flex-wrap items-center gap-1">
          {abas.map(aba => <Link key={aba.href} href={aba.href} aria-current={aba.ativo ? "page" : undefined}
            className={`inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-2 py-1 text-[11px] font-semibold transition sm:text-xs ${aba.ativo ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}>
            {aba.nome}
            <span aria-label={`${aba.quantidade} ${aba.nome}`} className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${aba.ativo ? "bg-white/20 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}>{aba.quantidade}</span>
          </Link>)}
        </nav>}
        {mostrarAvisos && <button type="button" onClick={() => setAbrirAvisos(valor => !valor)} aria-expanded={abrirAvisos}
          className={`inline-flex min-h-8 items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-semibold transition sm:text-xs ${atrasados ? "border-red-300 bg-red-50 text-red-800 hover:bg-red-100" : "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"}`}>
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-4">
            <path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10.3 21a2 2 0 0 0 3.4 0" />
          </svg>
          Avisos de recebimento
          <span aria-label={`${avisos.length} aviso(s)`} className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${atrasados ? "bg-red-600 text-white" : "bg-white text-amber-900 ring-1 ring-amber-300"}`}>{avisos.length}</span>
        </button>}
        <div className="flex items-center gap-2 sm:ml-auto">
          <span>Usuário: <strong className="font-medium text-slate-700">{usuario}</strong></span>
          {admin && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">Admin</span>}
        </div>
        <form action="/api/auth/logout" method="post"><button className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-100">Sair</button></form>
      </div>
      {mostrarAvisos && abrirAvisos && <div className="mx-auto max-w-3xl px-3 pb-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recebimentos com prazo</p>
            <Link href="/orcamentos/recebimento-parcial" onClick={() => setAbrirAvisos(false)} className="text-xs font-medium underline">Ver todos</Link>
          </div>
          {avisos.length ? <ul className="mt-2 flex max-h-64 flex-col gap-1 overflow-auto">
            {avisos.map(aviso => <li key={aviso.id}>
              <Link href={`/orcamento/${aviso.id}`} onClick={() => setAbrirAvisos(false)} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 rounded-lg px-1 py-1 hover:bg-slate-50">
                <span className="min-w-0 text-sm">
                  <strong className="text-slate-900">#{aviso.numero}</strong> <span className="text-slate-700">{aviso.cliente}</span>
                  <span className={`block text-xs font-medium ${tomPrazo[aviso.prazo.tom]}`}>Receber até {dataCurta(aviso.previsao)} · {aviso.prazo.texto}</span>
                </span>
                <strong className="text-sm tabular-nums text-amber-900">{formatBRL(aviso.restante)}</strong>
              </Link>
            </li>)}
          </ul> : <p className="mt-2 text-sm text-slate-500">Nenhum recebimento com prazo definido.</p>}
        </div>
      </div>}
    </header>
  );
}
