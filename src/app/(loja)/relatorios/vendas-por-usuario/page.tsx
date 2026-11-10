import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirSessao } from "@/lib/auth-servidor";
import { getPedidos } from "@/lib/db";
import { VendasPorUsuario } from "@/components/VendasPorUsuario";

export const dynamic = "force-dynamic";

export default async function VendasPorUsuarioPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { usuario } = await exigirSessao();
  if (usuario.papel !== "admin") notFound();
  const params = await searchParams;
  return <div className="flex min-w-0 flex-col gap-4 pb-6">
    <Link href={`/relatorios?comissao=${params.comissao === "mes" ? "mes" : "hoje"}#vendas-por-usuario`} className="text-sm underline">Voltar aos relatórios</Link>
    <h1 className="text-2xl font-bold">Detalhamento de vendas por usuário</h1>
    <VendasPorUsuario pedidos={await getPedidos()} params={params} detalhado />
  </div>;
}
