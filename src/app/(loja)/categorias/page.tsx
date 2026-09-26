import Link from "next/link";
import { getCategorias, getProdutos } from "@/lib/db";
import { iconeCategoria } from "@/lib/categoriaIcone";

export const dynamic = "force-dynamic";

export default async function CategoriasPage() {
  const [categorias, produtos] = await Promise.all([
    getCategorias(),
    getProdutos(),
  ]);
  const ativas = categorias.filter((c) => c.ativo);
  const ativos = produtos.filter((p) => p.ativo);
  const contar = (id: string) =>
    ativos.filter((p) => p.categoria_id === id).length;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          Escolha uma categoria
        </h1>
        <p className="text-sm text-slate-500">
          Toque em uma categoria para ver os produtos
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {ativas.map((c) => (
          <Link
            key={c.id}
            href={`/produtos?categoria=${c.id}`}
            className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-2 hover:border-slate-300 active:scale-[0.98] transition"
          >
            <span className="text-3xl">{iconeCategoria(c.nome)}</span>
            <span className="font-semibold text-slate-900 leading-tight">
              {c.nome}
            </span>
            <span className="text-xs text-slate-400">
              {contar(c.id)} produtos
            </span>
          </Link>
        ))}
      </div>

      <Link
        href="/produtos"
        className="rounded-2xl bg-slate-900 text-white text-center px-5 py-3.5 font-semibold active:scale-[0.99] transition"
      >
        Ver todos os produtos
      </Link>
    </div>
  );
}
