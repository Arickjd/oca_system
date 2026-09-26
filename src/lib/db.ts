import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type {
  Categoria,
  ItemPedido,
  Pedido,
  PedidoStatus,
  Produto,
} from "./types";

// Banco de dados simples baseado em arquivos JSON (conforme arquitetura MVP).
// Observação: em hospedagem serverless (ex: Vercel) o filesystem é efêmero;
// para persistência real use um servidor dedicado/VPS ou um volume persistente.

const DATA_DIR = path.join(process.cwd(), "data");

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function readData<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, file), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// Serializa as escritas para evitar corrupção em acessos concorrentes.
let writeChain: Promise<unknown> = Promise.resolve();

export function writeData(file: string, data: unknown): Promise<void> {
  const run = writeChain.then(async () => {
    await ensureDir();
    const dest = path.join(DATA_DIR, file);
    const tmp = `${dest}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
    await fs.rename(tmp, dest);
  });
  // mantém a cadeia mesmo se uma escrita falhar
  writeChain = run.catch(() => undefined);
  return run;
}

/* ----------------------------- Categorias ----------------------------- */

export async function getCategorias(): Promise<Categoria[]> {
  return readData<Categoria[]>("categorias.json", []);
}

export async function getCategoria(id: string): Promise<Categoria | undefined> {
  const cats = await getCategorias();
  return cats.find((c) => c.id === id);
}

export async function createCategoria(
  input: Pick<Categoria, "nome"> & Partial<Categoria>
): Promise<Categoria> {
  const cats = await getCategorias();
  const nova: Categoria = {
    id: randomUUID(),
    nome: input.nome.trim(),
    ativo: input.ativo ?? true,
    created_at: new Date().toISOString(),
  };
  cats.push(nova);
  await writeData("categorias.json", cats);
  return nova;
}

export async function updateCategoria(
  id: string,
  patch: Partial<Categoria>
): Promise<Categoria | undefined> {
  const cats = await getCategorias();
  const idx = cats.findIndex((c) => c.id === id);
  if (idx === -1) return undefined;
  cats[idx] = { ...cats[idx], ...patch, id: cats[idx].id };
  await writeData("categorias.json", cats);
  return cats[idx];
}

export async function deleteCategoria(id: string): Promise<boolean> {
  const cats = await getCategorias();
  const next = cats.filter((c) => c.id !== id);
  if (next.length === cats.length) return false;
  await writeData("categorias.json", next);
  return true;
}

/* ------------------------------ Produtos ------------------------------ */

export async function getProdutos(): Promise<Produto[]> {
  return readData<Produto[]>("produtos.json", []);
}

export async function getProduto(id: string): Promise<Produto | undefined> {
  const prods = await getProdutos();
  return prods.find((p) => p.id === id);
}

export async function createProduto(
  input: Partial<Produto> & Pick<Produto, "nome">
): Promise<Produto> {
  const prods = await getProdutos();
  const novo: Produto = {
    id: randomUUID(),
    codigo: input.codigo ?? "",
    nome: input.nome.trim(),
    descricao: input.descricao ?? "",
    preco: Number(input.preco ?? 0),
    preco_pack: Number(input.preco_pack ?? 0),
    pack_quantidade: Number(input.pack_quantidade ?? 6),
    unidade: input.unidade ?? "un",
    imagem_url: input.imagem_url ?? "",
    categoria_id: input.categoria_id ?? "",
    ativo: input.ativo ?? true,
    created_at: new Date().toISOString(),
  };
  prods.push(novo);
  await writeData("produtos.json", prods);
  return novo;
}

export async function updateProduto(
  id: string,
  patch: Partial<Produto>
): Promise<Produto | undefined> {
  const prods = await getProdutos();
  const idx = prods.findIndex((p) => p.id === id);
  if (idx === -1) return undefined;
  const { id: _ignore, created_at: _c, ...rest } = patch;
  prods[idx] = { ...prods[idx], ...rest };
  await writeData("produtos.json", prods);
  return prods[idx];
}

export async function deleteProduto(id: string): Promise<boolean> {
  const prods = await getProdutos();
  const next = prods.filter((p) => p.id !== id);
  if (next.length === prods.length) return false;
  await writeData("produtos.json", next);
  return true;
}

/* ------------------------------- Pedidos ------------------------------ */

export async function getPedidos(): Promise<Pedido[]> {
  const pedidos = await readData<Pedido[]>("pedidos.json", []);
  // mais recentes primeiro
  return pedidos.sort((a, b) => b.numero - a.numero);
}

export async function getPedido(id: string): Promise<Pedido | undefined> {
  const pedidos = await getPedidos();
  return pedidos.find((p) => p.id === id);
}

export interface NovoItem {
  produto_id: string;
  produto_nome: string;
  modo: "unidade" | "pacote";
  quantidade: number;
  preco_unitario: number;
}

export interface NovoPedido {
  cliente_nome?: string;
  telefone?: string;
  observacao?: string;
  itens: NovoItem[];
}

export async function createPedido(input: NovoPedido): Promise<Pedido> {
  const pedidos = await readData<Pedido[]>("pedidos.json", []);
  const numero =
    pedidos.reduce((max, p) => Math.max(max, p.numero || 0), 0) + 1;

  const itens: ItemPedido[] = (input.itens || []).map((it) => {
    const quantidade = Math.max(1, Number(it.quantidade) || 1);
    const preco_unitario = Number(it.preco_unitario) || 0;
    return {
      id: randomUUID(),
      produto_id: it.produto_id,
      produto_nome: it.produto_nome,
      modo: it.modo,
      quantidade,
      preco_unitario,
      subtotal: Math.round(preco_unitario * quantidade * 100) / 100,
    };
  });

  const valor_total =
    Math.round(itens.reduce((s, it) => s + it.subtotal, 0) * 100) / 100;

  const novo: Pedido = {
    id: randomUUID(),
    numero,
    cliente_nome: (input.cliente_nome ?? "").trim(),
    telefone: (input.telefone ?? "").trim(),
    observacao: (input.observacao ?? "").trim(),
    itens,
    valor_total,
    status: "novo",
    created_at: new Date().toISOString(),
  };

  pedidos.push(novo);
  await writeData("pedidos.json", pedidos);
  return novo;
}

export async function updatePedidoStatus(
  id: string,
  status: PedidoStatus
): Promise<Pedido | undefined> {
  const pedidos = await readData<Pedido[]>("pedidos.json", []);
  const idx = pedidos.findIndex((p) => p.id === id);
  if (idx === -1) return undefined;
  pedidos[idx] = { ...pedidos[idx], status };
  await writeData("pedidos.json", pedidos);
  return pedidos[idx];
}

export async function deletePedido(id: string): Promise<boolean> {
  const pedidos = await readData<Pedido[]>("pedidos.json", []);
  const next = pedidos.filter((p) => p.id !== id);
  if (next.length === pedidos.length) return false;
  await writeData("pedidos.json", next);
  return true;
}
