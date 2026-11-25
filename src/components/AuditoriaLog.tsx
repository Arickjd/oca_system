import { Fragment } from "react";
import type { EventoAuditoria } from "@/lib/auditoria";
import { formatData } from "@/lib/format";

// Visível apenas para o admin (a home só renderiza para quem tem papel admin).
export function AuditoriaLog({ eventos }: { eventos: EventoAuditoria[] }) {
  return <section className="w-full rounded-2xl border border-slate-200 bg-white text-left shadow-sm">
    <header className="border-b border-slate-100 px-4 py-3">
      <h2 className="font-semibold text-slate-900">Registro de atividades</h2>
      <p className="text-xs text-slate-500">Ações dos usuários, mais recentes primeiro.</p>
    </header>

    {eventos.length ? <ol className="divide-y divide-slate-100">
      {eventos.map(evento => <li key={evento.id}>
        <details className="group">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-4 py-2.5 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-slate-900">{evento.titulo} - {evento.alvo}</span>
              <span className="mt-0.5 block text-[11px] text-slate-500">
                {formatData(evento.em)} · {evento.usuario.nome}{evento.resumo ? ` · ${evento.resumo}` : ""}
              </span>
            </span>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className="mt-0.5 size-4 shrink-0 text-slate-400 transition group-open:rotate-180">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </summary>
          <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-3">
            <dl className="grid grid-cols-[minmax(0,auto)_1fr] gap-x-3 gap-y-1 text-xs">
              {evento.detalhes.map((detalhe, indice) => <Fragment key={indice}>
                <dt className="text-slate-500">{detalhe.rotulo}</dt>
                <dd className="break-words text-slate-800">{detalhe.valor}</dd>
              </Fragment>)}
            </dl>
            <p className="mt-2 text-[11px] text-slate-400">{formatData(evento.em)} · usuário {evento.usuario.nome}</p>
          </div>
        </details>
      </li>)}
    </ol> : <p className="px-4 py-6 text-sm text-slate-500">Nenhuma ação registrada ainda.</p>}
  </section>;
}
