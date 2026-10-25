"use client";

import { useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { CartItem } from "@/lib/types";

function dados(item: CartItem) {
  return JSON.stringify({ nome: item.nome.trim(), pack_quantidade: item.pack_quantidade });
}

export function SalvarProduto({ item, children }: { item: CartItem; children: ReactNode }) {
  const router = useRouter();
  const salvo = useRef(dados(item));
  const pendentes = useRef(0);
  const fila = useRef(Promise.resolve());
  const versao = useRef(0);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState(false);

  function salvar() {
    const body = dados(item);
    if (body === salvo.current && !erro && pendentes.current === 0) return;
    pendentes.current++;
    const atual = ++versao.current;
    setMensagem("Salvando no catálogo…");
    setErro(false);
    fila.current = fila.current.then(async () => {
      try {
        const res = await fetch(`/api/produtos/${encodeURIComponent(item.produto_id)}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" }, body,
        });
        const resposta = await res.json();
        if (!res.ok) throw new Error(resposta.error || "Não foi possível salvar.");
        salvo.current = body;
        router.refresh();
        if (atual === versao.current) setMensagem("Alterações salvas no catálogo.");
      } catch (error) {
        if (atual === versao.current) {
          setErro(true);
          setMensagem(error instanceof Error ? error.message : "Falha ao salvar no catálogo.");
        }
      } finally {
        pendentes.current--;
      }
    });
  }

  return <div onBlur={(event) => { if (event.target.tagName === "INPUT") salvar(); }}>
    {children}
    <div className="px-2 py-2 text-xs" aria-live="polite">
      <span className={erro ? "text-red-600" : "text-slate-500"}>{mensagem || "Nome e itens por pacote atualizam o catálogo. O preço negociado vale apenas para esta venda."}</span>
      {erro && <button type="button" onClick={salvar} className="ml-2 font-semibold underline">Tentar salvar novamente</button>}
    </div>
  </div>;
}
