import Link from "next/link";
import { getConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function Landing() {
  const config = await getConfig();
  return (
    <main className="relative min-h-dvh bg-white flex flex-col items-center justify-center gap-10 p-6 text-center">
      <div className="flex flex-col items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt={config.distribuidora_nome}
          className="w-72 max-w-[82vw] h-auto object-contain"
        />
        <p className="text-slate-500 text-sm">
          Monte pedidos e gere orçamentos
        </p>
      </div>

      <Link
        href="/categorias"
        className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 text-white px-10 py-4 text-lg font-semibold shadow-xl shadow-slate-900/10 active:scale-95 transition"
      >
        Montar pedido
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5"
        >
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </Link>

      <Link href="/orcamentos" className="text-sm font-medium underline">
        Orçamentos realizados
      </Link>
      <Link
        href="/gerenciar-produtos"
        className="rounded-2xl border border-slate-200 p-5 w-full max-w-sm hover:border-amber-500"
      >
        <h2 className="font-semibold text-slate-900">Gerenciar produtos</h2>
        <p className="mt-1 text-sm text-slate-500">
          Cadastrar novos produtos e editar o catálogo.
        </p>
      </Link>
    </main>
  );
}
