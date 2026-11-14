"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FormaPagamento } from "@/lib/types";
import { PagamentoParcialForm } from "./PagamentoParcialForm";

const opcoes: { valor: FormaPagamento; nome: string }[] = [
  { valor: "pix", nome: "Pix" },
  { valor: "cartao", nome: "Cartão" },
  { valor: "dinheiro", nome: "Dinheiro" },
];

// Efetiva a venda direto na lista, sem abrir o orçamento. O clique já confirma.
// "Parcial" abre o formulário de recebimento parcial no próprio card.
export function EfetivarPagamento({ id, numero, revisao, restante, parcial = false }: {
  id: string; numero: number; revisao: number; restante: number; parcial?: boolean;
}) {
  const router = useRouter();
  const [salvando, setSalvando] = useState<FormaPagamento | null>(null);
  const [erro, setErro] = useState("");
  const [abrirParcial, setAbrirParcial] = useState(false);

  async function efetivar(forma: FormaPagamento) {
    if (salvando) return;
    setSalvando(forma); setErro("");
    try {
      const res = await fetch(`/api/pedidos/${encodeURIComponent(id)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ forma_pagamento: forma, revisao }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Não foi possível efetivar a venda. Tente novamente.");
      }
      router.refresh();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Falha ao efetivar a venda.");
      setSalvando(null);
    }
  }

  return <div className="flex min-w-0 flex-col gap-1 sm:ml-auto">
    <div role="group" aria-label={`Efetivar orçamento ${numero} com`} className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-slate-500">{parcial ? "Receber restante com" : "Receber com"}</span>
      {opcoes.map(opcao => <button key={opcao.valor} type="button" disabled={salvando !== null}
        aria-label={`Efetivar orçamento ${numero} com ${opcao.nome}`} onClick={() => efetivar(opcao.valor)}
        className="min-h-10 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 active:scale-[0.98] disabled:opacity-60">
        {salvando === opcao.valor ? "Efetivando…" : opcao.nome}
      </button>)}
      <button type="button" disabled={salvando !== null} aria-expanded={abrirParcial} onClick={() => setAbrirParcial(valor => !valor)}
        className={`min-h-10 rounded-lg border px-3 py-2 text-sm font-semibold transition disabled:opacity-60 ${abrirParcial ? "border-amber-700 bg-amber-100 text-amber-900" : "border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100"}`}>
        Parcial
      </button>
    </div>
    {abrirParcial && <PagamentoParcialForm id={id} restante={restante} revisao={revisao} onFechar={() => setAbrirParcial(false)} />}
    {erro && <p role="alert" className="text-sm text-red-700">{erro}</p>}
  </div>;
}
