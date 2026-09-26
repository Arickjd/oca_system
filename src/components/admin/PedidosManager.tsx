"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { STATUS_LABEL, type Pedido, type PedidoStatus } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import { formatBRL, formatData, modoLabel } from "@/lib/format";

const STATUSES: PedidoStatus[] = [
  "novo",
  "em_separacao",
  "concluido",
  "cancelado",
];

export function PedidosManager({ pedidos }: { pedidos: Pedido[] }) {
  const router = useRouter();
  const [filtro, setFiltro] = useState<PedidoStatus | "">("");
  const [aberto, setAberto] = useState<string | null>(null);

  const lista = filtro ? pedidos.filter((p) => p.status === filtro) : pedidos;

  async function mudarStatus(id: string, status: PedidoStatus) {
    await fetch(`/api/pedidos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  }

  async function excluir(id: string) {
    if (!confirm("Excluir este pedido?")) return;
    await fetch(`/api/pedidos/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-slate-900">Pedidos</h1>

      {/* Filtro por status */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        <FiltroChip ativo={filtro === ""} onClick={() => setFiltro("")}>
          Todos
        </FiltroChip>
        {STATUSES.map((s) => (
          <FiltroChip
            key={s}
            ativo={filtro === s}
            onClick={() => setFiltro(s)}
          >
            {STATUS_LABEL[s]}
          </FiltroChip>
        ))}
      </div>

      {lista.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-400">
          Nenhum pedido.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {lista.map((p) => {
            const expandido = aberto === p.id;
            return (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
              >
                <div className="p-3 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">
                        #{String(p.numero).padStart(4, "0")}
                        {p.cliente_nome && (
                          <span className="font-normal text-slate-500">
                            {" "}
                            · {p.cliente_nome}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-400">
                        {formatData(p.created_at)}
                        {p.telefone && ` · ${p.telefone}`}
                      </p>
                    </div>
                    <span className="font-bold text-slate-900 tabular-nums shrink-0">
                      {formatBRL(p.valor_total)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={p.status} />
                    <select
                      value={p.status}
                      onChange={(e) =>
                        mudarStatus(p.id, e.target.value as PedidoStatus)
                      }
                      className="text-sm rounded-lg border border-slate-200 px-2 py-1.5 outline-none bg-white"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABEL[s]}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => setAberto(expandido ? null : p.id)}
                      className="text-sm text-slate-500 hover:text-slate-800 px-1"
                    >
                      {expandido ? "Ocultar itens" : `Itens (${p.itens.length})`}
                    </button>
                    <div className="flex-1" />
                    <Link
                      href={`/orcamento/${p.id}`}
                      className="text-sm font-medium text-slate-700 rounded-lg bg-slate-100 px-3 py-1.5 hover:bg-slate-200"
                    >
                      Orçamento
                    </Link>
                    <button
                      onClick={() => excluir(p.id)}
                      className="text-sm text-red-500 hover:text-red-600 px-1"
                    >
                      Excluir
                    </button>
                  </div>
                </div>

                {expandido && (
                  <div className="border-t border-slate-100 bg-slate-50 px-3 py-2">
                    <ul className="text-sm divide-y divide-slate-100">
                      {p.itens.map((it) => (
                        <li
                          key={it.id}
                          className="py-1.5 flex justify-between gap-2"
                        >
                          <span className="min-w-0">
                            {it.quantidade}x {it.produto_nome}
                            <span className="text-slate-400">
                              {" "}
                              ({modoLabel(it.modo)})
                            </span>
                          </span>
                          <span className="tabular-nums text-slate-600 shrink-0">
                            {formatBRL(it.subtotal)}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {p.observacao && (
                      <p className="text-xs text-slate-500 mt-2">
                        Obs.: {p.observacao}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FiltroChip({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium border transition ${
        ativo
          ? "bg-slate-900 text-white border-slate-900"
          : "bg-white text-slate-600 border-slate-200"
      }`}
    >
      {children}
    </button>
  );
}
