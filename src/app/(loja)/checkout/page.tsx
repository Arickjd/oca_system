"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart";
import { formatBRL, modoLabel } from "@/lib/format";

export default function CheckoutPage() {
  const router = useRouter();
  const { itens, totalValor, limpar, carregado } = useCart();

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [observacao, setObservacao] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (carregado && itens.length === 0) {
    return (
      <div className="py-16 flex flex-col items-center gap-4 text-center">
        <p className="text-slate-500">Não há itens para finalizar.</p>
        <Link
          href="/categorias"
          className="rounded-xl bg-slate-900 text-white px-5 py-2.5 text-sm font-medium"
        >
          Ver catálogo
        </Link>
      </div>
    );
  }

  async function registrar() {
    setEnviando(true);
    setErro(null);
    try {
      const res = await fetch("/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente_nome: nome,
          telefone,
          observacao,
          itens: itens.map((i) => ({
            produto_id: i.produto_id,
            produto_nome: i.nome,
            modo: i.modo,
            quantidade: i.quantidade,
            preco_unitario: i.preco_unitario,
          })),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Falha ao registrar o pedido.");
      }
      const pedido = await res.json();
      limpar();
      router.push(`/orcamento/${pedido.id}`);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro inesperado.");
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-col gap-5 pb-4">
      <h1 className="text-xl font-bold text-slate-900">Finalizar pedido</h1>

      {/* Dados do cliente (todos opcionais) */}
      <section className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-3">
        <h2 className="font-semibold text-slate-800">Dados do cliente</h2>
        <p className="text-xs text-slate-500 -mt-2">
          Todos os campos são opcionais.
        </p>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-600">Nome</span>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome do cliente"
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-600">Telefone</span>
          <input
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            inputMode="tel"
            placeholder="(00) 00000-0000"
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-600">Observação</span>
          <textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            rows={2}
            placeholder="Ex: entregar pela manhã"
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 resize-none"
          />
        </label>
      </section>

      {/* Resumo */}
      <section className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-3">
        <h2 className="font-semibold text-slate-800">Resumo do pedido</h2>
        <ul className="flex flex-col divide-y divide-slate-100">
          {itens.map((i) => (
            <li
              key={`${i.produto_id}:${i.modo}`}
              className="py-2 flex items-start justify-between gap-3 text-sm"
            >
              <span className="min-w-0">
                <span className="font-medium text-slate-800">
                  {i.quantidade}x
                </span>{" "}
                {i.nome}
                <span className="block text-xs text-slate-400">
                  {modoLabel(i.modo, i.pack_quantidade)}
                </span>
              </span>
              <span className="tabular-nums text-slate-700 shrink-0">
                {formatBRL(i.preco_unitario * i.quantidade)}
              </span>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
          <span className="text-slate-500">Total</span>
          <span className="text-xl font-bold text-slate-900 tabular-nums">
            {formatBRL(totalValor)}
          </span>
        </div>
      </section>

      {erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
          {erro}
        </p>
      )}

      <button
        type="button"
        disabled={enviando}
        onClick={registrar}
        className="rounded-xl bg-slate-900 text-white text-center px-5 py-3.5 font-semibold active:scale-[0.99] transition disabled:opacity-60"
      >
        {enviando ? "Registrando…" : "Registrar pedido e gerar orçamento"}
      </button>
      <Link
        href="/carrinho"
        className="text-center text-sm text-slate-500 hover:underline"
      >
        Voltar ao carrinho
      </Link>
    </div>
  );
}
