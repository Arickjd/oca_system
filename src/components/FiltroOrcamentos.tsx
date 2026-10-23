"use client";
import Link from "next/link";
import { useState } from "react";
import type { Periodo } from "@/lib/periodoOrcamentos";

export function FiltroOrcamentos({ periodo }: { periodo: Periodo }) {
  const [erro, setErro] = useState("");
  const [personalizado, setPersonalizado] = useState(periodo.tipo === "personalizado");
  const classe = (ativo: boolean) => `rounded-xl px-4 py-2.5 text-sm font-semibold ${ativo ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`;
  return <section aria-label="Período dos orçamentos" className="rounded-2xl border border-slate-200 bg-white p-4">
    <div className="flex flex-wrap gap-2">
      <Link href="/orcamentos" aria-current={periodo.tipo === "hoje" ? "page" : undefined} className={classe(periodo.tipo === "hoje")}>Hoje</Link>
      <Link href="/orcamentos?periodo=semana" aria-current={periodo.tipo === "semana" ? "page" : undefined} className={classe(periodo.tipo === "semana")}>Últimos 7 dias</Link>
      <button type="button" aria-expanded={personalizado} onClick={() => setPersonalizado(v => !v)} className={classe(periodo.tipo === "personalizado")}>Escolher datas</button>
    </div>
    {personalizado && <form action="/orcamentos" method="get" onSubmit={event => {
      const dados = new FormData(event.currentTarget);
      if (String(dados.get("inicio")) > String(dados.get("fim"))) {
        event.preventDefault(); setErro("A data inicial deve ser anterior ou igual à final.");
      }
    }} className="mt-4 flex flex-wrap items-end gap-3">
      <input type="hidden" name="periodo" value="personalizado" />
      <label className="min-w-0 flex-1 text-sm">De<input name="inicio" type="date" required defaultValue={periodo.inicio} className="mt-1 w-full rounded-lg border p-2.5" /></label>
      <label className="min-w-0 flex-1 text-sm">Até<input name="fim" type="date" required defaultValue={periodo.fim} className="mt-1 w-full rounded-lg border p-2.5" /></label>
      <button className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">Aplicar</button>
    </form>}
    {erro && <p role="alert" className="mt-2 text-sm text-red-700">{erro}</p>}
    <p className="mt-3 text-xs text-slate-500">Por data de criação do orçamento, no horário de Brasília. Os dias inicial e final estão incluídos.</p>
  </section>;
}
