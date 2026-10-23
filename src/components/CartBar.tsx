"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/cart";
import { formatBRL } from "@/lib/format";

export function CartBar() {
  const { totalItens, totalValor } = useCart();
  const pathname = usePathname();

  // Não mostrar no carrinho/checkout nem quando vazio
  const esconder =
    pathname?.startsWith("/carrinho") ||
    pathname?.startsWith("/checkout") ||
    pathname?.startsWith("/gerenciar-produtos") ||
    pathname?.startsWith("/orcamentos") ||
    pathname?.startsWith("/orcamento/") ||
    totalItens === 0;

  if (esconder) return null;

  return (
    <div className="no-print fixed bottom-0 inset-x-0 z-30 p-3 pointer-events-none">
      <div className="max-w-3xl mx-auto pointer-events-auto">
        <Link
          href="/carrinho"
          className="flex items-center justify-between gap-3 rounded-2xl bg-slate-900 text-white shadow-xl shadow-slate-900/20 px-4 py-3 active:scale-[0.99] transition"
        >
          <span className="flex items-center gap-2">
            <span className="grid place-items-center w-7 h-7 rounded-full bg-amber-500 text-slate-900 text-sm font-bold">
              {totalItens}
            </span>
            <span className="font-medium">Ver carrinho</span>
          </span>
          <span className="font-semibold">{formatBRL(totalValor)}</span>
        </Link>
      </div>
    </div>
  );
}
