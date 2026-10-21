"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Produto, Categoria } from "@/lib/types";
import { formatBRL } from "@/lib/format";
import { RentabilidadeProduto } from "./RentabilidadeProduto";
import { useCart } from "@/lib/cart";

const vazio = { id: "", nome: "", preco_pack: "", custo_pack: "", pack_quantidade: "6", categoria_id: "" };
const campo = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5";

export function CadastroProdutos({ produtos, categorias }: { produtos: Produto[]; categorias: Categoria[] }) {
  const router = useRouter();
  const { remover } = useCart();
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState<string | null>(null);
  const [form, setForm] = useState(vazio);
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [selecionadoDoCatalogo, setSelecionadoDoCatalogo] = useState(false);
  const normalizar = (texto: string) => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const nomeBusca = normalizar(form.nome.trim()).replace(/\s+/g, " ");
  const sugestoes = !form.id && nomeBusca.length >= 2
    ? produtos.filter(p => !p.excluido_em && nomeBusca.split(" ").every(termo => normalizar(p.nome).includes(termo)))
      .sort((a, b) => {
        const prioridade = (p: Produto) => normalizar(p.nome) === nomeBusca ? 0 : normalizar(p.nome).startsWith(nomeBusca) ? 1 : 2;
        return prioridade(a) - prioridade(b) || a.nome.localeCompare(b.nome, "pt-BR");
      }).slice(0, 6)
    : [];
  const lista = produtos.filter(p => normalizar(p.nome).includes(normalizar(busca.trim())) &&
    (categoria === null || (categoria === "" ? !categorias.some(c => c.id === p.categoria_id) : p.categoria_id === categoria)));
  function abrir(p?: Produto) {
    setSelecionadoDoCatalogo(false);
    setForm(p ? { id: p.id, nome: p.nome, preco_pack: String(p.preco_pack), custo_pack: p.custo_pack ? String(p.custo_pack) : "", pack_quantidade: String(p.pack_quantidade), categoria_id: p.categoria_id } : vazio);
    setErro(""); setSucesso(""); setAberto(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function excluir() {
    if (!form.id || !window.confirm(`Excluir "${form.nome}" do catálogo? Os orçamentos já feitos serão preservados.`)) return;
    setSalvando(true); setErro("");
    try {
      const res = await fetch(`/api/produtos/${encodeURIComponent(form.id)}`, { method: "DELETE" });
      if (!res.ok && res.status !== 404) throw new Error("Não foi possível excluir o produto. Tente novamente.");
      remover(form.id);
      setAberto(false); setSucesso("Produto excluído do catálogo. Orçamentos anteriores preservados.");
      router.refresh();
    } catch (error) { setErro(error instanceof Error ? error.message : "Falha ao excluir."); }
    finally { setSalvando(false); }
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
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-bold">{form.id ? "Editar produto" : "Novo produto"}</h2>
        {form.id && <button type="button" disabled={salvando} onClick={excluir} aria-label={`Excluir produto ${form.nome}`} title="Excluir produto"
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5"><path d="m6 6 12 12M18 6 6 18" /></svg>
        </button>}
      </div>
      <fieldset disabled={salvando} className="flex flex-col gap-3 text-sm">
        <label>Nome<input autoFocus required autoComplete="off" aria-describedby={!form.id ? "ajuda-produto-existente" : undefined} className={campo} value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} /></label>
        {!form.id && <div className="-mt-1">
          <p id="ajuda-produto-existente" className="text-xs text-slate-500">Digite ao menos 2 caracteres para buscar no catálogo. Selecione um produto existente para editar seus dados.</p>
          {sugestoes.length > 0 && <div className="mt-2 rounded-xl border border-blue-200 bg-blue-50 p-2">
            <p className="px-2 py-1 text-xs font-semibold text-blue-900" role="status">Produtos já cadastrados</p>
            <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto">
              {sugestoes.map(p => <li key={p.id}>
                <button type="button" onClick={() => { abrir(p); setSelecionadoDoCatalogo(true); }}
                  className="w-full rounded-lg p-3 text-left hover:bg-white focus-visible:bg-white focus-visible:outline-2 focus-visible:outline-blue-600">
                  <span className="block font-medium text-slate-900">{p.nome}</span>
                  <span className="block text-xs text-slate-600">{formatBRL(p.preco_pack)} · {p.pack_quantidade} itens/pacote · {categorias.find(c => c.id === p.categoria_id)?.nome || "Sem categoria"}</span>
                </button>
              </li>)}
            </ul>
          </div>}
          {nomeBusca.length >= 2 && sugestoes.length === 0 && <p role="status" className="mt-2 text-xs text-slate-500">Nenhum produto semelhante encontrado. Continue preenchendo para cadastrar um novo.</p>}
        </div>}
        {selecionadoDoCatalogo && <p role="status" className="rounded-lg bg-blue-50 p-3 text-blue-900">Produto existente selecionado. Os campos foram preenchidos; ao salvar, você atualizará este produto.</p>}
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
      <button disabled={salvando} className="rounded-xl bg-slate-900 p-3 text-white">{salvando ? "Salvando…" : form.id ? "Salvar alterações" : "Cadastrar produto"}</button>
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
