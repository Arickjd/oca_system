import ExcelJS from "exceljs";
import type { SnapshotBanco } from "./snapshotBanco";

type Linha = Record<string, unknown>;
type Coluna = { nome: string; campo: string; largura?: number; formato?: string; data?: boolean };
const MOEDA = '"R$" #,##0.00;[Red]-"R$" #,##0.00';
const DATA = "dd/mm/yyyy hh:mm:ss";
const c = (nome: string, campo: string, largura = 22, formato?: string): Coluna => ({ nome, campo, largura, formato });
const data = (nome: string, campo: string): Coluna => ({ nome: `${nome} (Brasília)`, campo, largura: 25, formato: DATA, data: true });

function dataExcel(valor: unknown) {
  if (typeof valor !== "string" || !Number.isFinite(Date.parse(valor))) return valor;
  const partes = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date(valor));
  const numero = (tipo: string) => Number(partes.find(p => p.type === tipo)?.value);
  return new Date(Date.UTC(numero("year"), numero("month") - 1, numero("day"), numero("hour"), numero("minute"), numero("second")));
}

function valorCelula(valor: unknown): ExcelJS.CellValue {
  if (valor == null) return null;
  if (valor instanceof Date) return valor;
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : String(valor);
  if (typeof valor === "boolean") return valor;
  const texto = typeof valor === "string" ? valor : JSON.stringify(valor);
  return texto.length <= 32767 ? texto : texto.slice(0, 32000) + "\n[Texto completo na aba Registros brutos]";
}

export function dividirJson(texto: string) {
  const partes: string[] = [];
  for (let inicio = 0; inicio < texto.length;) {
    let fim = Math.min(inicio + 30000, texto.length);
    const ultimo = texto.charCodeAt(fim - 1);
    if (fim < texto.length && ultimo >= 0xd800 && ultimo <= 0xdbff) fim--;
    partes.push(texto.slice(inicio, fim)); inicio = fim;
  }
  return partes;
}

