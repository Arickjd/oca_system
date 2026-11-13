"use client";

import { useEffect, useMemo, useState } from "react";
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
  const [pesquisando, setPesquisando] = useState(false);
  const [alturaHeader, setAlturaHeader] = useState(0);

  // O link "+" do cabeçalho aponta para /produtos sem categoria: ao mudar a URL,
  // o filtro volta para "Todas" mesmo que a página já estivesse aberta.
  useEffect(() => setCatId(categoriaInicial), [categoriaInicial]);

  // O cabeçalho é sticky e muda de altura conforme a largura; a barra fixa precisa
  // encostar exatamente abaixo dele, inclusive no celular.
  useEffect(() => {
    const header = document.querySelector("header");
    if (!header) return;
    const medir = () => setAlturaHeader(header.getBoundingClientRect().height);
    medir();
    const observador = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(medir);
    observador?.observe(header);
    window.addEventListener("resize", medir);
    return () => { observador?.disconnect(); window.removeEventListener("resize", medir); };
  }, []);

  const buscando = pesquisando || busca.trim().length > 0;

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

  const fixo = { top: alturaHeader || undefined };

  return (
    <div className="flex flex-col">
      {/* Categorias: somem enquanto a busca está em uso, para sobrar tela para os produtos. */}
      {!buscando && (
        <div className="sticky top-14 z-20 -mx-3 px-3 py-2 bg-slate-100/95 backdrop-blur border-b border-slate-200" style={fixo}>
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
      )}

      <div
        className={buscando
          ? "sticky z-30 -mx-3 px-3 py-2 bg-slate-100/95 backdrop-blur border-b border-slate-200"
          : "pt-3"}
        style={buscando ? fixo : undefined}
      >
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
            onFocus={() => setPesquisando(true)}
            onBlur={() => setPesquisando(false)}
            type="search"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            placeholder="Buscar produto..."
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-11 py-2.5 text-sm outline-none focus:border-slate-400"
          />
          {busca && (
            <button
              type="button"
              aria-label="Limpar busca"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setBusca("")}
              className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4">
                <path d="m6 6 12 12M18 6 6 18" />
              </svg>
            </button>
          )}
        </div>
        {buscando && (
          <p className="mt-1 text-xs text-slate-500" role="status">
            {filtrados.length} produto(s){catId ? ` · ${nomeCategoria(catId) ?? ""}` : ""}
          </p>
        )}
      </div>

      <div className="pt-3 flex flex-col gap-4">
        {!buscando && (
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              {catId ? nomeCategoria(catId) ?? "Produtos" : "Todos os produtos"}
            </h1>
            <p className="text-sm text-slate-500">
              {filtrados.length} produto(s)
            </p>
          </div>
        )}

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
