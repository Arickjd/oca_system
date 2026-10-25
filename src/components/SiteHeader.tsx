"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/cart";

export function SiteHeader({ usuario }: { usuario: string }) {
  const { totalItens } = useCart();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-3xl mx-auto px-2 sm:px-3 h-16 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1 sm:gap-2">
        <Link href="/home" aria-label="Ir para a página inicial" className="min-w-0 justify-self-start">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="OCA Distribuidora"
            className="h-8 w-auto max-w-12 object-contain sm:h-9 sm:max-w-none"
          />
        </Link>

        <nav aria-label="Navegação principal" className="flex items-center justify-center gap-0.5 rounded-xl bg-slate-100 p-1">
          {[{ href: "/orcamentos", nome: "Orçamentos" }, { href: "/vendas", nome: "Vendas" }, { href: "/relatorios", nome: "Relatórios" }].map(link => {
            const ativo = pathname === link.href || (link.href === "/orcamentos" && pathname.startsWith("/orcamento/"));
            return <Link key={link.href} href={link.href} aria-current={ativo ? "page" : undefined} className={`rounded-lg px-1 py-2.5 text-xs font-semibold sm:px-3 sm:text-sm ${ativo ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-white hover:text-slate-900"}`}>{link.nome}</Link>;
          })}
        </nav>
        <Link
          href="/carrinho"
          aria-label="Ver carrinho"
          className="relative inline-flex items-center justify-self-end gap-2 rounded-full bg-slate-900 text-white p-2 sm:px-4 text-sm font-medium active:scale-95 transition"
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
      <div className="mx-auto flex max-w-3xl items-center justify-end gap-3 px-3 pb-2 text-[13px] text-slate-500 sm:text-xs">
        <span>Usuário: <strong className="font-medium text-slate-700">{usuario}</strong></span>
        <form action="/api/auth/logout" method="post"><button className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-100">Sair</button></form>
      </div>
    </header>
  );
}
