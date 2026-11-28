"use client";

import { useCart } from "@/lib/cart";
import { formatBRL } from "@/lib/format";
import { imagemDoProduto } from "@/lib/imagensProduto";
import { saldoProduto, situacaoDoSaldo } from "@/lib/estoque";
import type { Produto } from "@/lib/types";
import { RentabilidadeProduto } from "./RentabilidadeProduto";

function Stepper({
  qtd,
  onChange,
}: {
  qtd: number;
  onChange: (q: number) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-100 select-none">
      <button
        type="button"
        aria-label="Diminuir"
        onClick={() => onChange(qtd - 1)}
        className="w-9 h-9 grid place-items-center text-xl font-bold text-slate-600 active:scale-90 transition"
      >
        −
      </button>
      <span className="font-semibold text-slate-900 tabular-nums">{qtd}</span>
      <button
        type="button"
        aria-label="Aumentar"
        onClick={() => onChange(qtd + 1)}
        className="w-9 h-9 grid place-items-center text-xl font-bold text-amber-600 active:scale-90 transition"
      >
        +
      </button>
    </div>
  );
}

function WholesaleControl({
  label,
  preco,
  qtd,
  onAdd,
  onChange,
}: {
  label: string;
  preco: number;
  qtd: number;
  onAdd: () => void;
  onChange: (q: number) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-2 flex flex-col gap-2">
      <div>
        <p className="text-[11px] uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <p className="font-semibold text-slate-900 text-sm tabular-nums">
          {formatBRL(preco)}
        </p>
      </div>
      {qtd === 0 ? (
        <button
          type="button"
          onClick={onAdd}
          className="rounded-lg bg-slate-900 text-white text-sm font-medium py-2 active:scale-95 transition"
        >
          Adicionar
        </button>
      ) : (
        <Stepper qtd={qtd} onChange={onChange} />
      )}
    </div>
  );
}

export function ProdutoCard({
  produto,
}: {
  produto: Produto;
}) {
  const { quantidadeDe, adicionar, definirQuantidade } = useCart();
  const qtdPack = quantidadeDe(produto.id);
  // Saldo informativo: nunca bloqueia a venda (a baixa ocorre na efetivação).
  const saldo = saldoProduto(produto);
  const situacao = situacaoDoSaldo(saldo);

  const addPacote = () =>
    adicionar({
      produto_id: produto.id,
      nome: produto.nome,
      preco_unitario: produto.preco_pack,
      preco_original: produto.preco_pack,
      pack_quantidade: produto.pack_quantidade,
      imagem_url: imagemDoProduto(produto),
      quantidade: 1,
    });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-3 flex flex-col gap-3">
      <div className="flex gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imagemDoProduto(produto)}
          alt=""
          className="w-14 h-14 rounded-lg object-cover bg-slate-100 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-slate-900 text-sm leading-tight line-clamp-2">
            {produto.nome}
          </h3>
          {produto.descricao && (
            <p className="text-xs text-slate-500 mt-0.5 whitespace-pre-wrap break-words">{produto.descricao}</p>
          )}
          {situacao !== "nao-controlado" && (
            <p className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              situacao === "negativo" || situacao === "zerado" ? "bg-red-100 text-red-800"
                : situacao === "baixo" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"
            }`}>
              Estoque: {saldo} un{situacao === "negativo" ? " · negativo" : situacao === "zerado" ? " · zerado" : situacao === "baixo" ? " · baixo" : ""}
            </p>
          )}
        </div>
      </div>

      <div>
        <RentabilidadeProduto venda={produto.preco_pack} custo={produto.custo_pack} />
        <WholesaleControl
          label={`Atacado · pacote com ${produto.pack_quantidade}`}
          preco={produto.preco_pack}
          qtd={qtdPack}
          onAdd={addPacote}
          onChange={(q) => definirQuantidade(produto.id, q)}
        />
      </div>
    </div>
  );
}
