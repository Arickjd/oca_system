import Link from "next/link";

export default function GerenciarEstoquePage() {
  return (
    <div className="grid min-h-[60dvh] place-items-center py-6">
      <section className="w-full max-w-xs rounded-2xl border border-slate-200 bg-white p-6 text-center">
        <p className="font-semibold text-slate-700">em desenvolvimento...</p>
        <Link href="/home" className="mt-5 inline-block rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Voltar</Link>
      </section>
    </div>
  );
}
