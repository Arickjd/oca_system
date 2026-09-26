"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";

export function SiteHeader() {
  const { totalItens } = useCart();

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-3xl mx-auto px-3 h-14 flex items-center justify-between gap-2">
        <Link href="/categorias" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="OCA Distribuidora"
            className="h-9 w-auto object-contain"
          />
        </Link>

        <Link
          href="/carrinho"
          aria-label="Ver carrinho"
          className="relative inline-flex items-center gap-2 rounded-full bg-slate-900 text-white px-4 py-2 text-sm font-medium active:scale-95 transition"
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
    </header>
  );
}
