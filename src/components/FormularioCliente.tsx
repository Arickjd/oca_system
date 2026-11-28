"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { Cliente } from "@/lib/types";

const campo = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-amber-500";

export function FormularioCliente({ cliente }: { cliente?: Cliente }) {
  const router = useRouter();
  const editando = Boolean(cliente);
  const [nome, setNome] = useState(cliente?.nome ?? "");
  const [telefone, setTelefone] = useState(cliente?.telefone ?? "");
  const [documento, setDocumento] = useState(cliente?.documento ?? "");
  const [observacao, setObservacao] = useState(cliente?.observacao ?? "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function salvar(event: FormEvent) {
    event.preventDefault();
    setSalvando(true); setErro("");
    try {
      const res = await fetch(editando ? `/api/clientes/${encodeURIComponent(cliente!.id)}` : "/api/clientes", {
        method: editando ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, telefone, documento, observacao }),
      });
      const dados = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(dados.error || "Não foi possível salvar o cliente.");
      router.push(`/clientes/${dados.id}`);
      router.refresh();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Falha ao salvar o cliente.");
      setSalvando(false);
    }
  }

  return <form onSubmit={salvar} className="flex flex-col gap-4">
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">Nome
          <input autoFocus required maxLength={120} value={nome} onChange={event => setNome(event.target.value)} placeholder="Nome do cliente" className={campo} />
        </label>
        <label className="text-sm font-medium text-slate-700">Telefone
          <input type="tel" maxLength={30} value={telefone} onChange={event => setTelefone(event.target.value)} placeholder="(00) 00000-0000" className={campo} />
        </label>
        <label className="text-sm font-medium text-slate-700">CPF/CNPJ
          <input maxLength={20} value={documento} onChange={event => setDocumento(event.target.value)} placeholder="Opcional" className={campo} />
        </label>
      </div>
      <label className="mt-4 block text-sm font-medium text-slate-700">Observação
        <textarea rows={3} maxLength={500} value={observacao} onChange={event => setObservacao(event.target.value)} placeholder="Preferências, endereço, horário de entrega…" className={`${campo} resize-none`} />
      </label>
    </section>
    {erro && <p role="alert" className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
    <div className="flex flex-wrap items-center gap-2">
      <button type="submit" disabled={salvando} className="inline-flex min-h-11 items-center rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60">
        {salvando ? "Salvando…" : editando ? "Salvar alterações" : "Cadastrar cliente"}
      </button>
      <Link href={editando ? `/clientes/${cliente!.id}` : "/clientes"} className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancelar</Link>
    </div>
  </form>;
}
