import { getPedidos } from "@/lib/db";
import { PedidosManager } from "@/components/admin/PedidosManager";

export const dynamic = "force-dynamic";

export default async function PedidosPage() {
  const pedidos = await getPedidos();
  return <PedidosManager pedidos={pedidos} />;
}
