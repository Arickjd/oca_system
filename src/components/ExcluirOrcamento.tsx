"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ExcluirOrcamento({ id, numero, venda = false }: { id: string; numero: number; venda?: boolean }) {
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

  return <div>
    {confirmando ? <div className="flex flex-col gap-2">
      <p className="text-sm">Excluir {venda ? "a venda" : "o orçamento"} #{numero}? O registro sairá do histórico. A numeração dos próximos orçamentos será mantida.</p>
      <div className="flex gap-3">
        <button type="button" disabled={excluindo} onClick={excluir} className="rounded-lg bg-red-700 px-3 py-2 text-sm text-white disabled:opacity-50">{excluindo ? "Excluindo…" : "Confirmar exclusão"}</button>
        <button type="button" disabled={excluindo} onClick={() => { setConfirmando(false); setErro(""); }} className="rounded-lg border px-3 py-2 text-sm">Cancelar</button>
      </div>
    </div> : <button type="button" aria-label={`Excluir ${venda ? "venda" : "orçamento"} #${numero}`} onClick={() => setConfirmando(true)} className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700">Excluir</button>}
    {erro && <p role="alert" className="mt-2 text-sm text-red-700">{erro}</p>}
  </div>;
}
