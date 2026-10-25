"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { dataCurta } from "@/lib/periodoOrcamentos";

export function FiltroDiasPendentes({ dias, hoje, selecionado }: { dias: { dia: string; quantidade: number }[]; hoje: string; selecionado: string }) {
  const router = useRouter();
  const outros = dias.filter(d => d.dia !== hoje);
  return <section aria-label="Dias com orçamentos pendentes" className="rounded-2xl border border-slate-200 bg-white p-4">
    <div className="flex flex-wrap items-end gap-3">
      <Link href="/orcamentos" aria-current={selecionado === hoje ? "page" : undefined} className={`inline-flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold ${selecionado === hoje ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}>
        Hoje <span className={`rounded-full px-2 py-0.5 text-xs ${selecionado === hoje ? "bg-white/20" : "bg-white"}`}>{dias.find(d => d.dia === hoje)?.quantidade ?? 0}</span>
      </Link>
      <label className="min-w-0 flex-1 text-sm font-medium text-slate-600">Outros dias com pendências
        <select aria-label="Selecionar dia com orçamentos pendentes" value={selecionado === hoje ? "" : selecionado} onChange={e => router.push(e.target.value ? `/orcamentos?dia=${e.target.value}` : "/orcamentos")} className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900">
          <option value="">Escolher outro dia</option>
          {selecionado !== hoje && !outros.some(d => d.dia === selecionado) && <option value={selecionado}>{dataCurta(selecionado)} · 0 pendentes</option>}
          {outros.map(d => <option key={d.dia} value={d.dia}>{dataCurta(d.dia)} · {d.quantidade} {d.quantidade === 1 ? "pendente" : "pendentes"}</option>)}
        </select>
      </label>
    </div>
    <p className="mt-3 text-xs text-slate-500">Dias de criação dos orçamentos, no horário de Brasília. Cada número indica os pagamentos ainda pendentes.</p>
  </section>;
}
