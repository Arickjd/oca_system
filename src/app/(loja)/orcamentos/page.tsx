import Link from "next/link";
import { getPedidos } from "@/lib/db";
import { FiltroDiasPendentes } from "@/components/FiltroDiasPendentes";
import { ListaOrcamentos } from "@/components/ListaOrcamentos";
import { dataCurta, dataValida, diaLocal, filtrarPeriodo, resolverPeriodo } from "@/lib/periodoOrcamentos";
import { separarHistorico, diasPendentes } from "@/lib/historicoOrcamentos";

export const dynamic = "force-dynamic";

export default async function OrcamentosPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const agora = new Date();
  const hoje = diaLocal(agora);
  const dia = params.dia;
  if (dia !== undefined && (typeof dia !== "string" || !dataValida(dia))) return <section className="rounded-2xl bg-white p-6"><h1 className="text-xl font-bold">Dia inválido</h1><p className="my-3">Escolha um dia válido para consultar os orçamentos.</p><Link href="/orcamentos" className="underline">Voltar para hoje</Link></section>;
  const intervalo = !dia && (params.periodo === "semana-atual" || params.periodo === "mes") ? params.periodo : undefined;
  const periodo = resolverPeriodo(dia ? { periodo: "personalizado", inicio: dia, fim: dia } : { periodo: intervalo }, agora);
  const todos = await getPedidos();
  const { pendentes } = separarHistorico(todos);
  const pedidos = filtrarPeriodo(pendentes, periodo);
  const retorno = intervalo ? `/orcamentos?periodo=${intervalo}` : dia && dia !== hoje ? `/orcamentos?dia=${dia}` : "/orcamentos";
  return <section className="flex flex-col gap-5 pb-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-bold text-slate-900">Orçamentos</h1><p className="mt-1 text-sm text-slate-500">Somente orçamentos com pagamento pendente.</p></div>
      <Link href="/produtos" className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white">+ Novo orçamento</Link>
    </div>
    <FiltroDiasPendentes dias={diasPendentes(todos)} hoje={hoje} diaSelecionado={dia} intervalo={intervalo} />
    {intervalo && <p className="text-sm font-medium text-slate-600">{dataCurta(periodo.inicio)}{periodo.inicio !== periodo.fim && ` a ${dataCurta(periodo.fim)}`} · {pedidos.length} pendente(s)</p>}
    <ListaOrcamentos pedidos={pedidos} retorno={retorno} />
  </section>;
}
