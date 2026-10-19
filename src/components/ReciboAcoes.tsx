"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function ReciboAcoes({ pedidoId, numero, shareTitle }: { pedidoId: string; numero: number; shareTitle: string }) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [compartilhando, setCompartilhando] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setCarregando(true); setArquivo(null); setMensagem("");
    fetch("/api/pedidos/" + encodeURIComponent(pedidoId) + "/pdf", { signal: controller.signal, cache: "no-store" })
      .then(async res => {
        if (!res.ok) throw new Error("Não foi possível gerar o PDF. Tente novamente.");
        const blob = await res.blob();
        if (!blob.type.includes("application/pdf")) throw new Error("O arquivo recebido não é um PDF.");
        if (!controller.signal.aborted) setArquivo(new File([blob], "orcamento-" + numero + ".pdf", { type: "application/pdf" }));
      })
      .catch(error => { if (!controller.signal.aborted) setMensagem(error.message || "Falha ao gerar PDF."); })
      .finally(() => { if (!controller.signal.aborted) setCarregando(false); });
    return () => controller.abort();
  }, [pedidoId, numero, tentativa]);

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
  return <div className="no-print flex flex-col gap-2">
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => window.print()} className={btn + " bg-slate-900 text-white"}>Imprimir</button>
      <button type="button" disabled={!arquivo} onClick={baixar} className={btn + " bg-white border border-slate-200"}>{carregando ? "Preparando PDF…" : "Baixar PDF"}</button>
      <button type="button" disabled={!arquivo || compartilhando} onClick={compartilhar} className={btn + " bg-emerald-600 text-white"}>{compartilhando ? "Compartilhando…" : "Enviar PDF pelo WhatsApp"}</button>
      <Link href="/" className={btn + " bg-white border border-slate-200"}>Novo pedido</Link>
    </div>
    <p className="text-xs text-slate-600" role="status">{mensagem || "Escolha o WhatsApp na janela de compartilhamento para enviar o PDF."}</p>
    {!carregando && !arquivo && <button type="button" onClick={() => setTentativa(n => n + 1)} className="text-sm underline">Tentar gerar PDF novamente</button>}
  </div>;
}
