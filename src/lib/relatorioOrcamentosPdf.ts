import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Pedido } from "./types";
import { formatBRL, formatData } from "./format";
import { dataCurta, resumoPeriodo, formasPagamento, type Periodo } from "./periodoOrcamentos";

export function gerarRelatorioOrcamentos(pedidos: Pedido[], periodo: Periodo, tipo: "resumido" | "detalhado", empresa: string) {
  const doc = new jsPDF({ format: "a4", unit: "mm", compress: true });
  const resumo = resumoPeriodo(pedidos);
  let y = 18;
  function texto(valor: string, tamanho = 10, negrito = false) {
    doc.setFont("helvetica", negrito ? "bold" : "normal").setFontSize(tamanho).setTextColor(15, 23, 42);
    const linhas: string[] = doc.splitTextToSize(valor, 180);
    for (const linha of linhas) {
      if (y > 265) { doc.addPage(); y = 20; }
      doc.text(linha, 15, y); y += tamanho * 0.45 + 1;
    }
  }
  texto(empresa, 11, true);
  y += 2;
  texto(`Relatório ${tipo} de orçamentos`, 18, true);
  texto(`${dataCurta(periodo.inicio)} a ${dataCurta(periodo.fim)} | ${pedidos.length} orçamento(s)`);
  texto("Filtro por data de criação - horário de Brasília. Inclui pendentes e finalizados.", 9);
  y += 3;
  texto(`Total: ${formatBRL(resumo.total)} | Finalizados: ${formatBRL(resumo.recebido)} | Pendentes: ${formatBRL(resumo.pendente)}`, 10, true);
  y += 5;
  const status = (p: Pedido) => p.status_pagamento === "finalizado" ? "Finalizado" : "Pendente";
  const pagamento = (p: Pedido) => p.forma_pagamento ? formasPagamento[p.forma_pagamento] : "---";
  if (!pedidos.length) texto("Nenhum orçamento encontrado neste período.");
  if (tipo === "resumido" && pedidos.length) {
    autoTable(doc, {
      startY: y, margin: { left: 15, right: 15, top: 18, bottom: 22 },
      head: [["Nº / Data", "Cliente", "Situação", "Pagamento", "Valor"]],
      body: pedidos.map(p => [`#${p.numero}\n${formatData(p.created_at)}`, p.cliente_nome || "Cliente não informado", status(p), pagamento(p), formatBRL(p.valor_total)]),
      styles: { fontSize: 9, cellPadding: 3, overflow: "linebreak" },
      headStyles: { fillColor: [15, 23, 42] },
      columnStyles: { 0: { cellWidth: 33 }, 1: { cellWidth: 59 }, 2: { cellWidth: 28 }, 3: { cellWidth: 27 }, 4: { cellWidth: 33, halign: "right" } },
    });
  } else if (tipo === "detalhado") {
    for (const p of pedidos) {
      const titulo = `#${p.numero} - ${p.cliente_nome || "Cliente não informado"}`;
      doc.setFont("helvetica", "bold").setFontSize(11);
      const alturaTitulo = doc.splitTextToSize(titulo, 180).length * 6;
      if (y + alturaTitulo + 35 > 270) { doc.addPage(); y = 20; }
      texto(titulo, 11, true);
      texto(`${formatData(p.created_at)} | ${status(p)} | ${pagamento(p)} | Total: ${formatBRL(p.valor_total)}`, 9);
      autoTable(doc, {
        startY: y + 2, margin: { left: 15, right: 15, top: 18, bottom: 22 },
        head: [["Produto", "Apresentação", "Qtd", "Preço", "Subtotal"]],
        body: p.itens.map(it => [it.produto_nome, it.modo === "pacote" ? `Pacote com ${it.pack_quantidade ?? 1}` : "Unidade", String(it.quantidade), formatBRL(it.preco_unitario), formatBRL(it.subtotal)]),
        styles: { fontSize: 9, cellPadding: 3, overflow: "linebreak" },
        headStyles: { fillColor: [51, 65, 85] },
        columnStyles: { 0: { cellWidth: 72 }, 1: { cellWidth: 32 }, 2: { cellWidth: 14, halign: "center" }, 3: { cellWidth: 31, halign: "right" }, 4: { cellWidth: 31, halign: "right" } },
      });
      y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    }
  }
  const paginas = doc.getNumberOfPages();
  for (let i = 1; i <= paginas; i++) {
    doc.setPage(i); doc.setDrawColor(226, 232, 240); doc.line(15, 279, 195, 279);
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(100);
    doc.text(`Sistema OCA | Relatório ${tipo} | ${dataCurta(periodo.inicio)} a ${dataCurta(periodo.fim)}`, 15, 285);
    doc.text(`${i} / ${paginas}`, 195, 285, { align: "right" });
  }
  return new Uint8Array(doc.output("arraybuffer"));
}
