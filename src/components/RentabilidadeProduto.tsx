import { formatBRL } from "@/lib/format";

export function RentabilidadeProduto({ venda, custo }: { venda: number; custo?: number | null }) {
  const temCusto = typeof custo === "number" && Number.isFinite(custo) && custo > 0;
  const margem = temCusto && venda > 0 ? (venda - custo) / venda * 100 : null;
  return <div className="flex flex-wrap gap-2 text-xs mt-2">
    <span className="rounded-lg bg-blue-50 px-2 py-1.5 text-blue-800">Valor de compra: <strong>{temCusto ? formatBRL(custo) : "---"}</strong></span>
    <span title="Margem bruta = (venda − compra) ÷ venda × 100. Não inclui outras despesas."
      className={`rounded-lg px-2 py-1.5 ${margem === null ? "bg-slate-100 text-slate-600" : margem < 0 ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"}`}>
      Margem: <strong>{margem === null ? "---" : `${margem.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`}</strong>
    </span>
  </div>;
}
