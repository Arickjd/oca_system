import { jsPDF } from "jspdf";
import autoTable, { type RowInput } from "jspdf-autotable";
import type { Categoria, Produto } from "./types";
import { formatBRL } from "./format";

// Catálogo interno: inclui custo de compra, por isso só é gerado para o administrador.
export function gerarProdutosPdf(
  produtos: Produto[],
  categorias: Categoria[],
  empresa: string,
  geradoEm = new Date(),
) {
  const doc = new jsPDF({ format: "a4", unit: "mm", compress: true });
  const margem = 15;
  const ordenar = (a: string, b: string) => a.localeCompare(b, "pt-BR", { sensitivity: "base" });

  const nomeCategoria = new Map(categorias.map(c => [c.id, c.nome]));
  const grupos = new Map<string, Produto[]>();
  for (const produto of produtos) {
    const categoria = nomeCategoria.get(produto.categoria_id) ?? "Sem categoria";
    const lista = grupos.get(categoria) ?? [];
    lista.push(produto);
    grupos.set(categoria, lista);
  }
  const porCategoria = [...grupos.entries()].sort(([a], [b]) => ordenar(a, b));

  doc.setFont("helvetica", "bold").setFontSize(16).setTextColor(15, 23, 42);
  doc.text("Catálogo de produtos", margem, 20);
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(71, 85, 105);
  doc.text(`${empresa} · ${produtos.length} produto(s) em ${porCategoria.length} categoria(s)`, margem, 26);
  const gerado = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo",
  }).format(geradoEm);
  doc.text(`Gerado em ${gerado} · documento interno, contém custo de compra`, margem, 31);

  const corpo: RowInput[] = [];
  for (const [categoria, lista] of porCategoria) {
    corpo.push([{
      content: `${categoria} · ${lista.length}`,
      colSpan: 4,
      styles: { fillColor: [226, 232, 240], textColor: [15, 23, 42], fontStyle: "bold" },
    }]);
    for (const produto of [...lista].sort((a, b) => ordenar(a.nome, b.nome))) {
      const custo = typeof produto.custo_pack === "number" && produto.custo_pack > 0 ? produto.custo_pack : null;
      const margem = custo !== null && produto.preco_pack > 0
        ? Math.round(((produto.preco_pack - custo) / produto.preco_pack) * 1000) / 10
        : null;
      corpo.push([
        produto.nome + (produto.ativo ? "" : " (inativo)"),
        custo === null ? "---" : formatBRL(custo),
        formatBRL(produto.preco_pack),
        margem === null
          ? { content: "---", styles: { textColor: [100, 116, 139] } }
          : { content: `${margem.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`, styles: { textColor: margem < 0 ? [153, 27, 27] : [6, 95, 70] } },
      ]);
    }
  }

  autoTable(doc, {
    startY: 36,
    margin: { left: margem, right: margem, top: 18, bottom: 20 },
    head: [["Produto", "Compra", "Venda", "Margem"]],
    body: corpo,
    styles: { font: "helvetica", fontSize: 9, cellPadding: 1.8, overflow: "linebreak" },
    headStyles: { fillColor: [15, 23, 42] },
    columnStyles: {
      0: { cellWidth: 98 },
      1: { cellWidth: 28, halign: "right" },
      2: { cellWidth: 28, halign: "right" },
      3: { cellWidth: 26, halign: "right" },
    },
    rowPageBreak: "avoid",
  });

  const paginas = doc.getNumberOfPages();
  for (let pagina = 1; pagina <= paginas; pagina++) {
    doc.setPage(pagina);
    doc.setDrawColor(226, 232, 240).line(margem, 279, 195, 279);
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(100);
    doc.text("Sistema OCA | Catálogo de produtos | uso interno", margem, 285);
    doc.text(`${pagina} / ${paginas}`, 195, 285, { align: "right" });
  }
  return new Uint8Array(doc.output("arraybuffer"));
}
