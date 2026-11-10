"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatBRL } from "@/lib/format";
import type { FormaPagamento } from "@/lib/types";

const nomes: Record<FormaPagamento, string> = { pix: "Pix", cartao: "Cartão", dinheiro: "Dinheiro" };
const opcoes: { valor: FormaPagamento; nome: string; detalhe: string }[] = [
  { valor: "pix", nome: "Pix", detalhe: "Recebimento imediato" },
  { valor: "cartao", nome: "Cartão", detalhe: "Débito ou crédito" },
  { valor: "dinheiro", nome: "Dinheiro", detalhe: "Em espécie" },
];

export function PagamentoOrcamento({ id, finalizado, forma, revisao, valor }: {
  id: string; finalizado: boolean; forma?: FormaPagamento; revisao: number; valor: number;
}) {
  const router = useRouter();
  const [salvando, setSalvando] = useState<FormaPagamento | null>(null);
  const [erro, setErro] = useState("");
  const [confirmada, setConfirmada] = useState<FormaPagamento | null>(null);

  // Selecionar a forma de pagamento já efetiva a venda; não há etapa de confirmação.
  async function efetivar(escolhida: FormaPagamento) {
    if (salvando) return;
    setSalvando(escolhida); setErro("");
    try {
      const res = await fetch(`/api/pedidos/${encodeURIComponent(id)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ forma_pagamento: escolhida, revisao }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Não foi possível efetivar a venda. Tente novamente.");
      }
      setConfirmada(escolhida);
      router.refresh();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Falha ao efetivar a venda.");
    } finally {
      setSalvando(null);
    }
  }

  const formaFinal = confirmada ?? forma;
  if (finalizado || confirmada) return <p role="status" className="rounded-xl bg-emerald-50 p-4 font-semibold text-emerald-800">Finalizado{formaFinal ? ` · ${nomes[formaFinal]}` : ""}</p>;

  return <section className="rounded-xl border border-amber-200 bg-white p-4">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h2 className="font-semibold text-amber-800">Pagamento pendente</h2>
      <strong className="text-lg tabular-nums text-slate-900">{formatBRL(valor)}</strong>
    </div>
    <p className="mt-1 text-sm text-slate-500">Toque na forma de pagamento para efetivar a venda. A confirmação é imediata.</p>
    <div role="group" aria-label="Forma de pagamento" className="mt-3 grid grid-cols-3 gap-2">
      {opcoes.map(opcao => <button key={opcao.valor} type="button" disabled={salvando !== null}
        aria-label={`Efetivar venda com ${opcao.nome}`} onClick={() => efetivar(opcao.valor)}
        className="flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl border border-slate-300 bg-white px-2 py-2 text-center transition hover:border-emerald-600 hover:bg-emerald-50 active:scale-[0.98] disabled:opacity-60">
        <span className="text-sm font-semibold text-slate-900">{salvando === opcao.valor ? "Efetivando…" : opcao.nome}</span>
        <span className="hidden text-[11px] leading-tight text-slate-500 sm:block">{opcao.detalhe}</span>
      </button>)}
    </div>
    {erro && <p role="alert" className="mt-2 text-sm text-red-700">{erro}</p>}
  </section>;
}
