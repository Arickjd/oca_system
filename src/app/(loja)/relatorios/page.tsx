import Link from "next/link";
import { getPedidos } from "@/lib/db";
import { formatBRL } from "@/lib/format";
import { FiltroOrcamentos } from "@/components/FiltroOrcamentos";
import { RelatorioOrcamentos } from "@/components/RelatorioOrcamentos";
import { GraficoOrcamentos } from "@/components/GraficoOrcamentos";
import { ExportarBanco } from "@/components/ExportarBanco";
import { resolverPeriodo, filtrarPeriodo, resumoPeriodo, dataCurta } from "@/lib/periodoOrcamentos";
import { exigirSessao } from "@/lib/auth-servidor";
import { resumoLucroVendas } from "@/lib/historicoOrcamentos";

export const dynamic = "force-dynamic";

export default async function RelatoriosPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const valor = (key: string) => typeof params[key] === "string" ? params[key] as string : undefined;
  let periodo;
  try { periodo = resolverPeriodo({ periodo: valor("periodo"), inicio: valor("inicio"), fim: valor("fim") }); }
  catch { return <section className="rounded-2xl bg-white p-6"><h1 className="text-xl font-bold">Período inválido</h1><p className="my-3">Escolha datas válidas, com início anterior ou igual ao fim.</p><Link href="/relatorios" className="underline">Voltar aos relatórios de hoje</Link></section>; }
  const { usuario } = await exigirSessao();
  const pedidos = filtrarPeriodo(await getPedidos(), periodo);
  const resumo = resumoPeriodo(pedidos);
  const admin = usuario.papel === "admin";
  const lucro = admin ? resumoLucroVendas(pedidos) : null;
  return <section className="flex min-w-0 flex-col gap-5 pb-6">
    <div><h1 className="text-2xl font-bold text-slate-900">Relatórios</h1><p className="mt-1 text-sm text-slate-500">Indicadores e documentos do período selecionado.</p></div>
    <FiltroOrcamentos key={`${periodo.tipo}-${periodo.inicio}-${periodo.fim}`} periodo={periodo} destino="/relatorios" />
    <div><p className="text-sm font-medium text-slate-600">{dataCurta(periodo.inicio)}{periodo.inicio !== periodo.fim && ` a ${dataCurta(periodo.fim)}`} · {pedidos.length} registro(s)</p>
      <div className={`mt-3 grid grid-cols-1 gap-3 ${admin ? "sm:grid-cols-2 md:grid-cols-4" : "sm:grid-cols-3"}`}>
        <div className="rounded-2xl bg-slate-900 p-4 text-white"><p className="text-sm text-slate-300">Total em orçamentos</p><strong className="text-xl">{formatBRL(resumo.total)}</strong></div>
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sky-900"><p className="text-sm">Finalizados · {resumo.pagos}</p><strong className="text-xl">{formatBRL(resumo.recebido)}</strong></div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900"><p className="text-sm">Pendentes · {resumo.pendentes}</p><strong className="text-xl">{formatBRL(resumo.pendente)}</strong></div>
        {lucro && <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4 text-teal-950">
          <p className="text-sm">Lucro bruto{lucro.parcial && " · Parcial"}</p>
          <strong className={`text-xl ${lucro.total !== null && lucro.total < 0 ? "text-red-700" : ""}`}>{lucro.total === null ? "Indisponível" : formatBRL(lucro.total)}</strong>
          {lucro.semCusto > 0 && <p className="mt-1 text-xs">{lucro.semCusto === 1 ? "1 venda com custo incompleto" : `${lucro.semCusto} vendas com custo incompleto`}</p>}
        </div>}
      </div>
    </div>
    <GraficoOrcamentos pedidos={pedidos} periodo={periodo} />
    <RelatorioOrcamentos key={`${periodo.inicio}-${periodo.fim}`} periodo={periodo} vazio={!pedidos.length} admin={admin} temVendas={resumo.pagos > 0} />
    <ExportarBanco />
  </section>;
}
