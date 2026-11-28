import Link from "next/link";
import { exigirSessao } from "@/lib/auth-servidor";
import { getAuditoria, getPedidos } from "@/lib/db";
import { formatBRL } from "@/lib/format";
import { filtrarPeriodo, FUSO, resolverPeriodo, resumoPeriodo } from "@/lib/periodoOrcamentos";
import { AuditoriaLog } from "@/components/AuditoriaLog";
import { AvatarUsuario } from "@/components/AvatarUsuario";

const atalhos = [
  { href: "/gerenciar-produtos", titulo: "Gerenciar produtos", descricao: "Consulte e edite o catálogo", icone: "M4 7h16M4 12h16M4 17h10M8 5v4m8 1v4m-8 1v4" },
  { href: "/gerenciar-estoque", titulo: "Gerenciar Estoque", icone: "M3 21V8l9-5 9 5v13M7 21v-9h10v9m-10-5h10M3 21h18" },
];

export default async function HomePage() {
  const { usuario } = await exigirSessao();
  const admin = usuario.papel === "admin";
  const eventos = admin ? await getAuditoria(50) : [];
  const agora = new Date();
  const data = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, weekday: "long", day: "numeric", month: "long" }).format(agora);
  const hoje = resumoPeriodo(filtrarPeriodo(await getPedidos(), resolverPeriodo({}, agora)));
  const movimento = [
    { href: "/orcamentos", titulo: "Orçamentos pendentes", quantidade: hoje.pendentes, valor: hoje.pendente, cor: "border-amber-200 bg-amber-50 text-amber-950 hover:border-amber-400" },
    { href: "/vendas", titulo: "Vendas finalizadas", quantidade: hoje.pagos, valor: hoje.recebido, cor: "border-sky-200 bg-sky-50 text-sky-950 hover:border-sky-400" },
  ];

  return (
    <div className="space-y-6 pb-5 pt-1 sm:space-y-8 sm:pt-4">
      <section aria-labelledby="painel-home" className="anim-entrada rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4 lg:flex-1">
            <AvatarUsuario usuario={usuario} tom="selecionado" tamanho="lg" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 first-letter:uppercase">{data}</p>
              <h1 id="painel-home" className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Olá, {usuario.nome}</h1>
              <p className="mt-1 text-sm font-medium text-slate-600">Painel de Operações</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 lg:shrink-0 lg:justify-end">
            <Link href="/categorias" className="inline-flex min-h-11 items-center gap-3 rounded-xl bg-amber-300 px-4 py-2.5 text-sm font-bold text-slate-950 shadow-sm transition hover:bg-amber-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-300 sm:px-5">
              Montar pedido <span aria-hidden="true">→</span>
            </Link>
            <button type="button" className="inline-flex min-h-11 items-center gap-3 rounded-xl bg-amber-300 px-4 py-2.5 text-sm font-bold text-slate-950 shadow-sm transition hover:bg-amber-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-300 sm:px-5">
              Venda direta <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </section>

      <section aria-labelledby="movimento-hoje">
        <h2 id="movimento-hoje" className="mb-3 text-lg font-bold text-slate-900">Movimento de hoje</h2>
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          {movimento.map(({ href, titulo, quantidade, valor, cor }) => (
            <Link key={href} href={href} className={`group flex min-w-0 flex-col rounded-2xl border p-3.5 transition focus-visible:outline-2 focus-visible:outline-offset-2 sm:p-5 ${cor}`}>
              <div className="flex min-h-8 items-start justify-between gap-1 text-xs font-semibold sm:min-h-0 sm:text-sm">
                <span>{titulo}</span>
                <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">→</span>
              </div>
              <strong className="mt-2 text-2xl leading-none tabular-nums sm:text-3xl">{quantidade}</strong>
              <span className="mt-1.5 text-xs font-medium tabular-nums sm:text-sm">{formatBRL(valor)}</span>
            </Link>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-600">Pela data de criação do orçamento, no horário de Brasília.</p>
      </section>

      <section aria-labelledby="atalhos-home">
        <h2 id="atalhos-home" className="mb-3 text-lg font-bold text-slate-900">Atalhos de gestão</h2>
        <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
          {atalhos.map(({ href, titulo, descricao, icone }) => (
            <Link key={href} href={href} className="group flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 transition hover:border-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 sm:p-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700 group-hover:bg-amber-100">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="size-5"><path d={icone} /></svg>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-slate-900">{titulo}</span>
                {descricao && <span className="mt-0.5 block text-xs text-slate-600">{descricao}</span>}
              </span>
              <span aria-hidden="true" className="text-slate-500 transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
          ))}
          <Link href="/clientes" className="group flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 transition hover:border-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 sm:p-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700 group-hover:bg-amber-100">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="size-5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-slate-900">Clientes</span>
              <span className="mt-0.5 block text-xs text-slate-600">Consultar, cadastrar e ver histórico</span>
            </span>
            <span aria-hidden="true" className="text-slate-500 transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
          {/* Espaço reservado para a próxima feature de gestão. */}
          <div aria-hidden="true" className="min-h-[4.375rem] rounded-2xl border border-dashed border-slate-200 bg-white/60 sm:min-h-[4.625rem]" />
        </div>
      </section>

      {admin && (
        <section aria-label="Registro de atividades">
          <AuditoriaLog eventos={eventos} />
        </section>
      )}
    </div>
  );
}
