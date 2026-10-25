import Link from "next/link";
import { exigirSessao } from "@/lib/auth-servidor";

export default async function HomePage() {
  const { usuario } = await exigirSessao();
  return <section className="flex min-h-[65dvh] flex-col items-center justify-center gap-6 py-8 text-center">
    <div><h1 className="text-2xl font-bold text-slate-900">Olá, {usuario.nome}!</h1><p className="mt-2 text-sm text-slate-500">O que vamos fazer hoje?</p></div>
    <div className="flex w-full max-w-sm flex-col gap-3">
      <Link href="/categorias" className="rounded-2xl bg-slate-900 px-6 py-5 text-lg font-semibold text-white shadow-sm">Montar pedido →</Link>
      <Link href="/gerenciar-produtos" className="rounded-2xl border border-slate-300 bg-white px-6 py-5 text-lg font-semibold text-slate-800 hover:border-amber-300">Gerenciar produtos</Link>
    </div>
  </section>;
}
