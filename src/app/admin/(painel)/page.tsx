import Link from "next/link";
import { getProdutos, getCategorias, getPedidos } from "@/lib/db";
import { formatBRL, formatData } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const [produtos, categorias, pedidos] = await Promise.all([
    getProdutos(),
    getCategorias(),
    getPedidos(),
  ]);

  const novos = pedidos.filter((p) => p.status === "novo").length;
  const faturamento = pedidos
    .filter((p) => p.status === "concluido")
    .reduce((s, p) => s + p.valor_total, 0);
  const recentes = pedidos.slice(0, 6);

  const cards = [
    { label: "Pedidos", valor: pedidos.length, href: "/admin/pedidos" },
    { label: "Novos", valor: novos, href: "/admin/pedidos" },
    { label: "Produtos", valor: produtos.length, href: "/admin/produtos" },
    { label: "Categorias", valor: categorias.length, href: "/admin/categorias" },
  ];

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-bold text-slate-900">Início</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="bg-white rounded-2xl border border-slate-200 p-4 hover:border-slate-300 transition"
          >
            <p className="text-3xl font-bold text-slate-900 tabular-nums">
              {c.valor}
            </p>
            <p className="text-sm text-slate-500">{c.label}</p>
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <p className="text-sm text-slate-500">Faturamento (pedidos concluídos)</p>
        <p className="text-2xl font-bold text-slate-900 tabular-nums">
          {formatBRL(faturamento)}
        </p>
      </div>

      <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Pedidos recentes</h2>
          <Link
            href="/admin/pedidos"
            className="text-sm text-slate-500 hover:underline"
          >
            Ver todos
          </Link>
        </div>
        {recentes.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-400">
            Nenhum pedido ainda.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recentes.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/orcamento/${p.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 truncate">
                      #{String(p.numero).padStart(4, "0")}{" "}
                      {p.cliente_nome && (
                        <span className="text-slate-500 font-normal">
                          · {p.cliente_nome}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatData(p.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <StatusBadge status={p.status} />
                    <span className="font-semibold text-slate-900 tabular-nums">
                      {formatBRL(p.valor_total)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
