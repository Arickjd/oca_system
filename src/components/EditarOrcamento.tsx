"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Pedido, Produto } from "@/lib/types";
import { formatBRL } from "@/lib/format";

type Linha = { chave: string; id?: string; produto_id: string; produto_nome: string; modo: "pacote" | "unidade"; pack_quantidade: string; quantidade: string; preco_unitario: string; preco_original: number };
const campo = "mt-1 w-full min-w-0 rounded-xl border border-slate-300 bg-white p-2.5 text-sm";

export function EditarOrcamento({ pedido, produtos, retorno }: { pedido: Pedido; produtos: Produto[]; retorno: string }) {
  const router = useRouter();
  const [cliente, setCliente] = useState(pedido.cliente_nome);
  const [telefone, setTelefone] = useState(pedido.telefone);
  const [observacao, setObservacao] = useState(pedido.observacao);
  const [itens, setItens] = useState<Linha[]>(pedido.itens.map(it => ({ chave: it.id, id: it.id, produto_id: it.produto_id,
    produto_nome: it.produto_nome, modo: it.modo, pack_quantidade: String(it.pack_quantidade ?? 1), quantidade: String(it.quantidade), preco_unitario: String(it.preco_unitario), preco_original: it.preco_original ?? it.preco_unitario })));
  const [busca, setBusca] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const normalizar = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const encontrados = busca.trim().length >= 2 ? produtos.filter(p => normalizar(p.nome).includes(normalizar(busca.trim()))).slice(0, 12) : [];
  const total = itens.reduce((s, it) => s + Math.round(Number(it.preco_unitario) * Number(it.quantidade) * 100), 0) / 100;
  function alterar(chave: string, patch: Partial<Linha>) { setItens(lista => lista.map(it => it.chave === chave ? { ...it, ...patch } : it)); }
  function adicionar(p: Produto) {
    setItens(lista => [...lista, { chave: crypto.randomUUID(), produto_id: p.id, produto_nome: p.nome, modo: "pacote", pack_quantidade: String(p.pack_quantidade), quantidade: "1", preco_unitario: String(p.preco_pack), preco_original: p.preco_pack }]);
    setBusca("");
  }
  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!itens.length) { setErro("Inclua pelo menos um produto."); return; }
    setSalvando(true); setErro("");
    try {
      const res = await fetch(`/api/pedidos/${encodeURIComponent(pedido.id)}`, { method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revisao: pedido.revisao ?? 0, cliente_nome: cliente, telefone, observacao,
          itens: itens.map(it => ({ id: it.id, produto_id: it.produto_id, produto_nome: it.produto_nome, modo: it.modo,
            pack_quantidade: Number(it.pack_quantidade), quantidade: Number(it.quantidade), preco_unitario: Number(it.preco_unitario) })) }) });
      if (!res.ok) { const data = await res.json().catch(() => ({})); throw new Error(data.error || "Não foi possível salvar."); }
      router.push(retorno); router.refresh();
    } catch (error) { setErro(error instanceof Error ? error.message : "Falha ao salvar."); setSalvando(false); }
  }
  return <form onSubmit={salvar} className="flex flex-col gap-5 pb-6">
    <div><Link href={retorno} className="text-sm underline">Voltar aos orçamentos</Link><h1 className="mt-3 text-2xl font-bold">Editar orçamento #{pedido.numero}</h1>
      <p className="mt-2 text-sm text-slate-500">As alterações valem somente para este orçamento. O catálogo, o número e a data original serão preservados.</p></div>
    <fieldset disabled={salvando} className="flex flex-col gap-5">
      <section className="rounded-2xl border bg-white p-4"><h2 className="font-semibold">Dados do cliente</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-sm">Nome<input value={cliente} onChange={e => setCliente(e.target.value)} className={campo} /></label>
        <label className="text-sm">Telefone<input type="tel" value={telefone} onChange={e => setTelefone(e.target.value)} className={campo} /></label></div>
        <label className="mt-3 block text-sm">Observação<textarea rows={2} value={observacao} onChange={e => setObservacao(e.target.value)} className={campo} /></label>
      </section>
      <section className="rounded-2xl border bg-white p-4"><h2 className="font-semibold">Adicionar produtos</h2>
        <label className="mt-2 block text-sm">Buscar no catálogo<input type="search" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Digite pelo menos 2 caracteres" className={campo} /></label>
        <ul className="mt-2 max-h-64 overflow-auto divide-y">{encontrados.map(p => <li key={p.id}><button type="button" onClick={() => adicionar(p)} className="flex w-full items-center justify-between gap-3 rounded-lg p-3 text-left hover:bg-slate-50"><span className="min-w-0 break-words text-sm">{p.nome}<span className="block text-xs text-slate-500">{p.pack_quantidade} itens/pacote · {formatBRL(p.preco_pack)}</span></span><span className="text-sm font-semibold">+ Adicionar</span></button></li>)}</ul>
        {busca.trim().length >= 2 && !encontrados.length && <p className="text-sm text-slate-500">Nenhum produto encontrado.</p>}
      </section>
      <section className="flex flex-col gap-3"><h2 className="font-semibold">Produtos do orçamento · {itens.length}</h2>
        {itens.map((it, index) => <article key={it.chave} className="rounded-2xl border bg-white p-4">
          <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold">Item {index + 1} · {it.modo === "pacote" ? "Pacote" : "Unidade"}</h3><button type="button" onClick={() => setItens(lista => lista.filter(i => i.chave !== it.chave))} className="rounded-lg px-3 py-2 text-sm text-red-700" aria-label={`Remover ${it.produto_nome}`}>Remover</button></div>
          <label className="block text-sm">Produto<input required value={it.produto_nome} onChange={e => alterar(it.chave, { produto_nome: e.target.value })} className={campo} /></label>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <label className="min-w-0 text-sm">Quantidade<input required type="number" min="1" step="1" value={it.quantidade} onChange={e => alterar(it.chave, { quantidade: e.target.value })} className={campo} /></label>
            <label className="min-w-0 text-sm">Valor da venda (R$)/{it.modo === "pacote" ? "pacote" : "unidade"}<input required type="number" min="0" step="0.01" inputMode="decimal" value={it.preco_unitario} onChange={e => alterar(it.chave, { preco_unitario: e.target.value })} className={campo} /></label>
            {it.modo === "pacote" && <label className="min-w-0 text-sm">Itens por pacote<input required type="number" min="1" step="1" value={it.pack_quantidade} onChange={e => alterar(it.chave, { pack_quantidade: e.target.value })} className={campo} /></label>}
          </div>
          <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm">
            <p className="text-slate-600">Valor original: {formatBRL(it.preco_original)}</p>
            <p className="font-medium text-emerald-800">Desconto por {it.modo === "pacote" ? "pacote" : "unidade"}: {formatBRL(Math.max(0, Math.round((it.preco_original - Number(it.preco_unitario)) * 100)) / 100)}</p>
            <p className="text-xs text-emerald-800">O valor negociado vale apenas para este orçamento.</p>
          </div>
          <p className="mt-3 text-right text-sm">Subtotal: <strong>{formatBRL(Number(it.preco_unitario) * Number(it.quantidade))}</strong></p>
        </article>)}
        {!itens.length && <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Adicione um produto para salvar o orçamento.</p>}
      </section>
    </fieldset>
    {erro && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{erro}</p>}
    <div className="sticky bottom-3 rounded-2xl border bg-white p-4 shadow-lg"><div className="mb-3 flex justify-between"><span>Total atualizado</span><strong className="text-xl">{formatBRL(total)}</strong></div>
      <button disabled={salvando || !itens.length} className="w-full rounded-xl bg-slate-900 p-3 font-semibold text-white disabled:opacity-50">{salvando ? "Salvando…" : "Salvar alterações"}</button>
    </div>
  </form>;
}
