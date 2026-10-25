import Link from "next/link";
import { getPedidos } from "@/lib/db";
import { ListaOrcamentos } from "@/components/ListaOrcamentos";
import { FiltroOrcamentos } from "@/components/FiltroOrcamentos";
import { resolverPeriodo, filtrarPeriodo, dataCurta } from "@/lib/periodoOrcamentos";
import { separarHistorico } from "@/lib/historicoOrcamentos";

export const dynamic = "force-dynamic";

export default async function VendasPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const valor = (key: string) => typeof params[key] === "string" ? params[key] as string : undefined;
  let periodo;
  try { periodo = resolverPeriodo({ periodo: valor("periodo"), inicio: valor("inicio"), fim: valor("fim") }); }
  catch { return <section className="rounded-2xl bg-white p-6"><h1 className="text-xl font-bold">Período inválido</h1><p className="my-3">Escolha datas válidas, com início anterior ou igual ao fim.</p><Link href="/vendas" className="underline">Voltar às vendas de hoje</Link></section>; }
  const { vendas } = separarHistorico(await getPedidos());
  const pedidos = filtrarPeriodo(vendas, periodo);
  return <section className="flex flex-col gap-5 pb-6">
    <div><h1 className="text-2xl font-bold text-slate-900">Vendas</h1><p className="mt-1 text-sm text-slate-500">Orçamentos com pagamento finalizado.</p></div>
    <FiltroOrcamentos key={`${periodo.tipo}-${periodo.inicio}-${periodo.fim}`} periodo={periodo} destino="/vendas" />
    <p className="text-sm font-medium text-slate-600">{dataCurta(periodo.inicio)}{periodo.inicio !== periodo.fim && ` a ${dataCurta(periodo.fim)}`} · {pedidos.length} venda(s)</p>
    <ListaOrcamentos pedidos={pedidos} retorno="/vendas" vendas />
  </section>;
}
