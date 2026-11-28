"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import type { Cliente } from "@/lib/types";

// Campo de nome com sugestões de clientes cadastrados. O texto livre continua válido:
// nem toda venda é de um cliente recorrente.
export function CampoNomeCliente({ id, valor, cliente, onChange, onSelecionar, onDesvincular, disabled, inputClassName }: {
  id?: string;
  valor: string;
  cliente: Cliente | null;
  onChange: (nome: string) => void;
  onSelecionar: (cliente: Cliente) => void;
  onDesvincular: () => void;
  disabled?: boolean;
  inputClassName?: string;
}) {
  const autoId = useId();
  const idCampo = id ?? `${autoId}-cliente`;
  const listaId = `${idCampo}-sugestoes`;
  const container = useRef<HTMLDivElement>(null);
  const [sugestoes, setSugestoes] = useState<Cliente[]>([]);
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(0);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    function fechar(event: PointerEvent) {
      if (!container.current?.contains(event.target as Node)) setAberto(false);
    }
    document.addEventListener("pointerdown", fechar);
    return () => document.removeEventListener("pointerdown", fechar);
  }, []);

  useEffect(() => {
    const termo = valor.trim();
    if (!aberto || cliente || termo.length < 2) {
      setSugestoes([]);
      setCarregando(false);
      setErro("");
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setCarregando(true);
      setErro("");
      try {
        const res = await fetch(`/api/clientes?busca=${encodeURIComponent(termo)}&limite=8`, { signal: controller.signal });
        if (!res.ok) throw new Error("busca");
        const data = await res.json();
        setSugestoes(Array.isArray(data) ? data : []);
        setAtivo(0);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setSugestoes([]);
          setErro("Não foi possível buscar os clientes.");
        }
      } finally {
        setCarregando(false);
      }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [valor, aberto, cliente]);

  function selecionar(indice: number) {
    const escolhido = sugestoes[indice];
    if (!escolhido) return;
    onSelecionar(escolhido);
    setAberto(false);
    setSugestoes([]);
  }

  function teclado(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (!sugestoes.length) return;
      event.preventDefault();
      setAberto(true);
      setAtivo(indice => (indice + (event.key === "ArrowDown" ? 1 : -1) + sugestoes.length) % sugestoes.length);
    } else if (event.key === "Enter" && aberto && sugestoes.length) {
      event.preventDefault();
      selecionar(ativo);
    } else if (event.key === "Escape") {
      setAberto(false);
    }
  }

  return <div ref={container} className="relative">
    <input
      id={idCampo}
      type="text"
      role="combobox"
      aria-autocomplete="list"
      aria-expanded={aberto && !cliente && valor.trim().length >= 2}
      aria-controls={listaId}
      aria-activedescendant={aberto && sugestoes[ativo] ? `${listaId}-${ativo}` : undefined}
      autoComplete="off"
      disabled={disabled}
      value={valor}
      onChange={event => { onChange(event.target.value); setAberto(true); }}
      onFocus={() => setAberto(true)}
      onKeyDown={teclado}
      placeholder="Nome do cliente"
      className={inputClassName ?? "w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-amber-500"}
    />
    {cliente && <p className="mt-1 flex flex-wrap items-center gap-1 text-[11px] font-medium text-emerald-800">
      <span aria-hidden="true">●</span> Cliente cadastrado vinculado
      <button type="button" onClick={onDesvincular} className="ml-0.5 underline decoration-emerald-700/50 hover:text-emerald-950">desvincular</button>
    </p>}
    {aberto && !cliente && valor.trim().length >= 2 && <div id={listaId} role="listbox" aria-label="Clientes cadastrados" className="absolute inset-x-0 top-full z-30 mt-1 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10">
      {carregando ? <p className="px-3 py-2 text-sm text-slate-500">Buscando clientes…</p>
        : erro ? <p className="px-3 py-2 text-sm text-red-700">{erro}</p>
        : sugestoes.length ? sugestoes.map((sugestao, indice) => <button
            key={sugestao.id}
            id={`${listaId}-${indice}`}
            type="button"
            role="option"
            aria-selected={indice === ativo}
            onMouseEnter={() => setAtivo(indice)}
            onMouseDown={event => event.preventDefault()}
            onClick={() => selecionar(indice)}
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${indice === ativo ? "bg-amber-50 text-slate-900" : "text-slate-700"}`}
          >
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-600">{sugestao.nome[0]}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{sugestao.nome}</span>
              {(sugestao.telefone || sugestao.documento) && <span className="block truncate text-[11px] text-slate-500">{sugestao.telefone}{sugestao.telefone && sugestao.documento ? " · " : ""}{sugestao.documento}</span>}
            </span>
          </button>)
        : <p className="px-3 py-2 text-sm text-slate-500">Nenhum cliente cadastrado. Continue com o nome digitado.</p>}
    </div>}
  </div>;
}
