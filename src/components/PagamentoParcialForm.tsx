"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatBRL } from "@/lib/format";
import { dataDoLembrete } from "@/lib/pagamentos";
import { dataCurta, diaLocal } from "@/lib/periodoOrcamentos";
import type { FormaPagamento } from "@/lib/types";

const formas: { valor: FormaPagamento; nome: string }[] = [
  { valor: "pix", nome: "Pix" },
  { valor: "cartao", nome: "Cartão" },
  { valor: "dinheiro", nome: "Dinheiro" },
];

type Lembrete = "nenhum" | "semana" | "mes" | "data";

// Recebimento parcial: registra quanto entrou agora e mantém o orçamento aberto.
export function PagamentoParcialForm({ id, restante, revisao, onFechar }: {
  id: string;
  restante: number;
  revisao: number;
  onFechar?: () => void;
}) {
  const router = useRouter();
  const [valor, setValor] = useState("");
  const [forma, setForma] = useState<FormaPagamento>("pix");
  const [lembrete, setLembrete] = useState<Lembrete>("nenhum");
  const [data, setData] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const hoje = diaLocal(new Date());

  const limpo = valor.trim();
  const numero = Number(limpo.includes(",") ? limpo.replace(/\./g, "").replace(",", ".") : limpo);
  const previa = lembrete === "nenhum" ? null : dataDoLembrete(lembrete, data);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    if (enviando) return;
    setErro("");
    if (!Number.isFinite(numero) || numero <= 0) return setErro("Informe o valor que o cliente pagou agora.");
    if (numero >= restante) return setErro(`O valor precisa ser menor que o restante (${formatBRL(restante)}). Para receber tudo, use o pagamento total.`);
    if (lembrete === "data" && (!data || data < hoje)) return setErro("Escolha uma data de hoje em diante para o lembrete.");
    setEnviando(true);
    try {
      const res = await fetch(`/api/pedidos/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          revisao,
          pagamento_parcial: { valor: numero, forma_pagamento: forma, previsao_recebimento: previa },
        }),
      });
      if (!res.ok) {
        const corpo = await res.json().catch(() => ({}));
        throw new Error(corpo.error || "Não foi possível registrar o recebimento parcial.");
      }
      router.refresh();
      onFechar?.();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Falha ao registrar o recebimento parcial.");
    } finally {
      setEnviando(false);
    }
  }

  return <form onSubmit={enviar} className="mt-3 rounded-xl border border-amber-300 bg-amber-50/60 p-3">
    <div className="flex flex-wrap items-baseline justify-between gap-1">
      <h3 className="text-sm font-bold text-amber-900">Pagamento parcial</h3>
      <span className="text-xs text-amber-900">Falta receber <strong className="tabular-nums">{formatBRL(restante)}</strong></span>
    </div>

    <label className="mt-3 block text-xs font-semibold text-slate-700" htmlFor={`parcial-valor-${id}`}>Valor pago agora (R$)</label>
    <input id={`parcial-valor-${id}`} value={valor} onChange={e => setValor(e.target.value)} inputMode="decimal" placeholder="0,00" autoComplete="off"
      className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base tabular-nums outline-none focus:border-amber-600" />

    <fieldset className="mt-3">
      <legend className="text-xs font-semibold text-slate-700">Forma de pagamento</legend>
      <div className="mt-1 grid grid-cols-3 gap-2">
        {formas.map(opcao => <button key={opcao.valor} type="button" onClick={() => setForma(opcao.valor)} aria-pressed={forma === opcao.valor}
          className={`min-h-10 rounded-lg border px-2 py-2 text-sm font-semibold transition ${forma === opcao.valor ? "border-amber-700 bg-amber-700 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-amber-500"}`}>
          {opcao.nome}
        </button>)}
      </div>
    </fieldset>

    <label className="mt-3 block text-xs font-semibold text-slate-700" htmlFor={`parcial-lembrete-${id}`}>Lembrete para receber o restante (opcional)</label>
    <select id={`parcial-lembrete-${id}`} value={lembrete} onChange={e => setLembrete(e.target.value as Lembrete)}
      className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-600">
      <option value="nenhum">Sem lembrete</option>
      <option value="semana">Em 1 semana</option>
      <option value="mes">Em 1 mês</option>
      <option value="data">Escolher data</option>
    </select>

    {lembrete === "data" && <input type="date" value={data} min={hoje} onChange={e => setData(e.target.value)} aria-label="Data do lembrete"
      className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-600" />}

    {previa && <p className="mt-1 text-xs text-slate-600">Aviso para receber até <strong>{dataCurta(previa)}</strong>.</p>}
    {erro && <p role="alert" className="mt-2 text-sm text-red-700">{erro}</p>}

    <div className="mt-3 flex flex-wrap items-center gap-2">
      <button type="submit" disabled={enviando}
        className="min-h-11 rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-800 disabled:opacity-60">
        {enviando ? "Registrando…" : "Confirmar recebimento"}
      </button>
      {onFechar && <button type="button" onClick={onFechar} className="min-h-11 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 underline">Cancelar</button>}
    </div>
    <p className="mt-2 text-xs text-slate-500">O orçamento continua em aberto na aba “Recebimento parcial” até a quitação.</p>
  </form>;
}