export async function gerarBancoXlsx(snapshot: SnapshotBanco, responsavel: string) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sistema OCA"; workbook.created = new Date(snapshot.gerado_em);
  function tabela(nome: string, colunas: Coluna[], linhas: Linha[]) {
    if (linhas.length > 1048575) throw new Error(`A aba ${nome} ultrapassa o limite de linhas do Excel.`);
    const sheet = workbook.addWorksheet(nome, { views: [{ state: "frozen", xSplit: 1, ySplit: 1, showGridLines: false }] });
    sheet.columns = colunas.map(col => ({ header: col.nome, key: col.campo, width: col.largura ?? 22 }));
    for (const linha of linhas) sheet.addRow(colunas.map(col => valorCelula(col.data ? dataExcel(linha[col.campo]) : linha[col.campo])));
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: colunas.length } };
    sheet.getRow(1).height = 38;
    sheet.eachRow((row, index) => {
      if (index > 1) row.height = 30;
      row.eachCell({ includeEmpty: true }, (cell, coluna) => {
        cell.font = { name: "Arial", size: 10, color: { argb: index === 1 ? "FFFFFFFF" : "FF334155" }, bold: index === 1 };
        cell.alignment = { vertical: "middle", horizontal: index === 1 ? "center" : typeof cell.value === "number" ? "right" : "left", wrapText: index === 1 };
        if (index === 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
        else if (index % 2 === 0) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
        if (index > 1 && colunas[coluna - 1]?.formato) cell.numFmt = colunas[coluna - 1].formato!;
        else if (index > 1 && typeof cell.value === "string") cell.numFmt = "@";
      });
    });
    return sheet;
  }
  const resumo = workbook.addWorksheet("Resumo", { views: [{ showGridLines: false }] });
  resumo.columns = [{ width: 35 }, { width: 72 }];
  resumo.addRows([
    [], ["Sistema OCA - Exportação do banco"], [],
    ["Exportado em (Brasília)", dataExcel(snapshot.gerado_em)], ["Exportado por", responsavel],
    ["Origem", snapshot.origem === "postgres" ? "PostgreSQL" : "Arquivos locais"],
    ["Escopo", "Todo o banco, incluindo registros excluídos e todo o histórico."],
    ["Filtro de datas", "Não se aplica à exportação do banco."], [], ["Aba", "Quantidade de registros"],
  ]);
  resumo.getCell("B4").numFmt = DATA;
  const registros = (colecao: string) => snapshot.registros.filter(r => r.colecao === colecao).map(r => ({ ...r.dados, id: r.id } as Linha));
  const produtos = registros("produtos");
  const categorias = registros("categorias");
  const nomesCategorias = new Map(categorias.map(cat => [cat.id, cat.nome]));
  const pedidos = registros("pedidos").sort((a, b) => Number(a.numero) - Number(b.numero));
  const itens: Linha[] = [];
  for (const p of pedidos) if (Array.isArray(p.itens)) p.itens.forEach((item, index) => {
    itens.push({ ...(item as Linha), pedido_id: p.id, numero_orcamento: p.numero, indice: index + 1 });
  });
  const produtosComCategoria = produtos.map(p => ({ ...p, categoria_nome: nomesCategorias.get(p.categoria_id) ?? "" }));
  tabela("Produtos", [c("ID", "id", 38), c("Código", "codigo"), c("Nome", "nome", 42), c("Descrição", "descricao", 60), c("Categoria ID", "categoria_id", 38), c("Categoria", "categoria_nome", 30), c("Valor de venda", "preco_pack", 22, MOEDA), c("Valor de compra", "custo_pack", 22, MOEDA), c("Itens por pacote", "pack_quantidade"), c("Unidade", "unidade"), c("Imagem", "imagem_url", 45), c("Ativo", "ativo"), data("Criação", "created_at"), data("Exclusão", "excluido_em")], produtosComCategoria);
  tabela("Categorias", [c("ID", "id", 38), c("Nome", "nome", 35), c("Ativa", "ativo"), data("Criação", "created_at")], categorias);
  tabela("Orçamentos", [c("ID", "id", 38), c("Número", "numero"), c("Cliente", "cliente_nome", 35), c("Telefone", "telefone", 24), c("Observação", "observacao", 60), c("Responsável ID", "responsavel_id"), c("Responsável", "responsavel_nome"), c("Valor total", "valor_total", 22, MOEDA), c("Lucro bruto", "lucro_bruto", 22, MOEDA), c("Status do pedido", "status"), c("Pagamento", "status_pagamento"), c("Forma de pagamento", "forma_pagamento"), data("Pagamento", "pago_em"), data("Criação", "created_at"), c("Revisão", "revisao"), data("Atualização", "updated_at"), data("Exclusão", "excluido_em")], pedidos.map(p => ({ ...p, responsavel_id: (p.criado_por as Linha | undefined)?.id, responsavel_nome: (p.criado_por as Linha | undefined)?.nome })));
  tabela("Itens", [c("Orçamento ID", "pedido_id", 38), c("Número do orçamento", "numero_orcamento"), c("Item Nº", "indice", 12), c("Item ID", "id", 38), c("Produto ID", "produto_id", 38), c("Produto", "produto_nome", 45), c("Modo de venda", "modo"), c("Itens por pacote", "pack_quantidade"), c("Quantidade", "quantidade"), c("Valor original", "preco_original", 22, MOEDA), c("Desconto por item", "desconto_unitario", 22, MOEDA), c("Valor final", "preco_unitario", 22, MOEDA), c("Custo por item", "custo_unitario", 22, MOEDA), c("Subtotal", "subtotal", 22, MOEDA)], itens);
  const configuracoes = snapshot.registros.filter(r => r.colecao === "config").flatMap(r => Object.entries(r.dados).map(([campo, valor]) => ({ id: r.id, campo, valor })));
  tabela("Configurações", [c("Registro ID", "id", 45), c("Campo", "campo", 35), c("Valor", "valor", 80)], configuracoes);
  tabela("Contadores", [c("ID", "id", 38), c("Último número (texto exato)", "valor", 32)], snapshot.contadores);
  const brutos = snapshot.registros.flatMap(r => {
    const partes = dividirJson(JSON.stringify(r.dados));
    return partes.map((json, index) => ({ colecao: r.colecao, id: r.id, parte: index + 1, partes: partes.length, json }));
  });
  tabela("Registros brutos", [c("Coleção", "colecao"), c("ID", "id", 45), c("Parte", "parte", 12), c("Total de partes", "partes", 18), c("Dados JSON", "json", 110)], brutos);
  for (const [nome, quantidade] of [["Produtos", produtos.length], ["Categorias", categorias.length], ["Orçamentos", pedidos.length], ["Itens", itens.length], ["Configurações", configuracoes.length], ["Contadores", snapshot.contadores.length], ["Registros brutos", snapshot.registros.length]]) resumo.addRow([nome, quantidade]);
  resumo.addRows([[], ["Registros brutos", "Para reconstituir campos extensos, una as partes JSON na ordem numérica de cada coleção e ID."], ["Datas", "As abas mostram Brasília; os registros JSON mantêm os timestamps originais."], ["Textos extensos", "Nas abas de consulta, textos acima de 32.767 caracteres apontam para Registros brutos."], ["Contadores", snapshot.origem === "local" ? "O contador local é calculado a partir do maior número no histórico, incluindo excluídos." : "Valores originais do banco preservados como texto para evitar perda de precisão."], ["Dados de acesso", "Senhas, chaves de sessão e variáveis de ambiente não fazem parte desta exportação."]]);
  resumo.eachRow(row => { row.height = 30; row.eachCell(cell => { cell.font = { name: "Arial", size: 10, color: { argb: "FF334155" } }; cell.alignment = { vertical: "middle", wrapText: true }; }); });
  resumo.getRow(2).height = 36; resumo.getCell("A2").font = { name: "Arial", size: 15, bold: true, color: { argb: "FF0F172A" } };
  resumo.getRow(10).eachCell(cell => { cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } }; cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } }; });
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}
