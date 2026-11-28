import Link from "next/link";
import { getPedidos } from "@/lib/db";
import { ListaOrcamentos } from "@/components/ListaOrcamentos";
import { FiltroOrcamentos } from "@/components/FiltroOrcamentos";
import { CartaoResumo } from "@/components/CartaoResumo";
import { formatBRL } from "@/lib/format";
import { resolverPeriodo, filtrarPeriodo, dataCurta } from "@/lib/periodoOrcamentos";
import { separarHistorico } from "@/lib/historicoOrcamentos";
import { exigirSessao } from "@/lib/auth-servidor";

export const dynamic = "force-dynamic";

export default async function VendasPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const valor = (key: string) => typeof params[key] === "string" ? params[key] as string : undefined;
  let periodo;
  try { periodo = resolverPeriodo({ periodo: valor("periodo"), inicio: valor("inicio"), fim: valor("fim") }); }
  catch { return <section className="rounded-2xl bg-white p-6"><h1 className="text-xl font-bold">Período inválido</h1><p className="my-3">Escolha datas válidas, com início anterior ou igual ao fim.</p><Link href="/vendas" className="underline">Voltar às vendas de hoje</Link></section>; }
  const { usuario } = await exigirSessao();
  const { vendas } = separarHistorico(await getPedidos());
  const pedidos = filtrarPeriodo(vendas, periodo);
  const consulta = new URLSearchParams({ periodo: periodo.tipo });
  if (periodo.tipo === "personalizado") {
    consulta.set("inicio", periodo.inicio);
    consulta.set("fim", periodo.fim);
  }
  const retorno = periodo.tipo === "hoje" ? "/vendas" : `/vendas?${consulta}`;
  const total = pedidos.reduce((soma, pedido) => soma + pedido.valor_total, 0);
  return <section className="flex flex-col gap-5 pb-6">
    <div className="anim-entrada flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-slate-900 text-sky-300 shadow-sm">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="size-5"><path d="M3 3v18h18" /><path d="M7 15v-4M12 15V7M17 15v-6" /></svg>
        </span>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">Financeiro</p>
          <h1 className="text-2xl font-bold leading-tight text-slate-900">Vendas</h1>
          <p className="mt-0.5 text-sm text-slate-500">Orçamentos com pagamento finalizado.</p>
        </div>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-2.5">
      <CartaoResumo rotulo="Vendas finalizadas" valor={String(pedidos.length)} detalhe={pedidos.length === 1 ? "venda no período" : "vendas no período"} icone="M20 6 9 17l-5-5" tom="sky" atraso={60} />
      <CartaoResumo rotulo="Total vendido" valor={formatBRL(total)} detalhe="soma no período" icone="M2 6h20v12H2zM12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4M6 12h.01M18 12h.01" tom="emerald" atraso={100} />
    </div>
    <div className="anim-entrada" style={{ animationDelay: "120ms" }}><FiltroOrcamentos key={`${periodo.tipo}-${periodo.inicio}-${periodo.fim}`} periodo={periodo} destino="/vendas" /></div>
    <p className="anim-entrada text-sm font-medium text-slate-600" style={{ animationDelay: "160ms" }}>{dataCurta(periodo.inicio)}{periodo.inicio !== periodo.fim && ` a ${dataCurta(periodo.fim)}`} · {pedidos.length} {pedidos.length === 1 ? "venda" : "vendas"}</p>
    <ListaOrcamentos pedidos={pedidos} retorno={retorno} vendas admin={usuario.papel === "admin"} />
  </section>;
}
