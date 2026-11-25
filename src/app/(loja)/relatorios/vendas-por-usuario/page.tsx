import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirSessao } from "@/lib/auth-servidor";
import { getPedidos } from "@/lib/db";
import { FiltroOrcamentos } from "@/components/FiltroOrcamentos";
import { VendasPorUsuario } from "@/components/VendasPorUsuario";
import { resolverPeriodo, dataCurta } from "@/lib/periodoOrcamentos";

export const dynamic = "force-dynamic";

export default async function VendasPorUsuarioPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { usuario } = await exigirSessao();
  if (usuario.papel !== "admin") notFound();
  const params = await searchParams;
  const valor = (chave: string) => typeof params[chave] === "string" ? params[chave] as string : undefined;
  let periodo;
  try {
    periodo = resolverPeriodo({ periodo: valor("periodo"), inicio: valor("inicio"), fim: valor("fim") });
  } catch {
    return <section className="rounded-2xl bg-white p-6"><h1 className="text-xl font-bold">Período inválido</h1><p className="my-3">Escolha datas válidas, com início anterior ou igual ao fim.</p><Link href="/relatorios" className="underline">Voltar aos relatórios</Link></section>;
  }
  const consulta = new URLSearchParams({ periodo: periodo.tipo });
  if (periodo.tipo === "personalizado") {
    consulta.set("inicio", periodo.inicio);
    consulta.set("fim", periodo.fim);
  }
  const vendedor = valor("vendedor");
  return <div className="flex min-w-0 flex-col gap-4 pb-6">
    <Link href={`/relatorios?${consulta}#vendas-por-usuario`} className="text-sm underline">Voltar aos relatórios</Link>
    <div>
      <h1 className="text-2xl font-bold">Detalhamento de vendas por usuário</h1>
      <p className="mt-1 text-sm text-slate-500">{dataCurta(periodo.inicio)} a {dataCurta(periodo.fim)} · mesmo filtro dos relatórios</p>
    </div>
    <FiltroOrcamentos key={`${periodo.tipo}-${periodo.inicio}-${periodo.fim}`} periodo={periodo} destino="/relatorios/vendas-por-usuario" />
    <VendasPorUsuario pedidos={await getPedidos()} periodo={periodo} vendedor={vendedor} detalhado />
  </div>;
}
