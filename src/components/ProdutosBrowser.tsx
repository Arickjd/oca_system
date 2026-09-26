"use client";

import { useMemo, useState } from "react";
import type { Categoria, Produto } from "@/lib/types";
import { ProdutoCard } from "./ProdutoCard";

export function ProdutosBrowser({
  produtos,
  categorias,
  categoriaInicial = "",
}: {
  produtos: Produto[];
  categorias: Categoria[];
  categoriaInicial?: string;
}) {
  const [busca, setBusca] = useState("");
  const [catId, setCatId] = useState(categoriaInicial);

  const nomeCategoria = useMemo(() => {
    const m = new Map(categorias.map((c) => [c.id, c.nome]));
    return (id: string) => m.get(id);
  }, [categorias]);

  const filtrados = useMemo(() => {
    const b = busca.trim().toLowerCase();
    return produtos.filter((p) => {
      if (catId && p.categoria_id !== catId) return false;
      if (b && !p.nome.toLowerCase().includes(b)) return false;
      return true;
    });
  }, [produtos, busca, catId]);

  return (
    <div className="flex flex-col">
      {/* Navegação horizontal de categorias (fixa sob o header) */}
      <div className="sticky top-14 z-20 -mx-3 px-3 py-2 bg-slate-100/95 backdrop-blur border-b border-slate-200">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          <Chip ativo={catId === ""} onClick={() => setCatId("")}>
            Todas
          </Chip>
          {categorias.map((c) => (
            <Chip
              key={c.id}
              ativo={catId === c.id}
              onClick={() => setCatId(c.id)}
            >
              {c.nome}
            </Chip>
          ))}
        </div>
      </div>

      <div className="pt-3 flex flex-col gap-4">
        {/* Busca */}
        <div className="relative">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            inputMode="search"
            placeholder="Buscar produto..."
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm outline-none focus:border-slate-400"
          />
        </div>

        <div>
          <h1 className="text-lg font-bold text-slate-900">
            {catId ? nomeCategoria(catId) ?? "Produtos" : "Todos os produtos"}
          </h1>
          <p className="text-sm text-slate-500">
            {filtrados.length} produto(s)
          </p>
        </div>

        {filtrados.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm">
            Nenhum produto encontrado.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtrados.map((p) => (
              <ProdutoCard
                key={p.id}
                produto={p}
                categoriaNome={nomeCategoria(p.categoria_id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Chip({
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
      className={`shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium border transition ${
        ativo
          ? "bg-slate-900 text-white border-slate-900"
          : "bg-white text-slate-600 border-slate-200"
      }`}
    >
      {children}
    </button>
  );
}
