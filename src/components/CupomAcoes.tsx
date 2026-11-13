"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

export function CupomAcoes({ pedidoId, numero, finalizado }: { pedidoId: string; numero: number; finalizado: boolean }) {
  const [preparando, setPreparando] = useState(false);
  const [erro, setErro] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [compartilhando, setCompartilhando] = useState(false);
  const [mensagem, setMensagem] = useState("");

  // O PDF fica pronto antes do clique: o compartilhamento precisa do arquivo no gesto.
  useEffect(() => {
    const controle = new AbortController();
    setCarregando(true); setArquivo(null);
    fetch(`/api/pedidos/${encodeURIComponent(pedidoId)}/cupom`, { signal: controle.signal, cache: "no-store" })
      .then(async res => {
        if (!res.ok) throw new Error("Não foi possível preparar o cupom para compartilhar.");
        const blob = await res.blob();
        if (!blob.type.includes("application/pdf")) throw new Error("O arquivo recebido não é um PDF.");
        if (!controle.signal.aborted) setArquivo(new File([blob], `cupom-${numero}.pdf`, { type: "application/pdf" }));
      })
      .catch(error => {
        if (!controle.signal.aborted) setErro(error instanceof Error ? error.message : "Falha ao preparar o cupom.");
      })
      .finally(() => { if (!controle.signal.aborted) setCarregando(false); });
    return () => controle.abort();
  }, [pedidoId, numero]);

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

  function baixar() {
    if (!arquivo) return;
    const url = URL.createObjectURL(arquivo);
    const link = document.createElement("a");
    link.href = url; link.download = arquivo.name;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  async function compartilhar() {
    if (!arquivo || compartilhando) return;
    if (navigator.share && navigator.canShare?.({ files: [arquivo] })) {
      setCompartilhando(true); setMensagem("");
      try {
        await navigator.share({ files: [arquivo], title: `Cupom #${numero}` });
      } catch (error) {
        if (!(error instanceof Error && error.name === "AbortError"))
          setMensagem("Não foi possível compartilhar. Baixe o cupom e anexe como documento.");
      } finally { setCompartilhando(false); }
    } else {
      baixar();
      setMensagem("Cupom baixado. Anexe o PDF como documento no WhatsApp ou em outra conversa.");
    }
  }

  return <section className="no-print mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-4">
    <Link href={`/orcamento/${pedidoId}`} className="text-sm underline">{finalizado ? "Voltar à venda" : "Voltar ao orçamento"}</Link>
    <h2 className="mt-3 text-lg font-bold">Imprimir cupom de 80 mm</h2>
    <p className="mt-1 text-sm text-slate-500">Na janela de impressão, selecione a impressora, papel de 80 mm e escala de 100%. Desative cabeçalhos e rodapés do navegador.</p>
    <button type="button" disabled={preparando} onClick={imprimir} className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white disabled:opacity-50">{preparando ? "Preparando…" : "Imprimir cupom"}</button>
    <button type="button" disabled={!arquivo || compartilhando} onClick={compartilhar}
      className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white disabled:opacity-50">
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13" />
      </svg>
      {carregando ? "Preparando cupom…" : compartilhando ? "Compartilhando…" : "Compartilhar cupom"}
    </button>
    <p role="status" className="mt-2 text-xs text-slate-500">{mensagem || "Envie o PDF do cupom pelo WhatsApp ou por outro aplicativo."}</p>
    {erro && <p role="alert" className="mt-2 text-sm text-red-700">{erro}</p>}
  </section>;
}
