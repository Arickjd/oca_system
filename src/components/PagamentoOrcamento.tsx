"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatBRL, formatData } from "@/lib/format";
import { situacaoPrazo } from "@/lib/pagamentos";
import { dataCurta } from "@/lib/periodoOrcamentos";
import type { FormaPagamento, PagamentoParcial, StatusPagamento } from "@/lib/types";
import { PagamentoParcialForm } from "./PagamentoParcialForm";
import { ConfirmarPagamento } from "./ConfirmarPagamento";

const nomes: Record<FormaPagamento, string> = { pix: "Pix", cartao: "Cartão", dinheiro: "Dinheiro" };
const opcoes: { valor: FormaPagamento; nome: string; detalhe: string }[] = [
  { valor: "pix", nome: "Pix", detalhe: "Recebimento imediato" },
  { valor: "cartao", nome: "Cartão", detalhe: "Débito ou crédito" },
  { valor: "dinheiro", nome: "Dinheiro", detalhe: "Em espécie" },
];

const tomPrazo = { atraso: "text-red-700", hoje: "text-amber-800", proximo: "text-amber-700", futuro: "text-slate-500" } as const;

export function PagamentoOrcamento({ id, finalizado, status, forma, revisao, valor, pago, restante, previsao, pagamentos }: {
  id: string;
  finalizado: boolean;
  status?: StatusPagamento;
  forma?: FormaPagamento;
  revisao: number;
  valor: number;
  pago: number;
  restante: number;
  previsao?: string | null;
  pagamentos?: PagamentoParcial[];
}) {
  const router = useRouter();
  const [salvando, setSalvando] = useState<FormaPagamento | null>(null);
  const [erro, setErro] = useState("");
  const [confirmada, setConfirmada] = useState<FormaPagamento | null>(null);
  const [abrirParcial, setAbrirParcial] = useState(false);
  const [confirmando, setConfirmando] = useState<FormaPagamento | null>(null);

  // A forma escolhida abre uma confirmação antes de efetivar a venda.
  async function efetivar(escolhida: FormaPagamento) {
    if (salvando) return;
    setSalvando(escolhida); setErro("");
    try {
      const res = await fetch(`/api/pedidos/${encodeURIComponent(id)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ forma_pagamento: escolhida, revisao }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Não foi possível efetivar a venda. Tente novamente.");
      }
      setConfirmada(escolhida);
      setConfirmando(null);
      router.refresh();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Falha ao efetivar a venda.");
    } finally {
      setSalvando(null);
      setConfirmando(null);
    }
  }

  const formaFinal = confirmada ?? forma;
  if (finalizado || confirmada) return <p role="status" className="rounded-xl bg-emerald-50 p-4 font-semibold text-emerald-800">Finalizado{formaFinal ? ` · ${nomes[formaFinal]}` : ""}</p>;

  const parcial = status === "parcial";
  const prazo = situacaoPrazo(previsao);

  return <section className={`rounded-xl border p-4 ${parcial ? "border-amber-300 bg-amber-50" : "border-amber-200 bg-white"}`}>
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h2 className={`font-semibold ${parcial ? "text-amber-900" : "text-amber-800"}`}>{parcial ? "Recebimento parcial" : "Pagamento pendente"}</h2>
      <strong className="text-lg tabular-nums text-slate-900">{formatBRL(parcial ? restante : valor)}</strong>
    </div>

    {parcial && <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
      <span className="text-slate-600">Já recebido: <strong className="tabular-nums text-slate-800">{formatBRL(pago)}</strong></span>
      <span className="font-semibold text-amber-900">Falta receber: <strong className="text-base tabular-nums">{formatBRL(restante)}</strong></span>
    </div>}

    {previsao && <p className={`mt-1 text-sm font-medium ${prazo ? tomPrazo[prazo.tom] : "text-slate-500"}`}>Lembrete: receber até {dataCurta(previsao)}{prazo ? ` · ${prazo.texto}` : ""}</p>}

    <p className="mt-1 text-sm text-slate-500">Toque na forma de pagamento para {parcial ? "quitar o restante e efetivar a venda" : "efetivar a venda"}; você confirma antes de finalizar.</p>

    <div role="group" aria-label="Forma de pagamento" className="mt-3 grid grid-cols-3 gap-2">
      {opcoes.map(opcao => <button key={opcao.valor} type="button" disabled={salvando !== null}
        aria-label={`Efetivar venda com ${opcao.nome}`} onClick={() => setConfirmando(opcao.valor)}
        className="flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl border border-slate-300 bg-white px-2 py-2 text-center transition hover:border-emerald-600 hover:bg-emerald-50 active:scale-[0.98] disabled:opacity-60">
        <span className="text-sm font-semibold text-slate-900">{salvando === opcao.valor ? "Efetivando…" : opcao.nome}</span>
        <span className="hidden text-[11px] leading-tight text-slate-500 sm:block">{opcao.detalhe}</span>
      </button>)}
    </div>

    <button type="button" aria-expanded={abrirParcial} onClick={() => setAbrirParcial(valor => !valor)}
      className="mt-2 w-full rounded-xl border border-amber-400 bg-white px-3 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-50">
      {abrirParcial ? "Fechar recebimento parcial" : "Registrar pagamento parcial"}
    </button>

    {abrirParcial && <PagamentoParcialForm id={id} restante={restante} revisao={revisao} onFechar={() => setAbrirParcial(false)} />}
    {confirmando && <ConfirmarPagamento forma={confirmando} valor={parcial ? restante : valor} parcial={parcial} ocupado={salvando !== null}
      onConfirmar={() => efetivar(confirmando)} onCancelar={() => { if (!salvando) setConfirmando(null); }} />}
    {erro && <p role="alert" className="mt-2 text-sm text-red-700">{erro}</p>}

    {!!pagamentos?.length && <div className="mt-3 border-t border-amber-200 pt-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">Recebimentos registrados</p>
      <ul className="mt-1 flex flex-col gap-1 text-sm">
        {pagamentos.map(pagamento => <li key={pagamento.id} className="flex flex-wrap items-baseline justify-between gap-x-2">
          <span className="text-slate-600">{formatData(pagamento.pago_em)} · {nomes[pagamento.forma_pagamento]}{pagamento.registrado_por ? ` · ${pagamento.registrado_por.nome}` : ""}</span>
          <strong className="tabular-nums text-slate-800">{formatBRL(pagamento.valor)}</strong>
        </li>)}
      </ul>
    </div>}
  </section>;
}
