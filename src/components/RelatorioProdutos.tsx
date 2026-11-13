"use client";

import { useState } from "react";

export function RelatorioProdutos() {
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState("");

  async function baixar() {
    setGerando(true); setErro("");
    try {
      const resposta = await fetch("/api/relatorios/produtos", { cache: "no-store" });
      if (!resposta.ok) {
        const dados = await resposta.json().catch(() => ({}));
        throw new Error(dados.error || "Não foi possível gerar o catálogo.");
      }
      const url = URL.createObjectURL(await resposta.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = resposta.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] ?? "produtos.pdf";
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Falha ao baixar o catálogo.");
    } finally {
      setGerando(false);
    }
  }

  return <section className="rounded-2xl border border-slate-200 bg-white p-4">
    <h2 className="font-semibold">Catálogo de produtos</h2>
    <p className="mt-1 text-sm text-slate-500">PDF com todos os produtos cadastrados, preço de compra e de venda, agrupados por categoria. Não usa o filtro de período.</p>
    <button type="button" disabled={gerando} onClick={baixar}
      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <path d="M12 3v12m-4-4 4 4 4-4M5 16v5h14v-5" />
      </svg>
      {gerando ? "Gerando…" : "Baixar PDF de produtos"}
    </button>
    {erro && <p role="alert" className="mt-3 text-sm text-red-700">{erro}</p>}
  </section>;
}
