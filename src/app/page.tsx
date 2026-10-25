import { redirect } from "next/navigation";
import { obterSessao } from "@/lib/auth-servidor";
import { destinoSeguro } from "@/lib/auth";
import { LoginForm } from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ proxima?: string }> }) {
  const { proxima } = await searchParams;
  const destino = destinoSeguro(proxima);
  if (await obterSessao()) redirect(destino);
  return <main className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-slate-50 px-4 py-10">
    <div className="w-full max-w-sm">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="OCA Distribuidora" className="mx-auto mb-8 h-auto w-56 max-w-[70vw] object-contain" />
      <LoginForm proxima={destino} />
    </div>
  </main>;
}
