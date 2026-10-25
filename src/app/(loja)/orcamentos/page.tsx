import Link from "next/link";
import { getPedidos } from "@/lib/db";
import { FiltroDiasPendentes } from "@/components/FiltroDiasPendentes";
import { ListaOrcamentos } from "@/components/ListaOrcamentos";
import { diaLocal, dataValida, filtrarPeriodo } from "@/lib/periodoOrcamentos";
import { separarHistorico, diasPendentes } from "@/lib/historicoOrcamentos";

export const dynamic = "force-dynamic";

export default async function OrcamentosPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const hoje = diaLocal(new Date());
  const dia = params.dia === undefined ? hoje : params.dia;
  if (typeof dia !== "string" || !dataValida(dia)) return <section className="rounded-2xl bg-white p-6"><h1 className="text-xl font-bold">Dia inválido</h1><p className="my-3">Escolha um dia válido para consultar os orçamentos.</p><Link href="/orcamentos" className="underline">Voltar para hoje</Link></section>;
  const todos = await getPedidos();
  const { pendentes } = separarHistorico(todos);
  const pedidos = filtrarPeriodo(pendentes, { tipo: "personalizado", inicio: dia, fim: dia });
  const retorno = dia === hoje ? "/orcamentos" : `/orcamentos?dia=${dia}`;
  return <section className="flex flex-col gap-5 pb-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-bold text-slate-900">Orçamentos</h1><p className="mt-1 text-sm text-slate-500">Somente orçamentos com pagamento pendente.</p></div>
      <Link href="/produtos" className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white">+ Novo orçamento</Link>
    </div>
    <FiltroDiasPendentes dias={diasPendentes(todos)} hoje={hoje} selecionado={dia} />
    <ListaOrcamentos pedidos={pedidos} retorno={retorno} />
  </section>;
}
