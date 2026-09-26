"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Categoria, Produto } from "@/lib/types";
import { formatBRL } from "@/lib/format";

interface FormState {
  id?: string;
  nome: string;
  codigo: string;
  categoria_id: string;
  preco: string;
  preco_pack: string;
  pack_quantidade: string;
  unidade: string;
  imagem_url: string;
  descricao: string;
  ativo: boolean;
}

const VAZIO: FormState = {
  nome: "",
  codigo: "",
  categoria_id: "",
  preco: "",
  preco_pack: "",
  pack_quantidade: "6",
  unidade: "un",
  imagem_url: "",
  descricao: "",
  ativo: true,
};

const inputCls =
  "w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 bg-white";

function parseNum(s: string): number {
  const n = Number(String(s).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export function ProdutosManager({
  produtos,
  categorias,
}: {
  produtos: Produto[];
  categorias: Categoria[];
}) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [filtroCat, setFiltroCat] = useState("");
  const [form, setForm] = useState<FormState | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const nomeCat = useMemo(
    () => new Map(categorias.map((c) => [c.id, c.nome])),
    [categorias]
  );

  const lista = useMemo(() => {
    const b = busca.trim().toLowerCase();
    return produtos.filter((p) => {
      if (filtroCat && p.categoria_id !== filtroCat) return false;
      if (
        b &&
        !p.nome.toLowerCase().includes(b) &&
        !(p.codigo || "").toLowerCase().includes(b)
      )
        return false;
      return true;
    });
  }, [produtos, busca, filtroCat]);

  function abrirNovo() {
    setErro(null);
    setForm({ ...VAZIO, categoria_id: categorias[0]?.id ?? "" });
  }

  function abrirEditar(p: Produto) {
    setErro(null);
    setForm({
      id: p.id,
      nome: p.nome,
      codigo: p.codigo ?? "",
      categoria_id: p.categoria_id,
      preco: String(p.preco),
      preco_pack: String(p.preco_pack),
      pack_quantidade: String(p.pack_quantidade),
      unidade: p.unidade,
      imagem_url: p.imagem_url,
      descricao: p.descricao,
      ativo: p.ativo,
    });
  }

  async function salvar() {
    if (!form) return;
    if (!form.nome.trim()) {
      setErro("Informe o nome do produto.");
      return;
    }
    setSalvando(true);
    setErro(null);
    const payload = {
      nome: form.nome.trim(),
      codigo: form.codigo.trim(),
      categoria_id: form.categoria_id,
      preco: parseNum(form.preco),
      preco_pack: parseNum(form.preco_pack),
      pack_quantidade: parseNum(form.pack_quantidade) || 1,
      unidade: form.unidade.trim() || "un",
      imagem_url: form.imagem_url.trim(),
      descricao: form.descricao,
      ativo: form.ativo,
    };
    const url = form.id ? `/api/produtos/${form.id}` : "/api/produtos";
    const method = form.id ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSalvando(false);
    if (!res.ok) {
      setErro("Erro ao salvar o produto.");
      return;
    }
    setForm(null);
    router.refresh();
  }

  async function alternarAtivo(p: Produto) {
    await fetch(`/api/produtos/${p.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: !p.ativo }),
    });
    router.refresh();
  }

  async function excluir(p: Produto) {
    if (!confirm(`Excluir "${p.nome}"?`)) return;
    await fetch(`/api/produtos/${p.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-slate-900">Produtos</h1>
        <button
          type="button"
          onClick={abrirNovo}
          className="rounded-xl bg-slate-900 text-white px-4 py-2 text-sm font-semibold active:scale-95 transition"
        >
          + Novo produto
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou código..."
          className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
        />
        <select
          value={filtroCat}
          onChange={(e) => setFiltroCat(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none"
        >
          <option value="">Todas as categorias</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </div>

      <p className="text-sm text-slate-500 -mt-1">{lista.length} produto(s)</p>

      <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
        {lista.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-slate-400">
            Nenhum produto encontrado.
          </p>
        )}
        {lista.map((p) => (
          <div key={p.id} className="flex items-center gap-3 px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-slate-800 text-sm leading-tight">
                {p.nome}
              </p>
              <p className="text-xs text-slate-400">
                {nomeCat.get(p.categoria_id) || "Sem categoria"}
                {p.codigo && ` · ${p.codigo}`}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-semibold text-slate-900 tabular-nums">
                {formatBRL(p.preco)}
              </p>
              <p className="text-xs text-slate-400 tabular-nums">
                pack {formatBRL(p.preco_pack)}
              </p>
            </div>
            <button
              onClick={() => alternarAtivo(p)}
              title={p.ativo ? "Ativo" : "Inativo"}
              aria-label={p.ativo ? "Ativo" : "Inativo"}
              className={`shrink-0 w-2.5 h-2.5 rounded-full ${
                p.ativo ? "bg-emerald-500" : "bg-slate-300"
              }`}
            />
            <button
              onClick={() => abrirEditar(p)}
              className="text-sm text-slate-500 hover:text-slate-800 shrink-0"
            >
              Editar
            </button>
            <button
              onClick={() => excluir(p)}
              className="text-sm text-red-500 hover:text-red-600 shrink-0"
              aria-label="Excluir"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {form && (
        <div
          className="fixed inset-0 z-50 bg-black/40 grid place-items-end sm:place-items-center p-0 sm:p-4"
          onClick={() => setForm(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">
                {form.id ? "Editar produto" : "Novo produto"}
              </h2>
              <button
                onClick={() => setForm(null)}
                className="text-slate-400 hover:text-slate-700 text-xl leading-none"
              >
                ✕
              </button>
            </div>

            <div className="p-4 flex flex-col gap-3">
              <Campo label="Nome">
                <input
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className={inputCls}
                  autoFocus
                />
              </Campo>

              <div className="grid grid-cols-2 gap-3">
                <Campo label="Preço unitário (R$)">
                  <input
                    value={form.preco}
                    onChange={(e) => setForm({ ...form, preco: e.target.value })}
                    inputMode="decimal"
                    className={inputCls}
                    placeholder="0,00"
                  />
                </Campo>
                <Campo label="Preço do pacote (R$)">
                  <input
                    value={form.preco_pack}
                    onChange={(e) =>
                      setForm({ ...form, preco_pack: e.target.value })
                    }
                    inputMode="decimal"
                    className={inputCls}
                    placeholder="0,00"
                  />
                </Campo>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Campo label="Qtd. no pacote">
                  <input
                    value={form.pack_quantidade}
                    onChange={(e) =>
                      setForm({ ...form, pack_quantidade: e.target.value })
                    }
                    inputMode="numeric"
                    className={inputCls}
                  />
                </Campo>
                <Campo label="Unidade de venda">
                  <input
                    value={form.unidade}
                    onChange={(e) =>
                      setForm({ ...form, unidade: e.target.value })
                    }
                    className={inputCls}
                    placeholder="un, caixa, fardo"
                  />
                </Campo>
              </div>

              <Campo label="Categoria">
                <select
                  value={form.categoria_id}
                  onChange={(e) =>
                    setForm({ ...form, categoria_id: e.target.value })
                  }
                  className={inputCls}
                >
                  <option value="">Sem categoria</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </Campo>

              <Campo label="Código (opcional)">
                <input
                  value={form.codigo}
                  onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                  className={inputCls}
                />
              </Campo>

              <Campo label="URL da imagem (opcional)">
                <input
                  value={form.imagem_url}
                  onChange={(e) =>
                    setForm({ ...form, imagem_url: e.target.value })
                  }
                  className={inputCls}
                  placeholder="https://..."
                />
              </Campo>

              <Campo label="Descrição (opcional)">
                <textarea
                  value={form.descricao}
                  onChange={(e) =>
                    setForm({ ...form, descricao: e.target.value })
                  }
                  rows={2}
                  className={`${inputCls} resize-none`}
                />
              </Campo>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.ativo}
                  onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
                  className="w-4 h-4"
                />
                Produto ativo (visível no catálogo)
              </label>

              {erro && <p className="text-sm text-red-600">{erro}</p>}
            </div>

            <div className="sticky bottom-0 bg-white border-t border-slate-100 p-4 flex gap-2">
              <button
                onClick={() => setForm(null)}
                className="flex-1 rounded-xl border border-slate-200 text-slate-700 py-3 font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={salvar}
                disabled={salvando}
                className="flex-1 rounded-xl bg-slate-900 text-white py-3 font-semibold disabled:opacity-60"
              >
                {salvando ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Campo({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm text-slate-600">{label}</span>
      {children}
    </label>
  );
}
