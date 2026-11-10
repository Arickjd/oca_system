import Link from "next/link";
import { EstatisticasVendedores } from "./EstatisticasVendedores";
import type { Pedido } from "@/lib/types";
import { formatBRL } from "@/lib/format";
import { resolverPeriodo, dataCurta } from "@/lib/periodoOrcamentos";
import { vendasPorUsuario } from "@/lib/vendasPorUsuario";
import { exigirSessao } from "@/lib/auth-servidor";

export async function VendasPorUsuario({ pedidos, params, detalhado = false }: {
  pedidos: Pedido[];
  params: Record<string, string | string[] | undefined>;
  detalhado?: boolean;
}) {
  const { usuario } = await exigirSessao();
  if (usuario.papel !== "admin") return null;
  const periodo = resolverPeriodo({ periodo: params.comissao === "mes" ? "mes" : "hoje" });
  const grupos = vendasPorUsuario(pedidos, periodo);
  const destino = detalhado ? "/relatorios/vendas-por-usuario" : "/relatorios";
  const filtro = (tipo: string) => {
    const consulta = new URLSearchParams();
    for (const [chave, valor] of Object.entries(params)) {
      if (typeof valor === "string") consulta.set(chave, valor);
    }
    consulta.set("comissao", tipo);
    return destino + "?" + consulta.toString() + "#vendas-por-usuario";
  };
  return <section id="vendas-por-usuario" className="scroll-mt-32 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-bold text-slate-900">Vendas por usuário</h2>
      {!detalhado && <Link className="text-sm font-semibold underline" href={`/relatorios/vendas-por-usuario?comissao=${periodo.tipo}`}>Ver detalhes</Link>}
    </div>
    <p className="mt-2 text-sm text-slate-600">Vendas finalizadas, atribuídas a quem criou o orçamento. Período pela criação do orçamento, no horário de Brasília.</p>
    <nav aria-label="Período das vendas por usuário" className="my-4 flex gap-2">
      {[["hoje", "Hoje"], ["mes", "Este mês"]].map(([tipo, nome]) => <Link key={tipo} href={filtro(tipo)} aria-current={periodo.tipo === tipo ? "page" : undefined} className={`rounded-lg px-4 py-2 text-sm font-semibold ${periodo.tipo === tipo ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}>{nome}</Link>)}
    </nav>
    <p className="mb-4 text-xs text-slate-500">{dataCurta(periodo.inicio)} a {dataCurta(periodo.fim)}</p>
    {detalhado ? <EstatisticasVendedores grupos={grupos} periodo={periodo} selecionado={typeof params.vendedor === "string" && grupos.some(grupo => grupo.id === params.vendedor) ? params.vendedor : undefined} /> : <div className="grid gap-3">
      {grupos.map(grupo => <article key={grupo.id} className="min-w-0 rounded-xl border border-slate-200 p-4">
        <h3 className="font-bold">{grupo.nome}</h3>
        <p className="text-xs text-slate-500">{grupo.vendas.length} venda(s)</p>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div><dt className="text-slate-500">Total de vendas</dt><dd className="font-semibold">{formatBRL(grupo.total)}</dd></div>
          <div><dt className="text-slate-500">Lucro bruto{grupo.lucro.parcial && " · Parcial"}</dt><dd className="font-semibold">{grupo.lucro.total === null ? "Indisponível" : formatBRL(grupo.lucro.total)}</dd></div>
        </dl>
        {grupo.lucro.semCusto > 0 && <p className="mt-2 text-xs text-amber-800">{grupo.lucro.semCusto} venda(s) com custo incompleto.</p>}

      </article>)}
    </div>}
  </section>;
}
