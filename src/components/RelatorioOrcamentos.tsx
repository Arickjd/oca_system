"use client";
import { useState } from "react";
import type { Periodo } from "@/lib/periodoOrcamentos";

export function RelatorioOrcamentos({ periodo, vazio }: { periodo: Periodo; vazio: boolean }) {
  const [gerando, setGerando] = useState("");
  const [erro, setErro] = useState("");
  async function baixar(tipo: string) {
    setGerando(tipo); setErro("");
    try {
      const query = new URLSearchParams({ periodo: "personalizado", inicio: periodo.inicio, fim: periodo.fim, tipo });
      const res = await fetch(`/api/orcamentos/relatorio?${query}`);
      if (!res.ok) { const data = await res.json().catch(() => ({})); throw new Error(data.error || "Não foi possível gerar o relatório."); }
      const url = URL.createObjectURL(await res.blob());
      const link = document.createElement("a"); link.href = url;
      link.download = `relatorio-${tipo}-${periodo.inicio}-${periodo.fim}.pdf`;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) { setErro(error instanceof Error ? error.message : "Falha ao gerar relatório."); }
    finally { setGerando(""); }
  }
  return <section className="rounded-2xl border border-slate-200 bg-white p-4">
    <h2 className="font-semibold">Relatório do período</h2>
    <p className="mt-1 text-sm text-slate-500">Resumido: uma linha por orçamento. Detalhado: todos os produtos de cada orçamento.</p>
    <div className="mt-3 flex flex-wrap gap-2">
      {[['resumido', 'PDF resumido'], ['detalhado', 'PDF detalhado']].map(([tipo, nome]) => <button key={tipo} type="button" disabled={!!gerando || vazio} onClick={() => baixar(tipo)} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold disabled:opacity-40">{gerando === tipo ? "Gerando…" : nome}</button>)}
    </div>
    {erro && <p role="alert" className="mt-2 text-sm text-red-700">{erro}</p>}
  </section>;
}
