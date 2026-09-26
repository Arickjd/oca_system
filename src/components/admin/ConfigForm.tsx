"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Config } from "@/lib/types";

const inputCls =
  "w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 bg-white";

export function ConfigForm({ config }: { config: Config }) {
  const router = useRouter();
  const [f, setF] = useState<Config>(config);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setSalvo(false);
    await fetch("/api/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...f, pack_padrao: Number(f.pack_padrao) || 6 }),
    });
    setSalvando(false);
    setSalvo(true);
    router.refresh();
    setTimeout(() => setSalvo(false), 2500);
  }

  return (
    <form onSubmit={salvar} className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-slate-900">Configurações</h1>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-3">
        <p className="text-sm text-slate-500">
          Dados usados no cabeçalho/rodapé do orçamento e no envio por WhatsApp.
        </p>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-600">Nome da distribuidora</span>
          <input
            value={f.distribuidora_nome}
            onChange={(e) =>
              setF({ ...f, distribuidora_nome: e.target.value })
            }
            className={inputCls}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-600">Contato (exibição)</span>
          <input
            value={f.distribuidora_contato}
            onChange={(e) =>
              setF({ ...f, distribuidora_contato: e.target.value })
            }
            className={inputCls}
            placeholder="(89) 99427-0756"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-600">
            WhatsApp (somente números, com DDI e DDD)
          </span>
          <input
            value={f.whatsapp}
            onChange={(e) => setF({ ...f, whatsapp: e.target.value })}
            inputMode="numeric"
            className={inputCls}
            placeholder="5589994270756"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-600">Endereço (opcional)</span>
          <input
            value={f.endereco}
            onChange={(e) => setF({ ...f, endereco: e.target.value })}
            className={inputCls}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-600">
            Quantidade padrão do pacote
          </span>
          <input
            value={String(f.pack_padrao)}
            onChange={(e) =>
              setF({ ...f, pack_padrao: Number(e.target.value) || 0 })
            }
            inputMode="numeric"
            className={inputCls}
          />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={salvando}
          className="rounded-xl bg-slate-900 text-white px-6 py-3 font-semibold disabled:opacity-60"
        >
          {salvando ? "Salvando…" : "Salvar"}
        </button>
        {salvo && (
          <span className="text-sm text-emerald-600 font-medium">
            Configurações salvas!
          </span>
        )}
      </div>
    </form>
  );
}
