import { notFound } from "next/navigation";
import { exigirSessao } from "@/lib/auth-servidor";
import { getPedido } from "@/lib/db";
import { getConfig } from "@/lib/config";
import { CupomConteudo } from "@/components/CupomConteudo";
import { CupomAcoes } from "@/components/CupomAcoes";
import styles from "@/components/CupomConteudo.module.css";

export const dynamic = "force-dynamic";

export default async function CupomPage({ params }: { params: Promise<{ id: string }> }) {
  await exigirSessao();
  const { id } = await params;
  const pedido = await getPedido(id);
  if (!pedido) notFound();
  return <div className={styles.pagina}>
    <CupomAcoes pedidoId={pedido.id} finalizado={pedido.status_pagamento === "finalizado"} />
    <CupomConteudo pedido={pedido} config={await getConfig()} />
  </div>;
}
