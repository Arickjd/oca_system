import Link from "next/link";
import { exigirSessao } from "@/lib/auth-servidor";
import { FormularioCliente } from "@/components/FormularioCliente";

export const dynamic = "force-dynamic";

export default async function NovoClientePage() {
  await exigirSessao();
  return <section className="flex flex-col gap-4 pb-6">
    <div>
      <Link href="/clientes" className="text-sm underline text-slate-600">Voltar aos clientes</Link>
      <h1 className="mt-3 text-2xl font-bold text-slate-900">Novo cliente</h1>
      <p className="mt-1 text-sm text-slate-500">Cadastre um cliente recorrente para reaproveitar os dados ao fechar orçamentos.</p>
    </div>
    <FormularioCliente />
  </section>;
}
