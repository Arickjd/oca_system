"use client";
import Link from "next/link";
import { useState } from "react";

export function CupomAcoes({ pedidoId, finalizado }: { pedidoId: string; finalizado: boolean }) {
  const [preparando, setPreparando] = useState(false);
  const [erro, setErro] = useState("");
  async function imprimir() {
    setPreparando(true); setErro("");
    try {
      await document.fonts.ready;
      const cupom = document.getElementById("cupom-conteudo");
      if (!cupom) throw new Error("Não foi possível preparar o cupom.");
      await Promise.all([...cupom.querySelectorAll("img")].map(img => img.decode().catch(() => undefined)));
      // A altura acompanha o conteúdo para não reservar uma folha A4 na bobina.
      // Cupons excepcionalmente longos continuam nas páginas seguintes.
      const altura = Math.min(2000, Math.max(60, Math.ceil(cupom.getBoundingClientRect().height * 25.4 / 96) + 2));
      let estilo = document.getElementById("cupom-tamanho-pagina");
      if (!estilo) { estilo = document.createElement("style"); estilo.id = "cupom-tamanho-pagina"; document.head.appendChild(estilo); }
      estilo.textContent = `@page cupom80 { size: 80mm ${altura}mm; margin: 0; }`;
      window.print();
    } catch (error) { setErro(error instanceof Error ? error.message : "Não foi possível abrir a impressão."); }
    finally { setPreparando(false); }
  }
  return <section className="no-print mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-4">
    <Link href={`/orcamento/${pedidoId}`} className="text-sm underline">{finalizado ? "Voltar à venda" : "Voltar ao orçamento"}</Link>
    <h2 className="mt-3 text-lg font-bold">Imprimir cupom de 80 mm</h2>
    <p className="mt-1 text-sm text-slate-500">Na janela de impressão, selecione a impressora, papel de 80 mm e escala de 100%. Desative cabeçalhos e rodapés do navegador.</p>
    <button type="button" disabled={preparando} onClick={imprimir} className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white disabled:opacity-50">{preparando ? "Preparando…" : "Imprimir cupom"}</button>
    {erro && <p role="alert" className="mt-2 text-sm text-red-700">{erro}</p>}
  </section>;
}
