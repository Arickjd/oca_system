import type { Pedido, Config } from "./types";

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatBRL(valor: number): string {
  return BRL.format(Number.isFinite(valor) ? valor : 0);
}

export function formatData(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(d);
}

// Monta a mensagem de texto do pedido para envio via WhatsApp.
export function montarMensagemWhatsApp(pedido: Pedido, config: Config): string {
  const linhas: string[] = [];
  linhas.push(`*${config.distribuidora_nome}* - Pedido #${pedido.numero}`);
  linhas.push("");
  if (pedido.cliente_nome) linhas.push(`Cliente: ${pedido.cliente_nome}`);
  if (pedido.telefone) linhas.push(`Telefone: ${pedido.telefone}`);
  linhas.push("");
  linhas.push("*Itens:*");
  for (const it of pedido.itens) {
    const modo =
      it.modo === "pacote"
        ? ` (atacado${
            it.pack_quantidade ? `, ${it.pack_quantidade} itens/pacote` : ""
          })`
        : " (unidade — pedido antigo)";
    linhas.push(
      `• ${it.quantidade}x ${it.produto_nome}${modo} — ${formatBRL(
        it.preco_unitario
      )} = ${formatBRL(it.subtotal)}`
    );
  }
  linhas.push("");
  linhas.push(`*Total: ${formatBRL(pedido.valor_total)}*`);
  if (pedido.observacao) {
    linhas.push("");
    linhas.push(`Obs.: ${pedido.observacao}`);
  }
  return linhas.join("\n");
}

export function linkWhatsApp(numero: string, texto: string): string {
  const num = (numero || "").replace(/\D/g, "");
  return `https://wa.me/${num}?text=${encodeURIComponent(texto)}`;
}
