import Link from "next/link";
import { exigirSessao } from "@/lib/auth-servidor";
import { getPedidos } from "@/lib/db";
import { formatBRL } from "@/lib/format";
import { filtrarPeriodo, FUSO, resolverPeriodo, resumoPeriodo } from "@/lib/periodoOrcamentos";

const atalhos = [
  { href: "/gerenciar-produtos", titulo: "Gerenciar produtos", descricao: "Consulte e edite o catálogo", icone: "M4 7h16M4 12h16M4 17h10M8 5v4m8 1v4m-8 1v4" },
  { href: "/gerenciar-estoque", titulo: "Gerenciar Estoque", descricao: "Em desenvolvimento", icone: "M3 21V8l9-5 9 5v13M7 21v-9h10v9m-10-5h10M3 21h18" },
];

export default async function HomePage() {
  const { usuario } = await exigirSessao();
  const agora = new Date();
  const data = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, weekday: "long", day: "numeric", month: "long" }).format(agora);
  const hoje = resumoPeriodo(filtrarPeriodo(await getPedidos(), resolverPeriodo({}, agora)));
  const movimento = [
    { href: "/orcamentos", titulo: "Orçamentos pendentes", quantidade: hoje.pendentes, valor: hoje.pendente, cor: "border-amber-200 bg-amber-50 text-amber-950 hover:border-amber-400" },
    { href: "/vendas", titulo: "Vendas finalizadas", quantidade: hoje.pagos, valor: hoje.recebido, cor: "border-sky-200 bg-sky-50 text-sky-950 hover:border-sky-400" },
  ];

  return (
    <div className="space-y-6 pb-5 pt-1 sm:space-y-8 sm:pt-4">
      <section className="relative isolate overflow-hidden rounded-[1.75rem] bg-slate-950 bg-[radial-gradient(ellipse_at_top_right,_#374151,_transparent_65%)] px-5 py-6 text-white shadow-sm sm:px-8 sm:py-8">
        <svg aria-hidden="true" viewBox="0 0 260 200" fill="none" className="pointer-events-none absolute -right-10 -top-4 -z-10 w-48 opacity-60 sm:-right-2 sm:-top-3 sm:w-72 sm:opacity-100">
          <circle cx="158" cy="102" r="87" stroke="#fbbf24" strokeOpacity=".24" />
          <circle cx="158" cy="102" r="66" stroke="#fbbf24" strokeOpacity=".15" />
          <path d="m97 105 57-25 60 25-59 25z" fill="#fcd34d" />
          <path d="m97 105 58 25v54l-58-26z" fill="#d97706" />
          <path d="m155 130 59-25v53l-59 26z" fill="#b45309" />
          <path d="m120 94 59 26v17l14-6v-17l-59-26z" fill="#fff2bf" fillOpacity=".85" />
          <path d="m119 66 37-16 39 16-38 17z" fill="#fef3c7" />
          <path d="m119 66 38 17v36l-38-17z" fill="#fbbf24" />
          <path d="m157 83 38-17v36l-38 17z" fill="#f59e0b" />
          <path d="m134 60 38 17v13l10-4V73l-38-17z" fill="#fff8dc" />
          <path d="M215 53v16m-8-8h16M91 73v10m-5-5h10" stroke="#fde68a" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <p className="text-xs font-semibold text-amber-200 first-letter:uppercase sm:text-sm">{data}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Olá, {usuario.nome}!</h1>
        <Link href="/categorias" className="mt-7 inline-flex min-h-11 items-center gap-3 rounded-xl bg-amber-300 px-4 py-2.5 text-sm font-bold text-slate-950 shadow-sm transition hover:bg-amber-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-300 sm:px-5">
          Montar pedido <span aria-hidden="true">→</span>
        </Link>
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
                <span className="mt-0.5 block text-xs text-slate-600">{descricao}</span>
              </span>
              <span aria-hidden="true" className="text-slate-500 transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
