"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function ReciboAcoes({
  whatsappUrl,
  shareTitle,
  shareText,
}: {
  whatsappUrl: string;
  shareTitle: string;
  shareText: string;
}) {
  const [podeShare, setPodeShare] = useState(false);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    setPodeShare(
      typeof navigator !== "undefined" && typeof navigator.share === "function"
    );
  }, []);

  async function compartilhar() {
    try {
      await navigator.share({
        title: shareTitle,
        text: shareText,
        url: window.location.href,
      });
    } catch {
      /* usuário cancelou */
    }
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* ignore */
    }
  }

  const btn =
    "flex-1 min-w-[130px] inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold active:scale-95 transition";

  return (
    <div className="no-print flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => window.print()}
        className={`${btn} bg-slate-900 text-white`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="w-4 h-4"
        >
          <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z" />
        </svg>
        Imprimir / PDF
      </button>

      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`${btn} bg-emerald-600 text-white`}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 0 1 8.413 3.488 11.82 11.82 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l-.999 3.648 3.477-.607zm5.446-6.199c-.075-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.767.967-.94 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
        </svg>
        WhatsApp
      </a>

      {podeShare ? (
        <button
          type="button"
          onClick={compartilhar}
          className={`${btn} bg-white border border-slate-200 text-slate-700`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="w-4 h-4"
          >
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98" />
          </svg>
          Compartilhar
        </button>
      ) : (
        <button
          type="button"
          onClick={copiar}
          className={`${btn} bg-white border border-slate-200 text-slate-700`}
        >
          {copiado ? "Link copiado!" : "Copiar link"}
        </button>
      )}

      <Link
        href="/"
        className={`${btn} bg-white border border-slate-200 text-slate-700`}
      >
        Novo pedido
      </Link>
    </div>
  );
}
