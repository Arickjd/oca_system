import Link from "next/link";
import { EstatisticasVendedores } from "./EstatisticasVendedores";
import type { Pedido } from "@/lib/types";
import { formatBRL } from "@/lib/format";
import { dataCurta, type Periodo } from "@/lib/periodoOrcamentos";
import { vendasPorUsuario } from "@/lib/vendasPorUsuario";
import { exigirSessao } from "@/lib/auth-servidor";

export async function VendasPorUsuario({ pedidos, periodo, vendedor, detalhado = false }: {
  pedidos: Pedido[];
  periodo: Periodo;
  vendedor?: string;
  detalhado?: boolean;
}) {
  const { usuario } = await exigirSessao();
  if (usuario.papel !== "admin") return null;
  const grupos = vendasPorUsuario(pedidos, periodo);
  const consulta = new URLSearchParams({ periodo: periodo.tipo });
  if (periodo.tipo === "personalizado") {
    consulta.set("inicio", periodo.inicio);
    consulta.set("fim", periodo.fim);
  }
  return <section id="vendas-por-usuario" className="scroll-mt-32 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-bold text-slate-900">Vendas por usuário</h2>
      {!detalhado && <Link className="text-sm font-semibold underline" href={`/relatorios/vendas-por-usuario?${consulta}`}>Ver detalhes</Link>}
    </div>
    <p className="mt-2 text-sm text-slate-600">Vendas finalizadas, atribuídas a quem criou o orçamento. Mesmo período dos relatórios, pela criação do orçamento, no horário de Brasília.</p>
    <p className="my-4 text-xs text-slate-500">{dataCurta(periodo.inicio)} a {dataCurta(periodo.fim)}</p>
    {detalhado ? <EstatisticasVendedores grupos={grupos} periodo={periodo} selecionado={vendedor && grupos.some(grupo => grupo.id === vendedor) ? vendedor : undefined} /> : <div className="grid gap-3">
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
