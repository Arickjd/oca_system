"use client";
import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Categoria } from "@/lib/types";
import type { MovimentoEstoque, SaldoEstoque } from "@/lib/estoque";
import { ROTULOS_MOVIMENTO } from "@/lib/estoque";
import { produtoCombina } from "@/lib/busca";
import { formatData } from "@/lib/format";

const campo = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5";

const BADGE: Record<SaldoEstoque["situacao"], { texto: string; classe: string }> = {
  negativo: { texto: "Negativo", classe: "bg-red-100 text-red-800" },
  zerado: { texto: "Zerado", classe: "bg-red-50 text-red-700" },
  baixo: { texto: "Baixo", classe: "bg-amber-100 text-amber-800" },
  ok: { texto: "", classe: "" },
  "nao-controlado": { texto: "Sem controle", classe: "bg-slate-100 text-slate-500" },
};

type Filtro = "todos" | "controlados" | "atencao" | "sem-controle";
type TipoForm = "entrada" | "ajuste" | "perda";

function sinal(n: number) { return n > 0 ? `+${n}` : String(n); }

export function GerenciarEstoque({ saldos, categorias, movimentos, admin, produtoFiltrado }: {
  saldos: SaldoEstoque[]; categorias: Categoria[]; movimentos: MovimentoEstoque[]; admin: boolean; produtoFiltrado?: string;
}) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [categoria, setCategoria] = useState<string | null>(null);
  const [abertoId, setAbertoId] = useState<string | null>(null);
  const [tipo, setTipo] = useState<TipoForm>("entrada");
  const [quantidade, setQuantidade] = useState("");
  const [modo, setModo] = useState<"unidade" | "pacote">("pacote");
  const [motivo, setMotivo] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const nomesCategorias = useMemo(() => new Map(categorias.map(c => [c.id, c.nome])), [categorias]);
  const lista = useMemo(() => saldos
    .filter(s => produtoCombina(s.produto, busca))
    .filter(s => categoria === null || s.produto.categoria_id === categoria)
    .filter(s => filtro === "todos"
      || (filtro === "controlados" && s.situacao !== "nao-controlado")
      || (filtro === "atencao" && ["negativo", "zerado", "baixo"].includes(s.situacao))
      || (filtro === "sem-controle" && s.situacao === "nao-controlado"))
    .sort((a, b) => {
      const peso = (s: SaldoEstoque) => s.situacao === "negativo" ? 0 : s.situacao === "zerado" ? 1 : s.situacao === "baixo" ? 2 : s.situacao === "ok" ? 3 : 4;
      return peso(a) - peso(b) || a.produto.nome.localeCompare(b.produto.nome, "pt-BR");
    }), [saldos, busca, filtro, categoria]);

  const atencao = saldos.filter(s => ["negativo", "zerado", "baixo"].includes(s.situacao)).length;
  const controlados = saldos.filter(s => s.situacao !== "nao-controlado").length;
  const aberto = saldos.find(s => s.produto.id === abertoId);

  function abrirFormulario(id: string) {
    setAbertoId(atual => atual === id ? null : id);
    setTipo("entrada"); setQuantidade(""); setModo("pacote"); setMotivo(""); setErro(""); setSucesso("");
  }

  async function registrar(e: FormEvent) {
    e.preventDefault();
    if (!aberto) return;
    setSalvando(true); setErro("");
    try {
      const res = await fetch("/api/estoque", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ produto_id: aberto.produto.id, tipo, quantidade: Number(quantidade), modo: tipo === "ajuste" ? "unidade" : modo, motivo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não foi possível registrar a movimentação.");
      setSucesso(`${ROTULOS_MOVIMENTO[tipo as keyof typeof ROTULOS_MOVIMENTO]} registrada: saldo de ${data.movimento.saldo_apos} unidade(s) em ${aberto.produto.nome}.`);
      setAbertoId(null); setQuantidade(""); setMotivo("");
      router.refresh();
    } catch (error) { setErro(error instanceof Error ? error.message : "Falha ao registrar."); }
    finally { setSalvando(false); }
  }

  return <section className="flex flex-col gap-4">
    <Link href="/home" className="text-sm underline">Página inicial</Link>
    <h1 className="text-xl font-bold">Gerenciar estoque</h1>
    <p className="text-sm text-slate-500">
      {controlados} de {saldos.length} produto(s) com controle de estoque
      {atencao > 0 && <> · <span className="font-semibold text-amber-700">{atencao} precisando de atenção</span></>}.
      A venda efetivada baixa o estoque automaticamente; entradas, ajustes e perdas são registrados aqui{admin ? "" : " pelo administrador"}.
    </p>
    {sucesso && <p role="status" className="text-sm text-green-700">{sucesso}</p>}
    <label>Buscar produto<input type="search" className={campo} value={busca} onChange={e => setBusca(e.target.value)} /></label>
    <div className="flex flex-wrap gap-2">
      {([["todos", "Todos"], ["atencao", `Atenção${atencao ? ` (${atencao})` : ""}`], ["controlados", "Controlados"], ["sem-controle", "Sem controle"]] as [Filtro, string][]).map(([valor, rotulo]) =>
        <button key={valor} type="button" aria-pressed={filtro === valor} onClick={() => setFiltro(valor)}
          className={`rounded-full border px-3 py-2 text-sm ${filtro === valor ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-slate-900"}`}>
          {rotulo}
        </button>)}
    </div>
    <div className="flex flex-wrap gap-2">
      {[{ id: null, nome: "Todas categorias" }, ...categorias].map(c =>
        <button key={c.id ?? "todas"} type="button" aria-pressed={categoria === c.id} onClick={() => setCategoria(c.id)}
          className={`rounded-full border px-3 py-1.5 text-xs ${categoria === c.id ? "border-amber-500 bg-amber-50 text-amber-900" : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"}`}>
          {c.nome}
        </button>)}
    </div>
    <p role="status" className="text-sm text-slate-500">{lista.length} de {saldos.length} produto(s)</p>
    {!lista.length && <p>Nenhum produto encontrado.</p>}
    <ul className="flex flex-col gap-2">
      {lista.map(s => {
        const badge = BADGE[s.situacao];
        return <li key={s.produto.id} className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold break-words">{s.produto.nome}</p>
              <p className="text-xs text-slate-500">{nomesCategorias.get(s.produto.categoria_id) ?? "Outros"} · {s.produto.pack_quantidade} un/pacote</p>
            </div>
            <div className="shrink-0 text-right">
              {s.saldo === null
                ? <p className="text-lg font-bold text-slate-400">---</p>
                : <>
                  <p className={`text-lg font-bold tabular-nums ${s.saldo < 0 ? "text-red-700" : s.saldo === 0 ? "text-red-600" : "text-slate-900"}`}>{s.saldo} un</p>
                  {s.pacotes !== null && <p className="text-xs text-slate-500 tabular-nums">≈ {s.pacotes} pacote(s)</p>}
                </>}
              {badge.texto && <span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.classe}`}>{badge.texto}</span>}
            </div>
          </div>
          {admin && <div className="mt-2 flex items-center gap-3 text-sm">
            <button type="button" onClick={() => abrirFormulario(s.produto.id)} aria-expanded={abertoId === s.produto.id}
              className="underline text-slate-700">{abertoId === s.produto.id ? "Fechar" : "Movimentar"}</button>
            <Link href={`/gerenciar-estoque?produto=${s.produto.id}#historico`} className="underline text-slate-500">Histórico</Link>
          </div>}
          {admin && abertoId === s.produto.id && aberto && <form onSubmit={registrar} className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3">
            <div className="grid grid-cols-3 gap-2">
              {([["entrada", "Entrada"], ["ajuste", "Ajuste"], ["perda", "Perda"]] as [TipoForm, string][]).map(([valor, rotulo]) =>
                <button key={valor} type="button" aria-pressed={tipo === valor} onClick={() => { setTipo(valor); setErro(""); }}
                  className={`min-h-10 rounded-lg border px-2 py-2 text-xs font-semibold ${tipo === valor ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-700"}`}>
                  {rotulo}
                </button>)}
            </div>
            {tipo === "ajuste"
              ? <label className="text-sm">Saldo contado (unidades)<input required type="number" min="0" step="1" inputMode="numeric" className={campo} value={quantidade} onChange={e => setQuantidade(e.target.value)} /></label>
              : <>
                <label className="text-sm">Quantidade<input required type="number" min="1" step="1" inputMode="numeric" className={campo} value={quantidade} onChange={e => setQuantidade(e.target.value)} /></label>
                <div className="grid grid-cols-2 gap-2">
                  {([["pacote", `Pacotes (${s.produto.pack_quantidade} un)`], ["unidade", "Unidades"]] as ["unidade" | "pacote", string][]).map(([valor, rotulo]) =>
                    <button key={valor} type="button" aria-pressed={modo === valor} onClick={() => setModo(valor)}
                      className={`min-h-10 rounded-lg border px-2 py-2 text-xs ${modo === valor ? "border-amber-500 bg-amber-50 text-amber-900 font-semibold" : "border-slate-300 bg-white text-slate-600"}`}>
                      {rotulo}
                    </button>)}
                </div>
              </>}
            <label className="text-sm">Motivo{tipo === "ajuste" ? " (obrigatório)" : " (opcional)"}
              <input maxLength={200} className={campo} placeholder={tipo === "entrada" ? "Ex.: compra do fornecedor X" : tipo === "ajuste" ? "Ex.: contagem de inventário" : "Ex.: garrafas quebradas"} value={motivo} onChange={e => setMotivo(e.target.value)} />
            </label>
            {tipo === "ajuste" && <p className="text-xs text-slate-500">O ajuste define o saldo exato do produto; a diferença entra no histórico.</p>}
            {erro && <p role="alert" className="text-sm text-red-600">{erro}</p>}
            <button disabled={salvando} className="rounded-xl bg-slate-900 p-3 text-sm font-semibold text-white disabled:opacity-50">{salvando ? "Registrando…" : "Registrar movimentação"}</button>
          </form>}
        </li>;
      })}
    </ul>
    <section id="historico" className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-bold">{produtoFiltrado ? `Movimentações — ${produtoFiltrado}` : "Últimas movimentações"}</h2>
          <p className="mt-0.5 text-xs text-slate-500">Vendas efetivadas, entradas, ajustes, perdas e estornos — mais recentes primeiro.</p>
        </div>
        {produtoFiltrado && <Link href="/gerenciar-estoque#historico" className="shrink-0 text-sm underline text-slate-600">Ver todas</Link>}
      </div>
      {!movimentos.length && <p className="mt-3 text-sm text-slate-500">Nenhuma movimentação registrada ainda.</p>}
      <ul className="mt-2 divide-y divide-slate-100">
        {movimentos.map(m => <li key={m.id} className="py-2.5">
          <details>
            <summary className="cursor-pointer list-none">
              <span className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="block text-sm font-semibold break-words">{ROTULOS_MOVIMENTO[m.tipo]} - {m.produto_nome}</span>
                  <span className="block text-xs text-slate-500">{formatData(m.em)}{m.registrado_por ? ` · ${m.registrado_por.nome}` : ""}{m.pedido_numero ? ` · Venda #${m.pedido_numero}` : ""}</span>
                </span>
                <span className={`shrink-0 text-sm font-bold tabular-nums ${m.quantidade < 0 ? "text-red-700" : "text-green-700"}`}>{sinal(m.quantidade)} un</span>
              </span>
            </summary>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-lg bg-slate-50 p-3 text-xs">
              <dt className="font-semibold text-slate-600">Saldo após</dt><dd className="tabular-nums">{m.saldo_apos} unidade(s)</dd>
              {m.motivo && <><dt className="font-semibold text-slate-600">Motivo</dt><dd>{m.motivo}</dd></>}
              {m.pedido_numero !== undefined && <><dt className="font-semibold text-slate-600">Venda</dt><dd>#{m.pedido_numero}</dd></>}
              {m.registrado_por && <><dt className="font-semibold text-slate-600">Registrado por</dt><dd>{m.registrado_por.nome}</dd></>}
            </dl>
          </details>
        </li>)}
      </ul>
    </section>
  </section>;
}
