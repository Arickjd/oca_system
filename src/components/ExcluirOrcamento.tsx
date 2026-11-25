"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ExcluirOrcamento({ id, numero, venda = false, className = "", link = false }: { id: string; numero: number; venda?: boolean; className?: string; link?: boolean }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState("");

  async function excluir() {
    setExcluindo(true);
    setErro("");
    try {
      const res = await fetch(`/api/pedidos/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok && res.status !== 404) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Não foi possível excluir. Tente novamente.");
      }
      router.refresh();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Falha ao excluir.");
      setExcluindo(false);
    }
  }

  return <div className={className}>
    {confirmando ? <div className={link ? "rounded-lg border border-red-200 bg-red-50 p-2" : "flex flex-col gap-2"}>
      <p className={link ? "text-xs text-red-900" : "text-sm"}>Excluir {venda ? "a venda" : "o orçamento"} #{numero}? O registro sairá do histórico. A numeração dos próximos orçamentos será mantida.</p>
      <div className={link ? "mt-1.5 flex gap-2" : "flex flex-wrap gap-2"}>
        <button type="button" disabled={excluindo} onClick={excluir} className={link ? "min-h-8 rounded-md bg-red-700 px-2 py-1 text-xs font-semibold text-white disabled:opacity-50" : "min-h-10 rounded-lg bg-red-700 px-3 py-2 text-sm text-white disabled:opacity-50"}>{excluindo ? "Excluindo…" : link ? "Excluir" : "Confirmar exclusão"}</button>
        <button type="button" disabled={excluindo} onClick={() => { setConfirmando(false); setErro(""); }} className={link ? "min-h-8 rounded-md border border-red-200 bg-white px-2 py-1 text-xs" : "min-h-10 rounded-lg border px-3 py-2 text-sm"}>Cancelar</button>
      </div>
    </div> : <button type="button" aria-label={`Excluir ${venda ? "venda" : "orçamento"} #${numero}`} onClick={() => setConfirmando(true)}
      className={link ? "text-xs font-medium text-red-700 underline" : "min-h-10 w-full rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700 sm:w-auto"}>Excluir</button>}
    {erro && <p role="alert" className="mt-2 text-sm text-red-700">{erro}</p>}
  </div>;
}
