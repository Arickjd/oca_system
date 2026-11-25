"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FormaPagamento } from "@/lib/types";
import { PagamentoParcialForm } from "./PagamentoParcialForm";
import { ConfirmarPagamento } from "./ConfirmarPagamento";

const opcoes: { valor: FormaPagamento; nome: string }[] = [
  { valor: "pix", nome: "Pix" },
  { valor: "cartao", nome: "Cartão" },
  { valor: "dinheiro", nome: "Dinheiro" },
];

// Efetiva a venda direto na lista, sem abrir o orçamento. O toque pede confirmação.
// "Parcial" abre o formulário de recebimento parcial no próprio card.
export function EfetivarPagamento({ id, numero, revisao, restante, parcial = false }: {
  id: string; numero: number; revisao: number; restante: number; parcial?: boolean;
}) {
  const router = useRouter();
  const [salvando, setSalvando] = useState<FormaPagamento | null>(null);
  const [erro, setErro] = useState("");
  const [abrirParcial, setAbrirParcial] = useState(false);
  const [confirmando, setConfirmando] = useState<FormaPagamento | null>(null);

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
      setConfirmando(null);
      router.refresh();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Falha ao efetivar a venda.");
      setSalvando(null);
      setConfirmando(null);
    }
  }

  return <div className="flex w-full min-w-0 flex-col gap-2">
    <div role="group" aria-label={`Efetivar orçamento ${numero} com`} className="grid grid-cols-4 gap-1.5">
      {opcoes.map(opcao => <button key={opcao.valor} type="button" disabled={salvando !== null}
        aria-label={`Efetivar orçamento ${numero} com ${opcao.nome}`} onClick={() => setConfirmando(opcao.valor)}
        className="min-h-10 rounded-lg bg-emerald-700 px-1 py-2 text-xs font-semibold text-white transition hover:bg-emerald-800 active:scale-[0.98] disabled:opacity-60 sm:text-sm">
        {salvando === opcao.valor ? "Efetivando…" : opcao.nome}
      </button>)}
      <button type="button" disabled={salvando !== null} aria-expanded={abrirParcial} onClick={() => setAbrirParcial(valor => !valor)}
        className={`min-h-10 rounded-lg border px-1 py-2 text-xs font-semibold transition disabled:opacity-60 sm:text-sm ${abrirParcial ? "border-amber-700 bg-amber-100 text-amber-900" : "border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100"}`}>
        Parcial
      </button>
    </div>
    {abrirParcial && <PagamentoParcialForm id={id} restante={restante} revisao={revisao} onFechar={() => setAbrirParcial(false)} />}
    {confirmando && <ConfirmarPagamento forma={confirmando} valor={restante} parcial={parcial} ocupado={salvando !== null}
      onConfirmar={() => efetivar(confirmando)} onCancelar={() => { if (!salvando) setConfirmando(null); }} />}
    {erro && <p role="alert" className="text-sm text-red-700">{erro}</p>}
  </div>;
}
