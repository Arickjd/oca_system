"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links = [
  { href: "/admin", label: "Início" },
  { href: "/admin/pedidos", label: "Pedidos" },
  { href: "/admin/produtos", label: "Produtos" },
  { href: "/admin/categorias", label: "Categorias" },
  { href: "/admin/config", label: "Config" },
];

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function sair() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  const ativo = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="max-w-4xl mx-auto px-3 h-14 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="OCA" className="h-8 w-auto object-contain" />
          <span className="font-semibold text-slate-700 hidden sm:inline">
            Painel
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="text-sm text-slate-500 hover:text-slate-800 px-2 py-1"
          >
            Ver loja
          </Link>
          <button
            type="button"
            onClick={sair}
            className="text-sm rounded-lg bg-slate-100 text-slate-700 px-3 py-1.5 font-medium hover:bg-slate-200"
          >
            Sair
          </button>
        </div>
      </div>
      <nav className="max-w-4xl mx-auto px-3 flex gap-1 overflow-x-auto no-scrollbar">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`shrink-0 px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${
              ativo(l.href)
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
