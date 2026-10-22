"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FormaPagamento } from "@/lib/types";

const nomes = { pix: "Pix", cartao: "Cartão", dinheiro: "Dinheiro" };

export function PagamentoOrcamento({ id, finalizado, forma }: { id: string; finalizado: boolean; forma?: FormaPagamento }) {
  const router = useRouter();
  const [selecionada, setSelecionada] = useState<FormaPagamento | "">("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [confirmada, setConfirmada] = useState<FormaPagamento | null>(null);

  async function finalizar() {
    if (!selecionada) return;
    setSalvando(true); setErro("");
    try {
      const res = await fetch(`/api/pedidos/${encodeURIComponent(id)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ forma_pagamento: selecionada }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Não foi possível finalizar o pagamento.");
      }
      setConfirmada(selecionada); router.refresh();
    } catch (error) { setErro(error instanceof Error ? error.message : "Falha ao salvar."); }
    finally { setSalvando(false); }
  }

  const formaFinal = confirmada ?? forma;
  if (finalizado || confirmada) return <p role="status" className="rounded-xl bg-emerald-50 p-4 font-semibold text-emerald-800">Finalizado{formaFinal ? ` · ${nomes[formaFinal]}` : ""}</p>;

  return <section className="rounded-xl border border-amber-200 bg-white p-4">
    <h2 className="font-semibold text-amber-800">Pagamento pendente</h2>
    <p className="mt-1 text-sm text-slate-500">Após receber, selecione a forma de pagamento e confirme.</p>
    <label className="mt-3 block text-sm">Forma de pagamento
      <select disabled={salvando} value={selecionada} onChange={e => setSelecionada(e.target.value as FormaPagamento | "")} className="mt-1 w-full rounded-lg border border-slate-300 p-3">
        <option value="">Selecione…</option>
        <option value="pix">Pix</option><option value="cartao">Cartão</option><option value="dinheiro">Dinheiro</option>
      </select>
    </label>
    <button type="button" disabled={!selecionada || salvando} onClick={finalizar} className="mt-3 rounded-lg bg-emerald-700 px-4 py-3 font-semibold text-white disabled:opacity-50">{salvando ? "Salvando…" : "Confirmar pagamento e finalizar"}</button>
    {erro && <p role="alert" className="mt-2 text-sm text-red-700">{erro}</p>}
  </section>;
}
