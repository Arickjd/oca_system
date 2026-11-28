type Tom = "amber" | "emerald" | "sky";

const tons: Record<Tom, { borda: string; caixa: string }> = {
  amber: { borda: "border-amber-200", caixa: "bg-amber-100 text-amber-800" },
  emerald: { borda: "border-emerald-200", caixa: "bg-emerald-100 text-emerald-800" },
  sky: { borda: "border-sky-200", caixa: "bg-sky-100 text-sky-800" },
};

export function CartaoResumo({ rotulo, valor, detalhe, icone, tom, atraso = 0 }: {
  rotulo: string; valor: string; detalhe: string; icone: string; tom: Tom; atraso?: number;
}) {
  const estilo = tons[tom];
  return <div className={`anim-entrada rounded-2xl border bg-white p-3.5 shadow-sm sm:p-4 ${estilo.borda}`} style={{ animationDelay: `${atraso}ms` }}>
    <div className="flex items-center gap-2">
      <span className={`grid size-7 shrink-0 place-items-center rounded-lg ${estilo.caixa}`}>
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-4"><path d={icone} /></svg>
      </span>
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{rotulo}</span>
    </div>
    <p className="mt-2 text-xl font-bold tabular-nums text-slate-900 sm:text-2xl">{valor}</p>
    <p className="mt-0.5 text-[11px] text-slate-500">{detalhe}</p>
  </div>;
}
