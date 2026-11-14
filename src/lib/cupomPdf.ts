import { jsPDF } from "jspdf";
import type { Config, Pedido } from "./types";
import { formatBRL, formatData } from "./format";
import { chavePix, titularPix } from "./pix";
import { descontoTotalPedido } from "./descontos";

const LARGURA = 72;
const MARGEM = 2;
const CONTEUDO = LARGURA - MARGEM * 2;
const FONTE = "courier";
const nomesPagamento = { pix: "Pix", cartao: "Cartão", dinheiro: "Dinheiro" } as const;

// Cupom em bobina de 80 mm, com altura calculada pelo conteúdo.
function desenhar(doc: jsPDF, pedido: Pedido, config: Config, logo: Uint8Array | null, qrCode: Uint8Array | null) {
  let y = 6;
  const alturaLinha = (tamanho: number) => tamanho * 0.38 + 0.9;

  const paragrafo = (valor: string, tamanho = 8, estilo: "normal" | "bold" = "normal", alinhamento: "left" | "center" | "right" = "left", extra = 0) => {
    doc.setFont(FONTE, estilo).setFontSize(tamanho).setTextColor(15, 23, 42);
    const linhas: string[] = doc.splitTextToSize(valor, CONTEUDO);
    for (const linha of linhas) {
      const x = alinhamento === "center" ? LARGURA / 2 : alinhamento === "right" ? LARGURA - MARGEM : MARGEM;
      doc.text(linha, x, y, { align: alinhamento });
      y += alturaLinha(tamanho);
    }
    y += extra;
  };

  const separador = (extra = 2) => {
    doc.setDrawColor(120, 120, 120).setLineWidth(0.2).setLineDashPattern([1, 1], 0);
    doc.line(MARGEM, y, LARGURA - MARGEM, y);
    doc.setLineDashPattern([], 0);
    y += extra + 1.2;
  };

  if (logo) {
    try {
      const imagem = doc.getImageProperties(logo);
      const larguraLogo = Math.min(36, 20 * imagem.width / imagem.height);
      const alturaLogo = larguraLogo * imagem.height / imagem.width;
      doc.addImage(logo, "PNG", (LARGURA - larguraLogo) / 2, y, larguraLogo, alturaLogo);
      y += alturaLogo + 2;
    } catch { /* segue sem logo */ }
  } else {
    paragrafo(config.distribuidora_nome, 9, "bold", "center");
    if (config.distribuidora_contato) paragrafo(config.distribuidora_contato, 7, "normal", "center");
  }
  if (config.endereco) paragrafo(config.endereco, 7, "normal", "center");
  y += 1;
  paragrafo(pedido.status_pagamento === "finalizado" ? "RECIBO DE VENDA" : "ORÇAMENTO", 9, "bold", "center");
  paragrafo(`Nº ${String(pedido.numero).padStart(4, "0")}`, 8, "normal", "center");
  paragrafo(formatData(pedido.created_at), 7, "normal", "center", 1.5);
  separador();

  if (pedido.cliente_nome) paragrafo(`Cliente: ${pedido.cliente_nome}`, 7.5);
  if (pedido.telefone) paragrafo(`Telefone: ${pedido.telefone}`, 7.5);
  if (pedido.criado_por) paragrafo(`Responsável: ${pedido.criado_por.nome}`, 7.5);
  y += 1;
  paragrafo("ITENS", 7, "bold");
  y += 0.5;

  for (const item of pedido.itens) {
    paragrafo(item.produto_nome, 8, "bold");
    if ((item.desconto_unitario ?? 0) > 0) paragrafo("Desconto aplicado", 6.5);
    doc.setFont("helvetica", "normal").setFontSize(7.5).setTextColor(15, 23, 42);
    doc.text(`${item.quantidade} ${item.modo === "pacote" ? "pct" : "un"} × ${formatBRL(item.preco_unitario)}`, MARGEM, y);
    doc.setFont("helvetica", "bold");
    doc.text(formatBRL(item.subtotal), LARGURA - MARGEM, y, { align: "right" });
    y += alturaLinha(8) + 1;
  }

  separador(1.5);
  const desconto = descontoTotalPedido(pedido);
  if (desconto > 0) {
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(15, 23, 42);
    doc.text("Desconto:", MARGEM, y);
    doc.text(`-${formatBRL(desconto)}`, LARGURA - MARGEM, y, { align: "right" });
    y += 4.6;
  }
  doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(15, 23, 42);
  doc.text("TOTAL", MARGEM, y);
  doc.text(formatBRL(pedido.valor_total), LARGURA - MARGEM, y, { align: "right" });
  y += 6;

  paragrafo(pedido.status_pagamento === "finalizado" ? "Pagamento finalizado" : "Pagamento pendente", 7.5, "bold");
  if (pedido.status_pagamento === "finalizado") {
    if (pedido.forma_pagamento) paragrafo(`Forma de pagamento: ${nomesPagamento[pedido.forma_pagamento]}`, 7);
    if (pedido.pago_em) paragrafo(`Pago em: ${formatData(pedido.pago_em)}`, 7);
  }
  if (pedido.observacao) { y += 1.5; paragrafo("OBSERVAÇÃO", 7, "bold"); paragrafo(pedido.observacao, 7); }

  if (pedido.status_pagamento !== "finalizado") {
    y += 2; separador(1.5);
    paragrafo("Pague com Pix", 8, "bold");
    if (qrCode) {
      try {
        doc.addImage(qrCode, "PNG", (LARGURA - 24) / 2, y, 24, 24);
        y += 26;
      } catch { /* segue sem QR */ }
    }
    paragrafo(`Chave Pix: ${chavePix}`, 7.5, "bold");
    paragrafo(titularPix, 7);
  }

  y += 2;
  paragrafo("Obrigado pela preferência!", 7.5, "normal", "center");
  paragrafo("Documento não fiscal", 6.5, "normal", "center");
  return y;
}

export function gerarCupomPdf(pedido: Pedido, config: Config, logo: Uint8Array | null, qrCode: Uint8Array | null) {
  // Primeira passagem só para medir a altura; a segunda gera o arquivo final.
  const medidor = new jsPDF({ unit: "mm", format: [LARGURA, 1000] });
  const fim = desenhar(medidor, pedido, config, logo, qrCode);
  const altura = Math.max(80, Math.ceil(fim + 2));
  const doc = new jsPDF({ unit: "mm", format: [LARGURA, altura], compress: true });
  desenhar(doc, pedido, config, logo, qrCode);
  return new Uint8Array(doc.output("arraybuffer"));
}
