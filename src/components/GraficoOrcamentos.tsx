import type { Pedido } from "@/lib/types";
import { movimentoDiario } from "@/lib/historicoOrcamentos";
import { dataCurta, type Periodo } from "@/lib/periodoOrcamentos";

export function GraficoOrcamentos({ pedidos, periodo }: { pedidos: Pedido[]; periodo: Periodo }) {
  const { dias, somenteComRegistros } = movimentoDiario(pedidos, periodo);
  const maior = dias.reduce((max, d) => Math.max(max, d.pendentes, d.vendas), 1);
  return <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
    <h2 className="font-semibold text-slate-900">Orçamentos e vendas por dia</h2>
    <p className="mt-1 text-sm text-slate-500">Quantidade por data de criação, conforme a situação atual do pagamento.</p>
    <div className="mt-4 flex flex-wrap gap-4 text-xs font-medium text-slate-600">
      <span className="flex items-center gap-2"><span className="h-3 w-3 rounded border border-amber-200 bg-amber-50" />Orçamentos pendentes</span>
      <span className="flex items-center gap-2"><span className="h-3 w-3 rounded border border-emerald-200 bg-emerald-50" />Vendas finalizadas</span>
    </div>
    {!pedidos.length ? <p className="py-10 text-center text-sm text-slate-500">Nenhum registro no período selecionado.</p> : <>
      <div className="mt-5" role="region" aria-label="Gráfico diário de orçamentos pendentes e vendas finalizadas">
        <div aria-hidden="true" className="flex min-w-0 flex-col gap-3">
          {dias.map(d => <div key={d.dia} className="grid min-w-0 grid-cols-[4rem_minmax(0,1fr)] items-center gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0 sm:grid-cols-[5rem_minmax(0,1fr)]">
            <time dateTime={d.dia} className="text-[11px] font-medium tabular-nums text-slate-500 sm:text-xs">{dataCurta(d.dia)}</time>
            <div className="flex min-w-0 flex-col gap-1.5">
              {[{ valor: d.pendentes, cor: "border border-amber-200 bg-amber-50" }, { valor: d.vendas, cor: "border border-emerald-200 bg-emerald-50" }].map((barra, i) => <div key={i} className="grid min-w-0 grid-cols-[minmax(0,1fr)_2rem] items-center gap-2" title={`${dataCurta(d.dia)} · ${barra.valor} ${i === 0 ? "pendentes" : "vendas"}`}>
                <div className="h-4 min-w-0 rounded bg-slate-50">
                  <div style={{ width: barra.valor ? `${barra.valor / maior * 100}%` : "2px" }} className={`h-full rounded ${barra.valor ? barra.cor : "bg-slate-200"}`} />
                </div>
                <span className="text-right text-xs font-semibold tabular-nums text-slate-600">{barra.valor}</span>
              </div>)}
            </div>
          </div>)}
        </div>
      </div>
      <div className="sr-only"><table><caption>Quantidade de orçamentos pendentes e vendas finalizadas por dia</caption><thead><tr><th scope="col">Dia</th><th scope="col">Orçamentos pendentes</th><th scope="col">Vendas finalizadas</th></tr></thead><tbody>{dias.map(d => <tr key={d.dia}><th scope="row">{dataCurta(d.dia)}</th><td>{d.pendentes}</td><td>{d.vendas}</td></tr>)}</tbody></table></div>
      <p className="mt-3 text-xs text-slate-500">{somenteComRegistros ? "Neste intervalo, são mostrados apenas os dias com registros. " : ""}Cada orçamento aparece uma única vez: como pendente ou como venda finalizada.</p>
    </>}
  </section>;
}
