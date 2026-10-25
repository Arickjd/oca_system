import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Pedido, Config } from "./types";
import { formatBRL, formatData } from "./format";

export function gerarOrcamentoPdf(pedido: Pedido, config: Config, logo: Uint8Array) {
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
  const texto = (valor: string, bold = false) => {
    const linhas: string[] = doc.splitTextToSize(valor, 180);
    doc.setFont("helvetica", bold ? "bold" : "normal").setFontSize(10);
    for (const linha of linhas) {
      if (y > 265) { doc.addPage(); y = 20; }
      doc.text(linha, margin, y); y += 5;
    }
  };
  if (pedido.cliente_nome) texto("Cliente: " + pedido.cliente_nome);
  if (pedido.telefone) texto("Telefone: " + pedido.telefone);
  autoTable(doc, {
    rowPageBreak: "avoid",
    startY: y + 3, margin: { left: margin, right: margin, top: 18, bottom: 24 },
    head: [["Nº", "Produto", "Qtd", "Valor original", "Valor final", "Subtotal"]],
    body: pedido.itens.map((item, index) => [
      String(index + 1),
      item.produto_nome + (item.modo === "pacote" ? "\nPacote" + (item.pack_quantidade ? " com " + item.pack_quantidade + " itens" : "") : ""),
      String(item.quantidade), formatBRL(item.preco_original ?? item.preco_unitario),
      formatBRL(item.preco_unitario) + ((item.desconto_unitario ?? 0) > 0 ? "\nCom desconto" : ""),
      formatBRL(item.subtotal),
    ]),
    styles: { font: "helvetica", fontSize: 9, cellPadding: 3, overflow: "linebreak" },
    headStyles: { fillColor: [15, 23, 42] },
    columnStyles: { 0: { cellWidth: 12, halign: "center" }, 1: { cellWidth: 58 }, 2: { cellWidth: 14, halign: "center" }, 3: { cellWidth: 32, halign: "right" }, 4: { cellWidth: 32, halign: "right" }, 5: { cellWidth: 32, halign: "right" } },
  });
  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 9;
  const descontoTotal = pedido.itens.reduce((s, it) => s + Math.round((it.desconto_unitario ?? 0) * it.quantidade * 100), 0) / 100;
  if (descontoTotal > 0) texto("Desconto total: " + formatBRL(descontoTotal));
  texto("Total: " + formatBRL(pedido.valor_total), true);
  if (pedido.observacao) { y += 4; texto("Observação: " + pedido.observacao); }
  const paginas = doc.getNumberOfPages();
  for (let pagina = 1; pagina <= paginas; pagina++) {
    doc.setPage(pagina);
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(90);
    doc.text(config.distribuidora_nome + (config.distribuidora_contato ? " | " + config.distribuidora_contato : ""), 105, 279, { align: "center" });
    doc.text("Este orçamento não é um documento fiscal. | " + pagina + "/" + paginas, 105, 284, { align: "center" });
  }
  return new Uint8Array(doc.output("arraybuffer"));
}
