"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Categoria } from "@/lib/types";

export function CategoriasManager({
  categorias,
}: {
  categorias: Categoria[];
}) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState("");

  async function criar() {
    const n = nome.trim();
    if (!n || busy) return;
    setBusy(true);
    await fetch("/api/categorias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: n }),
    });
    setNome("");
    setBusy(false);
    router.refresh();
  }

  async function salvar(id: string) {
    const n = editNome.trim();
    if (!n) return;
    await fetch(`/api/categorias/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: n }),
    });
    setEditId(null);
    router.refresh();
  }

  async function alternarAtivo(c: Categoria) {
    await fetch(`/api/categorias/${c.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: !c.ativo }),
    });
    router.refresh();
  }

  async function excluir(id: string) {
    if (!confirm("Excluir esta categoria?")) return;
    await fetch(`/api/categorias/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-slate-900">Categorias</h1>

      {/* Nova categoria */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 flex gap-2">
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && criar()}
          placeholder="Nova categoria"
          className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
        />
        <button
          type="button"
          onClick={criar}
          disabled={busy}
          className="rounded-xl bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
        >
          Adicionar
        </button>
      </div>

      {/* Lista */}
      <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
        {categorias.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-slate-400">
            Nenhuma categoria.
          </p>
        )}
        {categorias.map((c) => (
          <div key={c.id} className="flex items-center gap-2 px-3 py-2.5">
            {editId === c.id ? (
              <>
                <input
                  value={editNome}
                  onChange={(e) => setEditNome(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && salvar(c.id)}
                  autoFocus
                  className="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none"
                />
                <button
                  onClick={() => salvar(c.id)}
                  className="text-sm font-medium text-emerald-600 px-2"
                >
                  Salvar
                </button>
                <button
                  onClick={() => setEditId(null)}
                  className="text-sm text-slate-400 px-2"
                >
                  Cancelar
                </button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm font-medium text-slate-800">
                  {c.nome}
                </span>
                <button
                  onClick={() => alternarAtivo(c)}
                  className={`text-xs rounded-full px-2.5 py-0.5 font-medium ${
                    c.ativo
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {c.ativo ? "Ativa" : "Inativa"}
                </button>
                <button
                  onClick={() => {
                    setEditId(c.id);
                    setEditNome(c.nome);
                  }}
                  className="text-sm text-slate-500 hover:text-slate-800 px-2"
                >
                  Editar
                </button>
                <button
                  onClick={() => excluir(c.id)}
                  className="text-sm text-red-500 hover:text-red-600 px-1"
                >
                  Excluir
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
