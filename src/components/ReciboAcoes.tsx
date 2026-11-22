"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { CupomConteudo } from "./CupomConteudo";
import type { Config, Pedido } from "@/lib/types";

export function ReciboAcoes({ pedido, config }: { pedido: Pedido; config: Config }) {
  const pedidoId = pedido.id;
  const numero = pedido.numero;
  const shareTitle = `${config.distribuidora_nome} — ${pedido.status_pagamento === "finalizado" ? "Venda" : "Orçamento"} #${numero}`;

  const [arquivo, setArquivo] = useState<File | null>(null);
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [compartilhando, setCompartilhando] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const [preparandoCupom, setPreparandoCupom] = useState(false);
  const [portalPronto, setPortalPronto] = useState(false);

  useEffect(() => { setPortalPronto(true); }, []);

  useEffect(() => {
    const controller = new AbortController();
    setCarregando(true); setArquivo(null); setMensagem("");
    fetch("/api/pedidos/" + encodeURIComponent(pedidoId) + "/pdf", { signal: controller.signal, cache: "no-store" })
      .then(async res => {
        if (!res.ok) throw new Error("Não foi possível gerar o PDF. Tente novamente.");
        const blob = await res.blob();
        if (!blob.type.includes("application/pdf")) throw new Error("O arquivo recebido não é um PDF.");
        if (!controller.signal.aborted) setArquivo(new File([blob], "oca" + numero + ".pdf", { type: "application/pdf" }));
      })
      .catch(error => { if (!controller.signal.aborted) setMensagem(error.message || "Falha ao gerar PDF."); })
      .finally(() => { if (!controller.signal.aborted) setCarregando(false); });
    return () => controller.abort();
  }, [pedidoId, numero, tentativa]);

  // Imprime o cupom na própria página: o conteúdo fica em um portal oculto,
  // visível apenas durante a impressão (regra em globals.css).
  async function imprimirCupom() {
    setPreparandoCupom(true);
    setMensagem("");
    document.documentElement.classList.add("imprimindo-cupom");
    try {
      await document.fonts.ready;
      const cupom = document.getElementById("cupom-conteudo");
      if (!cupom) throw new Error("Não foi possível preparar o cupom.");
      await Promise.all([...cupom.querySelectorAll("img")].map(img => img.decode().catch(() => undefined)));
      let estilo = document.getElementById("cupom-tamanho-pagina");
      if (!estilo) {
        estilo = document.createElement("style");
        estilo.id = "cupom-tamanho-pagina";
        document.head.appendChild(estilo);
      }
      estilo.textContent = "@page { size: 72mm 297mm; margin: 0; }";
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      window.print();
    } catch (error) {
      setMensagem(error instanceof Error ? error.message : "Não foi possível imprimir o cupom.");
    } finally {
      document.documentElement.classList.remove("imprimindo-cupom");
      document.getElementById("cupom-tamanho-pagina")?.remove();
      setPreparandoCupom(false);
    }
  }

  function baixar() {
    if (!arquivo) return;
    const url = URL.createObjectURL(arquivo);
    const link = document.createElement("a");
    link.href = url; link.download = arquivo.name;
    document.body.appendChild(link); link.click(); link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  async function compartilhar() {
    if (!arquivo || compartilhando) return;
    // O arquivo já está pronto: a chamada acontece diretamente no clique.
    if (navigator.share && navigator.canShare?.({ files: [arquivo] })) {
      setCompartilhando(true); setMensagem("");
      try {
        await navigator.share({ files: [arquivo], title: shareTitle });
      } catch (error) {
        if (!(error instanceof Error && error.name === "AbortError"))
          setMensagem("Não foi possível compartilhar. Baixe o PDF e anexe como documento no WhatsApp.");
      } finally { setCompartilhando(false); }
    } else {
      baixar();
      setMensagem("PDF baixado. Abra o WhatsApp e anexe o arquivo como documento na conversa.");
    }
  }

  const btn = "flex-1 min-w-[130px] inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50";
  return <>
    <div className="no-print flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={preparandoCupom} onClick={imprimirCupom} className={btn + " bg-slate-900 text-white"}>
          {preparandoCupom ? "Preparando cupom…" : "Imprimir cupom"}
        </button>
        <button type="button" disabled={!arquivo} onClick={baixar} className={btn + " bg-white border border-slate-200"}>{carregando ? "Preparando PDF…" : "Baixar PDF"}</button>
        <button type="button" disabled={!arquivo || compartilhando} onClick={compartilhar} className={btn + " bg-emerald-600 text-white"}>{compartilhando ? "Compartilhando…" : "Enviar PDF pelo WhatsApp"}</button>
        <Link href="/" className={btn + " bg-white border border-slate-200"}>Novo pedido</Link>
      </div>
      <p className="text-xs text-slate-600" role="status">{mensagem || "Escolha o WhatsApp na janela de compartilhamento para enviar o PDF."}</p>
      {!carregando && !arquivo && <button type="button" onClick={() => setTentativa(n => n + 1)} className="text-sm underline">Tentar gerar PDF novamente</button>}
    </div>

    {preparandoCupom && <div className="no-print fixed inset-0 z-[70] grid place-items-center bg-slate-900/30 p-4" role="status" aria-live="polite">
      <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 shadow-xl">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" aria-hidden="true" />
        <span className="text-sm font-medium text-slate-800">Preparando cupom…</span>
      </div>
    </div>}

    {portalPronto && createPortal(
      <div id="cupom-print-root" className="hidden">
        <CupomConteudo pedido={pedido} config={config} />
      </div>,
      document.body
    )}
  </>;
}
