import type { Usuario } from "@/lib/usuarios";

// Avatar do usuário: inicial do nome ou ícone de computador para a conta "Computador".
export function AvatarUsuario({ usuario, ativo = false, tom = "lista", tamanho = "sm" }: {
  usuario: Usuario;
  ativo?: boolean;
  tom?: "lista" | "selecionado";
  tamanho?: "sm" | "lg";
}) {
  const caixa = tamanho === "lg" ? "h-12 w-12 rounded-xl text-xl" : "h-8 w-8 rounded-lg";
  const icone = tamanho === "lg" ? "h-7 w-7" : "h-5 w-5";
  const cor = ativo ? "bg-slate-900 text-white" : tom === "selecionado" ? "bg-slate-100 text-slate-500" : "bg-slate-100 text-slate-600";
  return <span aria-hidden="true" className={`grid shrink-0 place-items-center font-semibold ${caixa} ${cor}`}>
    {usuario.id === "computador"
      ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={icone}><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></svg>
      : usuario.nome[0]}
  </span>;
}
