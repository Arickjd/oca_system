"use client";

import { useCart } from "@/lib/cart";
import { formatBRL } from "@/lib/format";
import type { Produto } from "@/lib/types";

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
  categoriaNome,
}: {
  produto: Produto;
  categoriaNome?: string;
}) {
  const { quantidadeDe, adicionar, definirQuantidade } = useCart();
  const qtdPack = quantidadeDe(produto.id);

  const addPacote = () =>
    adicionar({
      produto_id: produto.id,
      nome: produto.nome,
      preco_unitario: produto.preco_pack,
      pack_quantidade: produto.pack_quantidade,
      imagem_url: produto.imagem_url,
      quantidade: 1,
    });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-3 flex flex-col gap-3">
      <div className="flex gap-3">
        {produto.imagem_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={produto.imagem_url}
            alt={produto.nome}
            className="w-14 h-14 rounded-lg object-cover bg-slate-100 shrink-0"
          />
        ) : (
          <div className="w-14 h-14 rounded-lg bg-slate-100 grid place-items-center text-slate-300 shrink-0">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              className="w-7 h-7"
            >
              <path d="M9 2h6v3l1.5 2.5A4 4 0 0 1 17 10v9a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-9a4 4 0 0 1 .5-2.5L9 5V2Z" />
              <path d="M7.5 12h9" />
            </svg>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-slate-900 text-sm leading-tight line-clamp-2">
            {produto.nome}
          </h3>
          {categoriaNome && (
            <p className="text-xs text-slate-500 mt-0.5">{categoriaNome}</p>
          )}
        </div>
      </div>

      <div>
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
