"use client";
import { useEffect, useState, type FormEvent } from "react";
import { buscarUsuario } from "@/lib/usuarios";
import { SeletorUsuario } from "./SeletorUsuario";

export function LoginForm({ proxima }: { proxima: string }) {
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [manter, setManter] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [usuarioInvalido, setUsuarioInvalido] = useState(false);
  useEffect(() => {
    try { const salvo = localStorage.getItem("oca_ultimo_usuario"); if (buscarUsuario(salvo)) setUsuario(salvo!); } catch {}
  }, []);
  async function entrar(event: FormEvent) {
    event.preventDefault();
    if (!buscarUsuario(usuario)) { setUsuarioInvalido(true); setErro("Selecione seu usuário para entrar."); return; }
    setEnviando(true); setErro("");
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ usuario, senha, manter, proxima }) });
      const dados = await res.json();
      if (!res.ok) throw new Error(dados.error || "Não foi possível entrar.");
      try { localStorage.setItem("oca_ultimo_usuario", usuario); } catch {}
      window.location.assign(dados.destino);
    } catch (error) { setErro(error instanceof Error ? error.message : "Falha de conexão. Tente novamente."); setEnviando(false); }
  }
  return <form onSubmit={entrar} className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-6 text-left shadow-sm">
    <h1 className="text-xl font-bold text-slate-900">Entrar no Sistema OCA</h1>
    <p className="mt-1 text-sm text-slate-500">Selecione seu usuário para começar.</p>
    <fieldset disabled={enviando} className="mt-5 flex flex-col gap-4">
      <SeletorUsuario valor={usuario} onChange={id => { setUsuario(id); setUsuarioInvalido(false); setErro(""); }} desabilitado={enviando} invalido={usuarioInvalido} />
      <label className="text-sm font-medium text-slate-700">Senha
        <input name="password" type="password" autoComplete="current-password" required maxLength={128} value={senha} onChange={e => setSenha(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 p-3" />
      </label>
      <label className="flex min-h-11 items-center gap-3 text-sm text-slate-700"><input type="checkbox" checked={manter} onChange={e => setManter(e.target.checked)} className="h-4 w-4 accent-slate-900" />Manter conectado neste dispositivo</label>
      <p className="-mt-2 text-xs text-slate-500">Ao marcar, sua sessão será mantida por até 30 dias.</p>
      {erro && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{erro}</p>}
      <button className="rounded-xl bg-slate-900 p-3 font-semibold text-white disabled:opacity-50">{enviando ? "Entrando…" : "Iniciar sessão"}</button>
    </fieldset>
  </form>;
}
