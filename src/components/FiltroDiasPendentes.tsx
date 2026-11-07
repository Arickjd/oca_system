"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { dataCurta } from "@/lib/periodoOrcamentos";

export function FiltroDiasPendentes({ dias, hoje, diaSelecionado, intervalo }: { dias: { dia: string; quantidade: number }[]; hoje: string; diaSelecionado?: string; intervalo?: "semana-atual" | "mes" }) {
  const router = useRouter();
  const outros = dias.filter(d => d.dia !== hoje);
  const hojeAtivo = !intervalo && (!diaSelecionado || diaSelecionado === hoje);
  const outroDia = diaSelecionado && diaSelecionado !== hoje ? diaSelecionado : "";
  const classe = (ativo: boolean) => `inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold ${ativo ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`;
  return <section aria-label="Filtro de orçamentos pendentes" className="rounded-2xl border border-slate-200 bg-white p-4">
    <div className="flex flex-wrap gap-2">
      <Link href="/orcamentos" aria-current={hojeAtivo ? "page" : undefined} className={classe(hojeAtivo)}>
        Hoje <span className={`rounded-full px-2 py-0.5 text-xs ${hojeAtivo ? "bg-white/20" : "bg-white"}`}>{dias.find(d => d.dia === hoje)?.quantidade ?? 0}</span>
      </Link>
      <Link href="/orcamentos?periodo=semana-atual" aria-current={intervalo === "semana-atual" ? "page" : undefined} className={classe(intervalo === "semana-atual")}>Esta semana</Link>
      <Link href="/orcamentos?periodo=mes" aria-current={intervalo === "mes" ? "page" : undefined} className={classe(intervalo === "mes")}>Este mês</Link>
    </div>
    <label className="mt-3 block text-sm font-medium text-slate-600">Outros dias com pendências
      <select aria-label="Selecionar dia com orçamentos pendentes" value={outroDia} onChange={e => router.push(e.target.value ? `/orcamentos?dia=${e.target.value}` : "/orcamentos")} className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900">
        <option value="">Escolher outro dia</option>
        {outroDia && !outros.some(d => d.dia === outroDia) && <option value={outroDia}>{dataCurta(outroDia)} · 0 pendentes</option>}
        {outros.map(d => <option key={d.dia} value={d.dia}>{dataCurta(d.dia)} · {d.quantidade} {d.quantidade === 1 ? "pendente" : "pendentes"}</option>)}
      </select>
    </label>
    <p className="mt-3 text-xs text-slate-500">Dias de criação dos orçamentos, no horário de Brasília. Cada número indica os pagamentos ainda pendentes.</p>
  </section>;
}
