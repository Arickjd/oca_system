import Link from "next/link";
import { formatBRL } from "@/lib/format";
import { diaLocal, dataCurta, type Periodo } from "@/lib/periodoOrcamentos";
import { resumoLucroVendas } from "@/lib/historicoOrcamentos";
import { vendasPorUsuario } from "@/lib/vendasPorUsuario";

export function EstatisticasVendedores({ grupos, periodo, selecionado }: {
  grupos: ReturnType<typeof vendasPorUsuario>;
  periodo: Periodo;
  selecionado?: string;
}) {
  const selecionados = selecionado === undefined ? grupos : grupos.filter(grupo => grupo.id === selecionado);
  const vendas = selecionados.flatMap(grupo => grupo.vendas);
  const total = vendas.reduce((soma, venda) => soma + Math.round(venda.valor_total * 100), 0) / 100;
  const lucro = resumoLucroVendas(vendas);
  const receitaComCusto = lucro.linhas.reduce((soma, linha) => soma + (linha.lucro === null ? 0 : Math.round(linha.venda.valor_total * 100)), 0) / 100;
  const margem = receitaComCusto > 0 && lucro.total !== null ? lucro.total / receitaComCusto * 100 : null;
  const porDia = new Map<string, { total: number; quantidade: number }>();
  for (const venda of vendas) {
    const dia = diaLocal(venda.created_at);
    const valores = porDia.get(dia) ?? { total: 0, quantidade: 0 };
    valores.total += Math.round(venda.valor_total * 100);
    valores.quantidade++;
    porDia.set(dia, valores);
  }
  const dias = [];
  const inicio = new Date(periodo.inicio + "T12:00:00Z");
  for (let dia = inicio; dia.toISOString().slice(0, 10) <= periodo.fim; dia.setUTCDate(dia.getUTCDate() + 1)) {
    const data = dia.toISOString().slice(0, 10);
    const valores = porDia.get(data);
    dias.push({ data, total: (valores?.total ?? 0) / 100, quantidade: valores?.quantidade ?? 0 });
  }
  const pico = dias.reduce((melhor, dia) => dia.total > melhor.total ? dia : melhor, dias[0]);
  const maior = Math.max(1, ...dias.map(dia => dia.total));
  const totalEquipe = grupos.reduce((soma, grupo) => soma + Math.round(grupo.total * 100), 0) / 100;
  const porcentagem = (valor: number) => valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "%";
  const caminho = (id?: string) => {
    const consulta = new URLSearchParams({ comissao: periodo.tipo });
    if (id !== undefined) consulta.set("vendedor", id);
    return "/relatorios/vendas-por-usuario?" + consulta;
  };
  const indicadores = [
    { nome: "Total de vendas", valor: formatBRL(total), nota: vendas.length + " vendas finalizadas" },
    { nome: "Lucro bruto", valor: lucro.total === null ? "Indisponível" : formatBRL(lucro.total), nota: lucro.semCusto ? lucro.semCusto + " vendas com custo incompleto" : "Custos registrados em todas as vendas" },
    { nome: "Ticket médio", valor: vendas.length ? formatBRL(total / vendas.length) : "—", nota: "Valor médio por venda" },
    { nome: "Margem bruta", valor: margem === null ? "—" : porcentagem(margem), nota: lucro.semCusto ? "Somente vendas com custo completo" : "Lucro bruto sobre as vendas" },
  ];
  return <div className="space-y-6">
    <form action="/relatorios/vendas-por-usuario" className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="comissao" value={periodo.tipo} />
      <label className="min-w-0 flex-1 text-sm font-semibold">Usuário
        <select key={selecionado ?? "todos"} name="vendedor" defaultValue={selecionado ?? "todos"} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white p-2.5">
          <option value="todos">Toda a equipe</option>
          {grupos.map(grupo => <option key={grupo.id} value={grupo.id}>{grupo.nome}</option>)}
        </select>
      </label>
      <button className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">Aplicar</button>
    </form>
    <div className="grid grid-cols-2 gap-3">
      {indicadores.map(indicador => <div key={indicador.nome} className="rounded-xl bg-slate-50 p-4">
        <p className="text-xs text-slate-600">{indicador.nome}</p>
        <p className="mt-1 break-words text-xl font-bold text-slate-900">{indicador.valor}{indicador.nome === "Lucro bruto" && lucro.parcial && <span className="block text-xs text-amber-800">Parcial</span>}</p>
        <p className="mt-1 text-xs text-slate-500">{indicador.nota}</p>
      </div>)}
    </div>
    <section className="rounded-xl border border-slate-200 p-4">
      <h3 className="font-bold">Distribuição diária das vendas</h3>
      <p className="mt-1 text-xs text-slate-500">{periodo.tipo === "mes" ? "Do início do mês até hoje, incluindo dias sem vendas." : "Vendas de hoje."} Valores em reais.</p>
      {!vendas.length ? <p className="py-8 text-center text-sm text-slate-500">Nenhuma venda finalizada neste período para esta seleção.</p> : <>
        <svg viewBox="0 0 640 210" role="img" aria-label="Valor de vendas por dia. Consulte os valores na tabela abaixo." className="mt-4 w-full">
          <text x="0" y="12" fontSize="12" fill="#64748b">{formatBRL(maior)}</text>
          <line x1="0" x2="640" y1="32" y2="32" stroke="#e2e8f0" strokeDasharray="4 4" />
          <line x1="0" x2="640" y1="180" y2="180" stroke="#cbd5e1" />
          {dias.map((dia, index) => {
            const passo = 640 / dias.length;
            const largura = Math.min(40, passo * 0.65);
            const altura = dia.total / maior * 140;
            const x = passo * (index + 0.5);
            return <g key={dia.data}>
              <title>{`${dataCurta(dia.data)} · ${formatBRL(dia.total)} · ${dia.quantidade} vendas`}</title>
              <rect x={x - largura / 2} y={180 - Math.max(altura, 2)} width={largura} height={Math.max(altura, 2)} rx="2" fill={dia.total ? "#0f766e" : "#e2e8f0"} />
              {(dias.length <= 10 || index % 5 === 0 || index === dias.length - 1) && <text x={x} y="200" textAnchor="middle" fontSize="12" fill="#64748b">{dia.data.slice(8)}</text>}
            </g>;
          })}
        </svg>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <p><span className="block text-xs text-slate-500">Melhor dia em valor vendido</span><strong>{dataCurta(pico.data)} · {formatBRL(pico.total)}</strong></p>
          <p><span className="block text-xs text-slate-500">Dias com vendas</span><strong>{porDia.size} de {dias.length}</strong></p>
        </div>
        <details className="mt-4 text-sm"><summary className="cursor-pointer font-medium underline">Consultar valores por dia</summary>
          <table className="mt-3 w-full text-left text-xs"><thead><tr><th className="py-2">Dia</th><th>Vendas</th><th className="text-right">Valor</th></tr></thead>
            <tbody>{dias.map(dia => <tr key={dia.data} className="border-t border-slate-100"><td className="py-2">{dataCurta(dia.data)}</td><td>{dia.quantidade}</td><td className="text-right">{formatBRL(dia.total)}</td></tr>)}</tbody>
          </table>
        </details>
      </>}
    </section>
    <section className="rounded-xl border border-slate-200 p-4">
      <h3 className="font-bold">Participação no total da equipe</h3>
      <p className="mt-1 text-xs text-slate-500">Valor vendido por criador do orçamento, no período selecionado.</p>
      <div className="mt-4 space-y-4">
        {[...grupos].sort((a, b) => b.total - a.total).map(grupo => <Link key={grupo.id} href={caminho(grupo.id)} className="block rounded-lg focus-visible:outline-2 focus-visible:outline-teal-700">
          <div className="flex flex-wrap justify-between gap-1 text-sm"><strong>{grupo.nome}</strong><span>{formatBRL(grupo.total)} · {porcentagem(totalEquipe ? grupo.total / totalEquipe * 100 : 0)}</span></div>
          <div className="my-1 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-700" style={{ width: totalEquipe ? grupo.total / totalEquipe * 100 + "%" : "0%" }} /></div>
          <p className="text-xs text-slate-500">{grupo.vendas.length} vendas · Lucro {grupo.lucro.total === null ? "indisponível" : formatBRL(grupo.lucro.total)}{grupo.lucro.parcial && " (parcial)"}</p>
        </Link>)}
      </div>
    </section>
  </div>;
}
