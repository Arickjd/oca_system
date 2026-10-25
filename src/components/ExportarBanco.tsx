"use client";
import { useState } from "react";

export function ExportarBanco() {
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState("");
  async function baixar() {
    setGerando(true); setErro("");
    try {
      const resposta = await fetch("/api/banco/exportar", { cache: "no-store" });
      if (!resposta.ok) { const dados = await resposta.json().catch(() => ({})); throw new Error(dados.error || "Não foi possível exportar."); }
      const url = URL.createObjectURL(await resposta.blob());
      const link = document.createElement("a"); link.href = url;
      link.download = resposta.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] ?? "oca-banco.xlsx";
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) { setErro(error instanceof Error ? error.message : "Falha ao baixar o arquivo."); }
    finally { setGerando(false); }
  }
  return <section className="rounded-2xl border border-slate-200 bg-white p-4">
    <h2 className="font-semibold">Exportar banco de dados</h2>
    <p className="mt-1 text-sm text-slate-500">Baixe uma cópia completa em Excel, com abas para produtos, categorias, orçamentos, itens, configurações e contadores.</p>
    <p className="mt-2 text-xs text-slate-500">Inclui todo o histórico e os registros excluídos, independentemente do período selecionado. Contém valores de compra e dados dos clientes.</p>
    <button type="button" disabled={gerando} onClick={baixar} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M12 3v12m-4-4 4 4 4-4M5 16v5h14v-5" /></svg>
      {gerando ? "Preparando arquivo…" : "Baixar banco em Excel (.xlsx)"}
    </button>
    {erro && <p role="alert" className="mt-3 text-sm text-red-700">{erro}</p>}
    {gerando && <p role="status" className="mt-3 text-xs text-slate-500">Aguarde enquanto todos os dados são organizados.</p>}
  </section>;
}
