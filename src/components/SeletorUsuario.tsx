"use client";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { USUARIOS, buscarUsuario } from "@/lib/usuarios";

export function SeletorUsuario({ valor, onChange, desabilitado, invalido }: {
  valor: string; onChange: (id: string) => void; desabilitado: boolean; invalido: boolean;
}) {
  const id = useId();
  const container = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(0);
  const selecionado = buscarUsuario(valor);
  const expandido = aberto && !desabilitado;
  useEffect(() => {
    function fechar(event: PointerEvent) {
      if (!container.current?.contains(event.target as Node)) setAberto(false);
    }
    document.addEventListener("pointerdown", fechar);
    return () => document.removeEventListener("pointerdown", fechar);
  }, []);
  useEffect(() => { if (invalido) botao.current?.focus(); }, [invalido]);

  function abrir() {
    setAtivo(Math.max(0, USUARIOS.findIndex(u => u.id === valor)));
    setAberto(true);
  }
  function selecionar(index: number) {
    onChange(USUARIOS[index].id); setAberto(false); botao.current?.focus();
  }
  function teclado(event: KeyboardEvent<HTMLButtonElement>) {
    const tecla = event.key;
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(tecla)) {
      event.preventDefault();
      if (!expandido) abrir();
      if (tecla === "Home") setAtivo(0);
      else if (tecla === "End") setAtivo(USUARIOS.length - 1);
      else if (expandido) setAtivo(index => (index + (tecla === "ArrowDown" ? 1 : -1) + USUARIOS.length) % USUARIOS.length);
      else if (tecla === "ArrowUp" && !selecionado) setAtivo(USUARIOS.length - 1);
    } else if (tecla === "Enter" || tecla === " ") {
      event.preventDefault();
      if (expandido) selecionar(ativo); else abrir();
    } else if (tecla === "Escape") {
      event.preventDefault(); setAberto(false);
    } else if (tecla === "Tab") setAberto(false);
    else if (tecla.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const opcoes = USUARIOS.map((_, i) => (ativo + 1 + i) % USUARIOS.length);
      const proximo = opcoes.find(index => USUARIOS[index].nome.toLowerCase().startsWith(tecla.toLowerCase()));
      if (proximo !== undefined) { event.preventDefault(); setAberto(true); setAtivo(proximo); }
    }
  }
  return <div ref={container} className="relative" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setAberto(false);
  }}>
    <label id={`${id}-label`} htmlFor={`${id}-botao`} className="text-sm font-medium text-slate-700">Usuário</label>
    <input type="hidden" name="username" value={valor} />
    <button ref={botao} id={`${id}-botao`} type="button" role="combobox" aria-labelledby={`${id}-label`} aria-haspopup="listbox" aria-expanded={expandido} aria-controls={`${id}-opcoes`} aria-activedescendant={expandido ? `${id}-opcao-${ativo}` : undefined} aria-invalid={invalido || undefined} aria-required="true" disabled={desabilitado} onKeyDown={teclado} onClick={() => expandido ? setAberto(false) : abrir()}
      className={`mt-1 flex min-h-14 w-full items-center gap-3 rounded-xl border bg-white p-3 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 disabled:opacity-60 ${invalido ? "border-red-400" : expandido ? "border-amber-400" : "border-slate-300 hover:border-slate-400 focus-visible:border-amber-400"}`}>
      <span aria-hidden="true" className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg font-semibold ${selecionado ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"}`}>
        {selecionado ? selecionado.nome[0] : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5"><circle cx="12" cy="8" r="3.5" /><path d="M5 21v-2a7 7 0 0 1 14 0v2" /></svg>}
      </span>
      <span className={`min-w-0 flex-1 truncate ${selecionado ? "font-semibold text-slate-900" : "text-slate-500"}`}>{selecionado?.nome ?? "Selecione seu nome"}</span>
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${expandido ? "rotate-180" : ""}`}><path d="m6 9 6 6 6-6" /></svg>
    </button>
    {expandido && <ul id={`${id}-opcoes`} role="listbox" aria-labelledby={`${id}-label`} className="absolute inset-x-0 top-full z-20 mt-2 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10">
      {USUARIOS.map((usuario, index) => <li key={usuario.id} id={`${id}-opcao-${index}`} role="option" aria-selected={valor === usuario.id} onMouseEnter={() => setAtivo(index)} onMouseDown={event => event.preventDefault()} onClick={() => selecionar(index)}
        className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm ${valor === usuario.id ? "bg-amber-50 font-semibold text-slate-900" : ativo === index ? "bg-slate-100 text-slate-900" : "text-slate-700"} ${ativo === index ? "outline outline-1 -outline-offset-1 outline-amber-300" : ""}`}>
        <span aria-hidden="true" className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg font-semibold ${valor === usuario.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}>{usuario.nome[0]}</span>
        <span className="flex-1">{usuario.nome}</span>
        {valor === usuario.id && <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-amber-600"><path d="m5 12 4 4L19 6" /></svg>}
      </li>)}
    </ul>}
  </div>;
}
