"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/cart";

export function SiteHeader({ usuario, admin }: { usuario: string; admin: boolean }) {
  const { totalItens } = useCart();
  const pathname = usePathname();

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
      <div className="mx-auto flex max-w-3xl items-center justify-end gap-3 px-3 pb-2 text-sm text-slate-500 sm:text-xs">
        <div className="flex items-center gap-2">
          <span>Usuário: <strong className="font-medium text-slate-700">{usuario}</strong></span>
          {admin && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">Admin</span>}
        </div>
        <form action="/api/auth/logout" method="post"><button className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-100">Sair</button></form>
      </div>
    </header>
  );
}
