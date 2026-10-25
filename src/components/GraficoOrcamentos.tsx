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
      <div className="mt-5 overflow-x-auto pb-2" tabIndex={0} role="region" aria-label="Gráfico diário. Role horizontalmente para visualizar mais dias.">
        <div aria-hidden="true" className="flex min-w-full items-end border-b border-slate-200">
          {dias.map(d => <div key={d.dia} className="min-w-16 flex-1 px-2">
            <div className="flex h-40 items-end justify-center gap-1.5">
              {[{ valor: d.pendentes, cor: "border border-amber-200 bg-amber-50" }, { valor: d.vendas, cor: "border border-emerald-200 bg-emerald-50" }].map((barra, i) => <div key={i} className="flex h-full w-5 flex-col justify-end">
                <span className="mb-1 text-center text-xs font-semibold text-slate-600">{barra.valor}</span>
                <div title={`${dataCurta(d.dia)} · ${barra.valor} ${i === 0 ? "pendentes" : "vendas"}`} style={{ height: barra.valor ? `${barra.valor / maior * 128}px` : "2px" }} className={`rounded-t ${barra.valor ? barra.cor : "bg-slate-200"}`} />
              </div>)}
            </div>
            <p className="py-3 text-center text-[11px] text-slate-500">{dataCurta(d.dia).slice(0, 5)}</p>
          </div>)}
        </div>
      </div>
      <div className="sr-only"><table><caption>Quantidade de orçamentos pendentes e vendas finalizadas por dia</caption><thead><tr><th scope="col">Dia</th><th scope="col">Orçamentos pendentes</th><th scope="col">Vendas finalizadas</th></tr></thead><tbody>{dias.map(d => <tr key={d.dia}><th scope="row">{dataCurta(d.dia)}</th><td>{d.pendentes}</td><td>{d.vendas}</td></tr>)}</tbody></table></div>
      <p className="mt-3 text-xs text-slate-500">{somenteComRegistros ? "Neste intervalo, são mostrados apenas os dias com registros. " : ""}Cada orçamento aparece uma única vez: como pendente ou como venda finalizada.</p>
    </>}
  </section>;
}
