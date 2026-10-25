import { notFound } from "next/navigation";
import Link from "next/link";
import { getPedido } from "@/lib/db";
import { getConfig } from "@/lib/config";
import {
  formatBRL,
  formatData,
} from "@/lib/format";
import { ReciboAcoes } from "@/components/ReciboAcoes";
import { PagamentoOrcamento } from "@/components/PagamentoOrcamento";
import { exigirSessao } from "@/lib/auth-servidor";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export default async function OrcamentoPage({ params }: Params) {
  await exigirSessao();
  const { id } = await params;
  const [pedido, config] = await Promise.all([getPedido(id), getConfig()]);
  if (!pedido) notFound();


  return (
    <div className="min-h-dvh bg-slate-100">
      {/* Barra de ações (não imprime) */}
      <div className="no-print sticky top-0 z-20 bg-slate-100/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-[210mm] mx-auto px-3 py-3">
          <Link href={pedido.status_pagamento === "finalizado" ? "/vendas" : "/orcamentos"} className="inline-block mb-3 text-sm underline">{pedido.status_pagamento === "finalizado" ? "Voltar às vendas" : "Voltar aos orçamentos"}</Link>
          <ReciboAcoes
            key={pedido.revisao ?? 0}
            pedidoId={pedido.id}
            numero={pedido.numero}
            shareTitle={`${config.distribuidora_nome} — Orçamento #${pedido.numero}`}
          />
        </div>
      </div>

      <div className="p-3 sm:p-6">
        <div id="pagamento" className="no-print mx-auto mb-4 max-w-[210mm] scroll-mt-52">
          <PagamentoOrcamento key={pedido.revisao ?? 0} id={pedido.id} finalizado={pedido.status_pagamento === "finalizado"} forma={pedido.forma_pagamento} revisao={pedido.revisao ?? 0} />
        </div>
        {/* Recibo A4 */}
        <article className="recibo bg-white text-slate-900 mx-auto max-w-[210mm] w-full rounded-lg shadow-lg p-4 sm:p-10">
          {/* Cabeçalho */}
          <header className="flex items-start justify-between gap-4 border-b border-slate-200 pb-5">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt={config.distribuidora_nome}
                className="h-16 w-auto max-w-[45vw] object-contain"
              />
            </div>
            <div className="text-right">
              <h1 className="text-lg font-bold tracking-tight">ORÇAMENTO</h1>
              <p className="text-sm text-slate-500">
                Nº {String(pedido.numero).padStart(4, "0")}
              </p>
              <p className="text-sm text-slate-500">
                {formatData(pedido.created_at)}
              </p>
            </div>
          </header>

          {/* Dados do cliente */}
          {(pedido.cliente_nome || pedido.telefone) && (
            <section className="py-5 border-b border-slate-200">
              <h2 className="text-xs uppercase tracking-wide text-slate-400 mb-2">
                Cliente
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-sm">
                {pedido.cliente_nome && (
                  <p>
                    <span className="text-slate-500">Nome: </span>
                    <span className="font-medium">{pedido.cliente_nome}</span>
                  </p>
                )}
                {pedido.telefone && (
                  <p>
                    <span className="text-slate-500">Telefone: </span>
                    <span className="font-medium">{pedido.telefone}</span>
                  </p>
                )}
              </div>
            </section>
          )}

          {/* Itens */}
          {pedido.criado_por && <p className="pt-4 text-sm text-slate-500">Responsável: <span className="font-medium text-slate-700">{pedido.criado_por.nome}</span></p>}
          <section className="py-5">
            <table className="w-full table-fixed text-xs sm:text-sm border-collapse break-words">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-200">
                  <th className="py-2 font-medium w-[36%]">Produto</th>
                  <th className="py-2 font-medium text-center w-[8%]">Qtd</th>
                  <th className="py-2 font-medium text-right w-[34%]">Valores por item</th>
                  <th className="py-2 pl-2 font-medium text-right w-[22%]">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {pedido.itens.map((it) => (
                  <tr key={it.id} className="border-b border-slate-100 align-top">
                    <td className="py-2 pr-2">
                      <span className="font-medium">{it.produto_nome}</span>
                      {it.modo === "pacote" && (
                        <span className="block text-xs text-slate-400">
                          Atacado · pacote
                          {it.pack_quantidade
                            ? ` com ${it.pack_quantidade} itens`
                            : ""}
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-center tabular-nums">
                      {it.quantidade}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {(it.desconto_unitario ?? 0) > 0 ? <>
                        <span className="block text-xs text-slate-500">Valor Original: {formatBRL(it.preco_original ?? it.preco_unitario)}</span>
                        <span className="block text-xs text-emerald-700">Desconto: {formatBRL(it.desconto_unitario ?? 0)}</span>
                        <span className="block font-medium text-emerald-800">Valor final: {formatBRL(it.preco_unitario)}</span>
                      </> : <span className="block font-medium text-slate-500">Valor Original: {formatBRL(it.preco_original ?? it.preco_unitario)}</span>}
                    </td>
                    <td className="py-2 pl-2 text-right tabular-nums font-medium">
                      {formatBRL(it.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Total */}
          <section className="flex justify-end border-t-2 border-slate-900 pt-3">
            <div className="w-full sm:w-72">
              {pedido.itens.some(it => (it.desconto_unitario ?? 0) > 0) && <p className="mb-2 text-right text-sm text-emerald-800">Desconto total: {formatBRL(pedido.itens.reduce((s, it) => s + Math.round((it.desconto_unitario ?? 0) * it.quantidade * 100), 0) / 100)}</p>}
              <div className="flex items-center justify-between">
              <span className="font-medium text-slate-600">Total</span>
              <span className="text-2xl font-bold tabular-nums">
                {formatBRL(pedido.valor_total)}
              </span>
              </div>
            </div>
          </section>

          {/* Observação */}
          {pedido.observacao && (
            <section className="mt-5 rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm">
              <span className="text-slate-500">Observação: </span>
              {pedido.observacao}
            </section>
          )}

          {/* Rodapé */}
          <footer className="mt-8 pt-5 border-t border-slate-200 text-center text-xs text-slate-500">
            <p className="font-semibold text-slate-700">
              {config.distribuidora_nome}
            </p>
            {config.distribuidora_contato && (
              <p>{config.distribuidora_contato}</p>
            )}
            {config.endereco && <p>{config.endereco}</p>}
            <p className="mt-2 text-slate-400">
              Este orçamento não é um documento fiscal.
            </p>
          </footer>
        </article>
      </div>
    </div>
  );
}
