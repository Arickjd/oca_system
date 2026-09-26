"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";
import { formatBRL, modoLabel } from "@/lib/format";

export default function CarrinhoPage() {
  const { itens, totalValor, totalItens, definirQuantidade, remover, carregado } =
    useCart();

  if (!carregado) {
    return <div className="py-16 text-center text-slate-400 text-sm">Carregando…</div>;
  }

  if (itens.length === 0) {
    return (
      <div className="py-16 flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-slate-100 grid place-items-center text-slate-300">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            className="w-8 h-8"
          >
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
          </svg>
        </div>
        <div>
          <p className="font-semibold text-slate-700">Seu carrinho está vazio</p>
          <p className="text-sm text-slate-500">Adicione produtos do catálogo.</p>
        </div>
        <Link
          href="/categorias"
          className="rounded-xl bg-slate-900 text-white px-5 py-2.5 text-sm font-medium"
        >
          Ver catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-4">
      <h1 className="text-xl font-bold text-slate-900">
        Carrinho{" "}
        <span className="text-slate-400 font-normal text-base">
          ({totalItens} {totalItens === 1 ? "item" : "itens"})
        </span>
      </h1>

      <div className="flex flex-col gap-2">
        {itens.map((item) => {
          const subtotal = item.preco_unitario * item.quantidade;
          return (
            <div
              key={`${item.produto_id}:${item.modo}`}
              className="bg-white rounded-2xl border border-slate-200 p-3 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-900 text-sm leading-tight">
                    {item.nome}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {modoLabel(item.modo, item.pack_quantidade)} ·{" "}
                    {formatBRL(item.preco_unitario)}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Remover"
                  onClick={() => remover(item.produto_id, item.modo)}
                  className="text-slate-400 hover:text-red-500 shrink-0 p-1"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="w-5 h-5"
                  >
                    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                  </svg>
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 rounded-lg bg-slate-100">
                  <button
                    type="button"
                    aria-label="Diminuir"
                    onClick={() =>
                      definirQuantidade(
                        item.produto_id,
                        item.modo,
                        item.quantidade - 1
                      )
                    }
                    className="w-9 h-9 grid place-items-center text-xl font-bold text-slate-600 active:scale-90 transition"
                  >
                    −
                  </button>
                  <span className="w-8 text-center font-semibold text-slate-900 tabular-nums">
                    {item.quantidade}
                  </span>
                  <button
                    type="button"
                    aria-label="Aumentar"
                    onClick={() =>
                      definirQuantidade(
                        item.produto_id,
                        item.modo,
                        item.quantidade + 1
                      )
                    }
                    className="w-9 h-9 grid place-items-center text-xl font-bold text-amber-600 active:scale-90 transition"
                  >
                    +
                  </button>
                </div>
                <span className="font-semibold text-slate-900 tabular-nums">
                  {formatBRL(subtotal)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-between">
        <span className="text-slate-500">Total</span>
        <span className="text-2xl font-bold text-slate-900 tabular-nums">
          {formatBRL(totalValor)}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <Link
          href="/checkout"
          className="rounded-xl bg-slate-900 text-white text-center px-5 py-3.5 font-semibold active:scale-[0.99] transition"
        >
          Finalizar pedido
        </Link>
        <Link
          href="/produtos"
          className="rounded-xl bg-white border border-slate-200 text-slate-700 text-center px-5 py-3 font-medium"
        >
          Continuar comprando
        </Link>
      </div>
    </div>
  );
}
