import { STATUS_LABEL, type PedidoStatus } from "@/lib/types";

const cores: Record<PedidoStatus, string> = {
  novo: "bg-blue-100 text-blue-700",
  em_separacao: "bg-amber-100 text-amber-700",
  concluido: "bg-emerald-100 text-emerald-700",
  cancelado: "bg-red-100 text-red-600",
};

export function StatusBadge({ status }: { status: PedidoStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${cores[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
