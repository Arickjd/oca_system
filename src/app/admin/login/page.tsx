"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    setErro(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senha }),
      });
      if (res.ok) {
        router.replace("/admin");
        router.refresh();
      } else {
        setErro("Senha incorreta.");
        setCarregando(false);
      }
    } catch {
      setErro("Erro de conexão.");
      setCarregando(false);
    }
  }

  return (
    <div className="min-h-dvh bg-slate-100 grid place-items-center p-4">
      <form
        onSubmit={entrar}
        className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col gap-4"
      >
        <div className="flex flex-col items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="OCA" className="h-14 w-auto object-contain" />
          <h1 className="font-semibold text-slate-800">Painel administrativo</h1>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-600">Senha</span>
          <input
            type="password"
            value={senha}
            autoFocus
            onChange={(e) => setSenha(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
            placeholder="••••••••"
          />
        </label>

        {erro && <p className="text-sm text-red-600">{erro}</p>}

        <button
          type="submit"
          disabled={carregando}
          className="rounded-xl bg-slate-900 text-white px-5 py-3 font-semibold active:scale-[0.99] transition disabled:opacity-60"
        >
          {carregando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
