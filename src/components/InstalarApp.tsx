"use client";

import { useEffect, useState } from "react";

interface InstallEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstalarApp() {
  const [convite, setConvite] = useState<InstallEvent | null>(null);
  const [instalado, setInstalado] = useState(true);
  const [ios, setIos] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [ajuda, setAjuda] = useState(false);

  useEffect(() => {
    const modo = window.matchMedia("(display-mode: standalone)");
    const atualizar = () => setInstalado(modo.matches || !!(navigator as Navigator & { standalone?: boolean }).standalone);
    atualizar();
    setIos(/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
    const receber = (event: Event) => { event.preventDefault(); setConvite(event as InstallEvent); };
    const concluir = () => { setInstalado(true); setConvite(null); };
    window.addEventListener("beforeinstallprompt", receber);
    window.addEventListener("appinstalled", concluir);
    modo.addEventListener("change", atualizar);
    return () => {
      window.removeEventListener("beforeinstallprompt", receber);
      window.removeEventListener("appinstalled", concluir);
      modo.removeEventListener("change", atualizar);
    };
  }, []);

  async function instalar() {
    if (!convite) { setAjuda(true); return; }
    setOcupado(true);
    try {
      await convite.prompt();
      const escolha = await convite.userChoice;
      if (escolha.outcome === "accepted") setInstalado(true);
    } catch { setAjuda(true); }
    finally { setConvite(null); setOcupado(false); }
  }

  if (instalado) return null;
  return <section className="w-full max-w-sm rounded-2xl border border-slate-200 p-4">
    <button type="button" disabled={ocupado} onClick={instalar} className="w-full rounded-xl bg-slate-100 px-4 py-3 font-semibold text-slate-900 disabled:opacity-50">
      {ocupado ? "Abrindo instalação…" : "Instalar Sistema OCA"}
    </button>
    <p className="mt-2 text-xs text-slate-500">Acesse pela tela inicial do celular. Requer internet.</p>
    {(ajuda || ios) && <p role="status" className="mt-3 text-sm text-slate-700">
      {ios ? "No Safari, toque em Compartilhar e depois em Adicionar à Tela de Início."
        : "Abra este site no Chrome e, no menu ⋮, escolha Instalar aplicativo ou Adicionar à tela inicial. Se a opção não aparecer, verifique se o aplicativo já está instalado."}
    </p>}
  </section>;
}
