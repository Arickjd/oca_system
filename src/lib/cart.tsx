"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CartItem } from "./types";

type CartItemPatch = Partial<
  Pick<CartItem, "nome" | "preco_unitario" | "pack_quantidade" | "quantidade">
>;

interface CartContextValue {
  itens: CartItem[];
  totalItens: number;
  totalValor: number;
  adicionar: (item: CartItem) => void;
  atualizarItem: (produtoId: string, patch: CartItemPatch) => void;
  definirQuantidade: (produtoId: string, quantidade: number) => void;
  remover: (produtoId: string) => void;
  limpar: () => void;
  quantidadeDe: (produtoId: string) => number;
  carregado: boolean;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children, usuarioId }: { children: ReactNode; usuarioId: string | null }) {
  const [itens, setItens] = useState<CartItem[]>([]);
  const [carregado, setCarregado] = useState(false);
  const storageKey = usuarioId ? `oca_carrinho_atacado_v3_${usuarioId}` : null;

  // Carrega do localStorage no cliente
  useEffect(() => {
    if (!storageKey) { setItens([]); setCarregado(true); return; }
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) setItens(parsed.filter((item): item is CartItem =>
          item && typeof item.produto_id === "string" && typeof item.nome === "string" &&
          typeof item.preco_unitario === "number" && Number.isFinite(item.preco_unitario) && item.preco_unitario >= 0 &&
          Number.isSafeInteger(item.quantidade) && item.quantidade > 0 &&
          Number.isSafeInteger(item.pack_quantidade) && item.pack_quantidade > 0
        ).map(item => ({ ...item, preco_original: typeof item.preco_original === "number" && Number.isFinite(item.preco_original) && item.preco_original >= 0 ? item.preco_original : item.preco_unitario })));
      }
    } catch {
      /* ignore */
    }
    setCarregado(true);
  }, [storageKey]);

  // Persiste sempre que muda
  useEffect(() => {
    if (!carregado || !storageKey) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(itens));
    } catch {
      /* ignore */
    }
  }, [itens, carregado, storageKey]);

  const adicionar = (item: CartItem) => {
    setItens((atual) => {
      const idx = atual.findIndex((i) => i.produto_id === item.produto_id);
      if (idx === -1) return [...atual, { ...item, preco_original: item.preco_original ?? item.preco_unitario }];
      const copia = [...atual];
      copia[idx] = {
        ...copia[idx],
        quantidade: copia[idx].quantidade + item.quantidade,
      };
      return copia;
    });
  };

  const atualizarItem = (produtoId: string, patch: CartItemPatch) => {
    setItens((atual) =>
      atual.map((item) => {
        if (item.produto_id !== produtoId) return item;
        const atualizado = { ...item, ...patch };
        return {
          ...atualizado,
          nome: atualizado.nome,
          preco_unitario: Math.max(0, Number(atualizado.preco_unitario) || 0),
          pack_quantidade: Math.max(1, Math.trunc(Number(atualizado.pack_quantidade) || 1)),
          quantidade: Math.max(1, Math.trunc(Number(atualizado.quantidade) || 1)),
        };
      })
    );
  };

  const definirQuantidade = (produtoId: string, quantidade: number) => {
    setItens((atual) => {
      if (quantidade <= 0) {
        return atual.filter((i) => i.produto_id !== produtoId);
      }
      return atual.map((i) =>
        i.produto_id === produtoId ? { ...i, quantidade } : i
      );
    });
  };

  const remover = (produtoId: string) => {
    setItens((atual) => atual.filter((i) => i.produto_id !== produtoId));
  };

  const limpar = () => setItens([]);

  const quantidadeDe = (produtoId: string) => {
    return itens.find((i) => i.produto_id === produtoId)?.quantidade ?? 0;
  };

  const totalItens = useMemo(
    () => itens.reduce((s, i) => s + i.quantidade, 0),
    [itens]
  );
  const totalValor = useMemo(
    () => Math.round(itens.reduce((s, i) => s + Math.round(i.preco_unitario * i.quantidade * 100), 0)) / 100,
    [itens]
  );

  const value: CartContextValue = {
    itens,
    totalItens,
    totalValor,
    adicionar,
    atualizarItem,
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
