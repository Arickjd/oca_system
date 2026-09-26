import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-dvh grid place-items-center p-6 text-center">
      <div className="flex flex-col items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="OCA" className="h-12 w-auto object-contain" />
        <h1 className="text-2xl font-bold text-slate-900">
          Página não encontrada
        </h1>
        <p className="text-slate-500">
          O endereço acessado não existe ou o pedido não foi localizado.
        </p>
        <Link
          href="/"
          className="mt-2 rounded-xl bg-slate-900 text-white px-5 py-2.5 text-sm font-medium"
        >
          Voltar ao catálogo
        </Link>
      </div>
    </div>
  );
}
