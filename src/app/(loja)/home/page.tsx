import Link from "next/link";
import { exigirSessao } from "@/lib/auth-servidor";
import { getAuditoria } from "@/lib/db";
import { AuditoriaLog } from "@/components/AuditoriaLog";

export default async function HomePage() {
  const { usuario } = await exigirSessao();
  const admin = usuario.papel === "admin";
  const eventos = admin ? await getAuditoria(50) : [];
  return <section className="flex min-h-[65dvh] flex-col items-center justify-center gap-6 py-8 text-center">
    <div><h1 className="text-2xl font-bold text-slate-900">Olá, {usuario.nome}!</h1></div>
    <div className="flex w-full max-w-sm flex-col gap-3">
      <Link href="/categorias" className="rounded-2xl bg-slate-900 px-6 py-5 text-lg font-semibold text-white shadow-sm">Montar pedido →</Link>
      <Link href="/gerenciar-produtos" className="rounded-2xl border border-slate-300 bg-white px-6 py-5 text-lg font-semibold text-slate-800 hover:border-amber-300">Gerenciar produtos</Link>
      <Link href="/gerenciar-estoque" className="rounded-2xl border border-slate-300 bg-white px-6 py-5 text-lg font-semibold text-slate-800 hover:border-amber-300">Gerenciar Estoque</Link>
    </div>
    {admin && <div className="w-full max-w-2xl"><AuditoriaLog eventos={eventos} /></div>}
  </section>;
}
