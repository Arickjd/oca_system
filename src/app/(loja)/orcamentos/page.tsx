import Link from "next/link";
import { getPedidos } from "@/lib/db";
import { FiltroDiasPendentes } from "@/components/FiltroDiasPendentes";
import { ListaOrcamentos } from "@/components/ListaOrcamentos";
import { CartaoResumo } from "@/components/CartaoResumo";
import { formatBRL } from "@/lib/format";
import { dataCurta, dataValida, diaLocal, filtrarPeriodo, resolverPeriodo } from "@/lib/periodoOrcamentos";
import { separarHistorico, diasPendentes } from "@/lib/historicoOrcamentos";
import { valorRestante } from "@/lib/pagamentos";

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
  const { abertos } = separarHistorico(todos);
  const pedidos = filtrarPeriodo(abertos, periodo);
  const retorno = intervalo ? `/orcamentos?periodo=${intervalo}` : dia && dia !== hoje ? `/orcamentos?dia=${dia}` : "/orcamentos";
  const total = pedidos.reduce((soma, pedido) => soma + valorRestante(pedido), 0);
  return <section className="flex flex-col gap-5 pb-6">
    <div className="anim-entrada flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-slate-900 text-amber-300 shadow-sm">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="size-5"><path d="M6 2h9l4 4v16l-3-2-3 2-3-2-4 2V2Z" /><path d="M9 9h6M9 13h6" /></svg>
        </span>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">Financeiro</p>
          <h1 className="text-2xl font-bold leading-tight text-slate-900">Orçamentos</h1>
          <p className="mt-0.5 text-sm text-slate-500">Em aberto, aguardando pagamento ou confirmação.</p>
        </div>
      </div>
      <Link href="/produtos" className="inline-flex min-h-11 items-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900">+ Novo orçamento</Link>
    </div>
    <div className="grid grid-cols-2 gap-2.5">
      <CartaoResumo rotulo="Em aberto" valor={String(pedidos.length)} detalhe={pedidos.length === 1 ? "orçamento no período" : "orçamentos no período"} icone="M6 2h9l4 4v16l-3-2-3 2-3-2-4 2V2Z" tom="amber" atraso={60} />
      <CartaoResumo rotulo="Total a receber" valor={formatBRL(total)} detalhe="saldo no período" icone="M2 6h20v12H2zM12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4M6 12h.01M18 12h.01" tom="emerald" atraso={100} />
    </div>
    <div className="anim-entrada" style={{ animationDelay: "120ms" }}><FiltroDiasPendentes dias={diasPendentes(todos)} hoje={hoje} diaSelecionado={dia} intervalo={intervalo} /></div>
    {intervalo && <p className="anim-entrada text-sm font-medium text-slate-600" style={{ animationDelay: "160ms" }}>{dataCurta(periodo.inicio)}{periodo.inicio !== periodo.fim && ` a ${dataCurta(periodo.fim)}`} · {pedidos.length} {pedidos.length === 1 ? "pendente" : "pendentes"}</p>}
    <ListaOrcamentos pedidos={pedidos} retorno={retorno} />
  </section>;
}
