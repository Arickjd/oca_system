"use client";

import { useEffect } from "react";
import { formatBRL } from "@/lib/format";
import type { FormaPagamento } from "@/lib/types";

const nomes: Record<FormaPagamento, string> = { pix: "Pix", cartao: "Cartão", dinheiro: "Dinheiro" };

// Confirmação antes de efetivar a venda, para evitar toque acidental na forma de pagamento.
export function ConfirmarPagamento({ forma, valor, parcial, ocupado, onConfirmar, onCancelar }: {
  forma: FormaPagamento;
  valor: number;
  parcial?: boolean;
  ocupado: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  useEffect(() => {
    function tecla(evento: KeyboardEvent) {
      if (evento.key === "Escape" && !ocupado) onCancelar();
    }
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [ocupado, onCancelar]);

  return <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-900/40 p-4"
    role="dialog" aria-modal="true" aria-labelledby="confirmar-pagamento"
    onClick={() => { if (!ocupado) onCancelar(); }}>
    <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl" onClick={evento => evento.stopPropagation()}>
      <h2 id="confirmar-pagamento" className="text-lg font-bold text-slate-900">Confirmar pagamento</h2>
      <p className="mt-1 text-sm text-slate-600">
        {parcial ? "Quitar o restante de" : "Registrar"} <strong className="text-slate-900">{formatBRL(valor)}</strong> em <strong className="text-slate-900">{nomes[forma]}</strong>?
      </p>
      <p className="mt-2 text-xs text-slate-500">A venda é finalizada na hora e não há como desfazer.</p>
      <div className="mt-4 flex gap-2">
        <button type="button" autoFocus disabled={ocupado} onClick={onCancelar}
          className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50">Cancelar</button>
        <button type="button" disabled={ocupado} onClick={onConfirmar}
          className="flex-1 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{ocupado ? "Confirmando…" : "Confirmar"}</button>
      </div>
    </div>
  </div>;
}
