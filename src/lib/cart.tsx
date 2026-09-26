"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CartItem, ModoVenda } from "./types";

const STORAGE_KEY = "oca_carrinho_v1";

function chave(produtoId: string, modo: ModoVenda) {
  return `${produtoId}:${modo}`;
}

interface CartContextValue {
  itens: CartItem[];
  totalItens: number;
  totalValor: number;
  adicionar: (item: CartItem) => void;
  definirQuantidade: (
    produtoId: string,
    modo: ModoVenda,
    quantidade: number
  ) => void;
  remover: (produtoId: string, modo: ModoVenda) => void;
  limpar: () => void;
  quantidadeDe: (produtoId: string, modo: ModoVenda) => number;
  carregado: boolean;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<CartItem[]>([]);
  const [carregado, setCarregado] = useState(false);

  // Carrega do localStorage no cliente
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setItens(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setCarregado(true);
  }, []);

  // Persiste sempre que muda
  useEffect(() => {
    if (!carregado) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(itens));
    } catch {
      /* ignore */
    }
  }, [itens, carregado]);

  const adicionar = (item: CartItem) => {
    setItens((atual) => {
      const k = chave(item.produto_id, item.modo);
      const idx = atual.findIndex(
        (i) => chave(i.produto_id, i.modo) === k
      );
      if (idx === -1) return [...atual, item];
      const copia = [...atual];
      copia[idx] = {
        ...copia[idx],
        quantidade: copia[idx].quantidade + item.quantidade,
      };
      return copia;
    });
  };

  const definirQuantidade = (
    produtoId: string,
    modo: ModoVenda,
    quantidade: number
  ) => {
    setItens((atual) => {
      const k = chave(produtoId, modo);
      if (quantidade <= 0) {
        return atual.filter((i) => chave(i.produto_id, i.modo) !== k);
      }
      return atual.map((i) =>
        chave(i.produto_id, i.modo) === k ? { ...i, quantidade } : i
      );
    });
  };

  const remover = (produtoId: string, modo: ModoVenda) => {
    setItens((atual) =>
      atual.filter((i) => chave(i.produto_id, i.modo) !== chave(produtoId, modo))
    );
  };

  const limpar = () => setItens([]);

  const quantidadeDe = (produtoId: string, modo: ModoVenda) => {
    const k = chave(produtoId, modo);
    return itens.find((i) => chave(i.produto_id, i.modo) === k)?.quantidade ?? 0;
  };

  const totalItens = useMemo(
    () => itens.reduce((s, i) => s + i.quantidade, 0),
    [itens]
  );
  const totalValor = useMemo(
    () => itens.reduce((s, i) => s + i.preco_unitario * i.quantidade, 0),
    [itens]
  );

  const value: CartContextValue = {
    itens,
    totalItens,
    totalValor,
    adicionar,
    definirQuantidade,
    remover,
    limpar,
    quantidadeDe,
    carregado,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart deve ser usado dentro de <CartProvider>");
  return ctx;
}
