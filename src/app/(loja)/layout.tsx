import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { CartBar } from "@/components/CartBar";
import { getConfig } from "@/lib/config";

export default async function LojaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const config = await getConfig();
  return (
    <div className="min-h-dvh flex flex-col">
      <SiteHeader />
      <main className="flex-1 w-full max-w-3xl mx-auto px-3 py-4">
        {children}
      </main>
      <footer className="no-print border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <p className="font-semibold text-slate-700">
          {config.distribuidora_nome}
        </p>
        {config.distribuidora_contato && <p>{config.distribuidora_contato}</p>}
        <p className="mt-3">
          <Link href="/admin" className="text-slate-400 hover:underline">
            Painel administrativo
          </Link>
        </p>
      </footer>
      <CartBar />
    </div>
  );
}
