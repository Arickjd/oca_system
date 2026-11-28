import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirSessao } from "@/lib/auth-servidor";
import { getCliente } from "@/lib/db";
import { FormularioCliente } from "@/components/FormularioCliente";

export const dynamic = "force-dynamic";

export default async function EditarClientePage({ params }: { params: Promise<{ id: string }> }) {
  await exigirSessao();
  const { id } = await params;
  const cliente = await getCliente(id);
  if (!cliente) notFound();
  return <section className="flex flex-col gap-4 pb-6">
    <div>
      <Link href={`/clientes/${cliente.id}`} className="text-sm underline text-slate-600">Voltar ao cliente</Link>
      <h1 className="mt-3 text-2xl font-bold text-slate-900">Editar cliente</h1>
      <p className="mt-1 text-sm text-slate-500">Alterações valem para os próximos orçamentos; o histórico existente não muda.</p>
    </div>
    <FormularioCliente cliente={cliente} />
  </section>;
}
