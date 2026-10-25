"use client";

import Link from "next/link";
import { SalvarProduto } from "@/components/SalvarProduto";
import { useCart } from "@/lib/cart";
import { formatBRL } from "@/lib/format";
import { RentabilidadeProduto } from "./RentabilidadeProduto";
import type { Produto } from "@/lib/types";

export default function Carrinho({ produtos }: { produtos: Pick<Produto, "id" | "custo_pack" | "preco_pack">[] }) {
  const {
    itens,
    totalValor,
    totalItens,
    atualizarItem,
    definirQuantidade,
    remover,
    carregado,
  } = useCart();

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
        Pedido no atacado{" "}
        <span className="text-slate-400 font-normal text-base">
          ({totalItens} {totalItens === 1 ? "item" : "itens"})
        </span>
      </h1>

      <div className="flex flex-col gap-2">
        {itens.map((item) => {
          const subtotal = item.preco_unitario * item.quantidade;
          const original = produtos.find(p => p.id === item.produto_id)?.preco_pack ?? item.preco_original ?? item.preco_unitario;
          const desconto = Math.max(0, Math.round((original - item.preco_unitario) * 100)) / 100;
          return (
            <SalvarProduto key={item.produto_id} item={item}>
            <div
              key={item.produto_id}
              className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-slate-900 text-sm">
                    Item do pedido
                  </h2>
                  <p className="text-xs text-slate-500">
                    Altere os dados deste item se necessário.
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Remover"
                  onClick={() => remover(item.produto_id)}
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

              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-500">Produto</span>
                <input
                  value={item.nome}
                  onChange={(event) =>
                    atualizarItem(item.produto_id, { nome: event.target.value })
                  }
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-amber-500"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-slate-500">
                    Valor da venda por pacote
                  </span>
                  <div className="flex items-center rounded-xl border border-slate-200 focus-within:border-amber-500">
                    <span className="pl-3 text-sm text-slate-400">R$</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={item.preco_unitario}
                      onChange={(event) =>
                        atualizarItem(item.produto_id, {
                          preco_unitario: Number(event.target.value),
                        })
                      }
                      className="min-w-0 w-full bg-transparent px-2 py-2.5 text-sm font-semibold text-slate-900 outline-none"
                    />
                  </div>
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-slate-500">
                    Itens por pacote
                  </span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    step="1"
                    value={item.pack_quantidade}
                    onChange={(event) =>
                      atualizarItem(item.produto_id, {
                        pack_quantidade: Number(event.target.value),
                      })
                    }
                    className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-500"
                  />
                </label>
              </div>

              <div className="rounded-xl bg-emerald-50 p-3 text-sm">
                <p className="text-slate-600">Valor original: {formatBRL(original)} por pacote</p>
                <p className="font-medium text-emerald-800">Desconto por pacote: {formatBRL(desconto)}</p>
                <p className="text-xs text-emerald-800">{desconto > 0 ? `Com desconto: ${formatBRL(item.preco_unitario)} · Economia total: ${formatBRL(desconto * item.quantidade)}` : "Reduza o valor da venda para aplicar um desconto somente neste orçamento."}</p>
              </div>
              <RentabilidadeProduto venda={item.preco_unitario} custo={produtos.find(p => p.id === item.produto_id)?.custo_pack} />
              <div className="flex items-end justify-between gap-3 border-t border-slate-100 pt-3">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-slate-500">
                    Quantidade de pacotes
                  </span>
                  <div className="flex items-center gap-1 rounded-lg bg-slate-100">
                  <button
                    type="button"
                    aria-label="Diminuir"
                    onClick={() =>
                      definirQuantidade(item.produto_id, item.quantidade - 1)
                    }
                    className="w-9 h-9 grid place-items-center text-xl font-bold text-slate-600 active:scale-90 transition"
                  >
                    −
                  </button>
                    <input
                      aria-label="Quantidade de pacotes"
                      type="number"
                      inputMode="numeric"
                      min="1"
                      step="1"
                      value={item.quantidade}
                      onChange={(event) =>
                        atualizarItem(item.produto_id, {
                          quantidade: Number(event.target.value),
                        })
                      }
                      className="w-12 bg-transparent text-center font-semibold text-slate-900 tabular-nums outline-none"
                    />
                  <button
                    type="button"
                    aria-label="Aumentar"
                    onClick={() =>
                      definirQuantidade(item.produto_id, item.quantidade + 1)
                    }
                    className="w-9 h-9 grid place-items-center text-xl font-bold text-amber-600 active:scale-90 transition"
                  >
                    +
                  </button>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Subtotal</p>
                  <span className="font-bold text-slate-900 tabular-nums">
                    {formatBRL(subtotal)}
                  </span>
                </div>
              </div>
            </div>
            </SalvarProduto>
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
