import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Pedido, Config } from "./types";
import { formatBRL, formatData } from "./format";
import { chavePix, titularPix } from "./pix";

export function gerarOrcamentoPdf(pedido: Pedido, config: Config, logo: Uint8Array, pix: { icone: Uint8Array; qrCode: Uint8Array }) {
  const doc = new jsPDF({ format: "a4", unit: "mm", compress: true });
  const margin = 15;
  const imagem = doc.getImageProperties(logo);
  const largura = Math.min(62, 24 * imagem.width / imagem.height);
  const altura = largura * imagem.height / imagem.width;
  doc.addImage(logo, "PNG", margin, margin, largura, altura);
  doc.setFont("helvetica", "bold").setFontSize(16);
  doc.text("ORÇAMENTO", 195, 21, { align: "right" });
  doc.setFont("helvetica", "normal").setFontSize(10);
  doc.text("Nº " + String(pedido.numero).padStart(4, "0"), 195, 28, { align: "right" });
  doc.text(formatData(pedido.created_at), 195, 34, { align: "right" });
  let y = Math.max(43, margin + altura + 7);
  const texto = (valor: string, limite = 265) => {
    doc.setFont("helvetica", "normal").setFontSize(10);
    const linhas: string[] = doc.splitTextToSize(valor, 180);
    for (const linha of linhas) {
      if (y > limite) { doc.addPage(); y = 20; }
      doc.text(linha, margin, y); y += 5;
    }
  };
  if (pedido.cliente_nome) texto("Cliente: " + pedido.cliente_nome);
  if (pedido.telefone) texto("Telefone: " + pedido.telefone);
  if (pedido.criado_por) texto("Responsável: " + pedido.criado_por.nome);
  autoTable(doc, {
    rowPageBreak: "avoid",
    startY: y + 3, margin: { left: margin, right: margin, top: 18, bottom: 24 },
    head: [["Nº", "Produto", "Qtd", "Valor por item", "Subtotal"]],
    body: pedido.itens.map((item, index) => [
      String(index + 1),
      item.produto_nome,
      String(item.quantidade),
      formatBRL(item.preco_unitario) + ((item.desconto_unitario ?? 0) > 0 ? "\nDesconto aplicado" : ""),
      formatBRL(item.subtotal),
    ]),
    styles: { font: "helvetica", fontSize: 9, cellPadding: 3, overflow: "linebreak" },
    headStyles: { fillColor: [15, 23, 42] },
    columnStyles: { 0: { cellWidth: 12, halign: "center" }, 1: { cellWidth: 84 }, 2: { cellWidth: 14, halign: "center" }, 3: { cellWidth: 38, halign: "right" }, 4: { cellWidth: 32, halign: "right" } },
  });
  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 9;
  // Deixa espaço para o bloco Pix no rodapé da última página.
  const topoPix = 236;
  const limiteConteudo = topoPix - 5;
  if (y > limiteConteudo - (pedido.observacao ? 9 : 0)) { doc.addPage(); y = 20; }
  doc.setFont("helvetica", "bold").setFontSize(16);
  doc.text("Total: " + formatBRL(pedido.valor_total), 195, y, { align: "right" });
  y += 5;
  if (pedido.observacao) { y += 4; texto("Observação: " + pedido.observacao, limiteConteudo); }
  const paginas = doc.getNumberOfPages();
  for (let pagina = 1; pagina <= paginas; pagina++) {
    doc.setPage(pagina);
    if (pagina === paginas) {
      doc.setFillColor(255, 255, 255).setDrawColor(67, 152, 143).setLineWidth(0.45);
      doc.roundedRect(30, topoPix, 150, 37, 3, 3, "FD");
      doc.addImage(pix.icone, "JPEG", 37, 241, 9, 9);
      doc.addImage(pix.qrCode, "PNG", 144, 240, 29, 29);
      doc.setFont("helvetica", "bold").setFontSize(15).setTextColor(17, 91, 83);
      doc.text("Pague com Pix", 50, 247);
      doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(51, 65, 85);
      doc.text("Escaneie o QR Code ou use a chave Pix.", 50, 253);
      doc.setFont("helvetica", "bold").setFontSize(13).setTextColor(15, 23, 42);
      doc.text(chavePix, 50, 261);
      doc.setFont("helvetica", "normal").setFontSize(10);
      doc.text(titularPix, 50, 267);
    }
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(90);
    doc.text(config.distribuidora_nome + (config.distribuidora_contato ? " | " + config.distribuidora_contato : ""), 105, 279, { align: "center" });
    doc.text("Este orçamento não é um documento fiscal. | " + pagina + "/" + paginas, 105, 284, { align: "center" });
  }
  return new Uint8Array(doc.output("arraybuffer"));
}
