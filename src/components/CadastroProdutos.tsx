"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Produto, Categoria } from "@/lib/types";
import { formatBRL } from "@/lib/format";
import { RentabilidadeProduto } from "./RentabilidadeProduto";

const vazio = { id: "", nome: "", preco_pack: "", custo_pack: "", pack_quantidade: "6", categoria_id: "" };
const campo = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5";

export function CadastroProdutos({ produtos, categorias }: { produtos: Produto[]; categorias: Categoria[] }) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState<string | null>(null);
  const [form, setForm] = useState(vazio);
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const normalizar = (texto: string) => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const lista = produtos.filter(p => normalizar(p.nome).includes(normalizar(busca.trim())) &&
    (categoria === null || (categoria === "" ? !categorias.some(c => c.id === p.categoria_id) : p.categoria_id === categoria)));
  function abrir(p?: Produto) {
    setForm(p ? { id: p.id, nome: p.nome, preco_pack: String(p.preco_pack), custo_pack: p.custo_pack ? String(p.custo_pack) : "", pack_quantidade: String(p.pack_quantidade), categoria_id: p.categoria_id } : vazio);
    setErro(""); setSucesso(""); setAberto(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function salvar(e: FormEvent) {
    e.preventDefault(); setSalvando(true); setErro("");
    try {
      const res = await fetch(form.id ? "/api/produtos/" + encodeURIComponent(form.id) : "/api/produtos", {
        method: form.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: form.nome, preco_pack: Number(form.preco_pack), custo_pack: form.custo_pack === "" ? null : Number(form.custo_pack), pack_quantidade: Number(form.pack_quantidade), categoria_id: form.categoria_id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não foi possível salvar.");
      setSucesso(form.id ? "Produto atualizado." : "Produto cadastrado.");
      setAberto(false); router.refresh();
    } catch (error) { setErro(error instanceof Error ? error.message : "Falha ao salvar."); }
    finally { setSalvando(false); }
  }
  return <section className="flex flex-col gap-4">
    <Link href="/" className="text-sm underline">Página inicial</Link>
    <h1 className="text-xl font-bold">Gerenciar produtos</h1>
    <button disabled={salvando} onClick={() => abrir()} className="rounded-xl bg-slate-900 p-3 text-white">+ Novo produto</button>
    {sucesso && <p role="status" className="text-green-700">{sucesso}</p>}
    {aberto && <form onSubmit={salvar} className="rounded-2xl bg-white border p-4 flex flex-col gap-3">
      <h2 className="font-bold">{form.id ? "Editar produto" : "Novo produto"}</h2>
      <fieldset disabled={salvando} className="flex flex-col gap-3 text-sm">
        <label>Nome<input autoFocus required className={campo} value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} /></label>
        <label>Preço de atacado por pacote (R$)<input required type="number" min="0" step="0.01" inputMode="decimal" className={campo} value={form.preco_pack} onChange={e => setForm({ ...form, preco_pack: e.target.value })} /></label>
        <label className="text-blue-800">Compra por pacote (R$)<input type="number" min="0" step="0.01" inputMode="decimal" placeholder="---" className={campo} value={form.custo_pack} onChange={e => setForm({ ...form, custo_pack: e.target.value })} /></label>
        <RentabilidadeProduto venda={Number(form.preco_pack)} custo={Number(form.custo_pack)} />
        <p className="text-xs text-slate-500">Margem calculada sobre a venda, sem outras despesas. Compra vazia ou zero será exibida como ---.</p>
        <label>Itens por pacote<input required type="number" min="1" step="1" className={campo} value={form.pack_quantidade} onChange={e => setForm({ ...form, pack_quantidade: e.target.value })} /></label>
        <label>Categoria<select className={campo} value={form.categoria_id} onChange={e => setForm({ ...form, categoria_id: e.target.value })}>
          <option value="">Sem categoria</option>{categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select></label>
      </fieldset>
      {erro && <p role="alert" className="text-red-600">{erro}</p>}
      <button disabled={salvando} className="rounded-xl bg-slate-900 p-3 text-white">{salvando ? "Salvando…" : "Salvar produto"}</button>
      <button disabled={salvando} type="button" onClick={() => setAberto(false)}>Cancelar</button>
    </form>}
    <label>Buscar produto<input type="search" className={campo} value={busca} onChange={e => setBusca(e.target.value)} /></label>
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">Filtrar por categoria</legend>
      <div className="flex flex-wrap gap-2">
        {[{ id: null, nome: "Todas" }, ...categorias, { id: "", nome: "Sem categoria" }].map(c =>
          <button key={c.id ?? "todas"} type="button" aria-pressed={categoria === c.id} onClick={() => setCategoria(c.id)}
            className={`rounded-full border px-3 py-2 text-sm ${categoria === c.id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-slate-900"}`}>
            {c.nome}
          </button>)}
      </div>
    </fieldset>
    {(busca || categoria !== null) && <button type="button" onClick={() => { setBusca(""); setCategoria(null); }} className="self-start text-sm underline">Limpar filtros</button>}
    <p role="status" className="text-sm text-slate-500">{lista.length} de {produtos.length} produto(s)</p>
    {!lista.length && <p>Nenhum produto encontrado.</p>}
    {lista.map(p => <article key={p.id} className="flex justify-between items-center gap-3 rounded-xl border bg-white p-4">
      <div className="min-w-0"><h2 className="font-semibold break-words">{p.nome}</h2>
        <p className="text-sm text-slate-500">{categorias.find(c => c.id === p.categoria_id)?.nome || "Sem categoria"} · {p.pack_quantidade} itens/pacote</p>
        <p>Venda: {formatBRL(p.preco_pack)}</p>
        <RentabilidadeProduto venda={p.preco_pack} custo={p.custo_pack} />
      </div>
      <button disabled={salvando} aria-label={"Editar " + p.nome} onClick={() => abrir(p)} className="rounded-lg border px-3 py-2">Editar</button>
    </article>)}
  </section>;
}
