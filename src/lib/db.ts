import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import * as postgres from "./postgres";
import type {
  Categoria,
  ItemPedido,
  Pedido,
  Produto,
} from "./types";

// PostgreSQL quando DATABASE_URL estiver configurada; JSON apenas para uso local.
// Na Vercel, uma configuração ausente interrompe a operação em vez de perder dados.

const DATA_DIR = path.join(process.cwd(), "data");

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function readData<T>(file: string, fallback: T): Promise<T> {
  if (postgres.usarPostgres()) {
    if (file === "config.json") return (await postgres.buscar<T>("config", "principal")) ?? fallback;
    return await postgres.listar<T extends (infer U)[] ? U : never>(file.replace(".json", "")) as T;
  }
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, file), "utf8");
    return JSON.parse(raw) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return fallback;
    throw error;
  }
}

// Serializa as escritas para evitar corrupção em acessos concorrentes.
let writeChain: Promise<unknown> = Promise.resolve();

export function writeData(file: string, data: unknown): Promise<void> {
  if (postgres.usarPostgres()) throw new Error("Gravação de arquivos desabilitada com PostgreSQL.");
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

/* ------------------------------ Produtos ------------------------------ */

export async function getProdutos(): Promise<Produto[]> {
  return (await readData<Produto[]>("produtos.json", [])).filter(p => !p.excluido_em);
}

export async function getProduto(id: string): Promise<Produto | undefined> {
  if (postgres.usarPostgres()) {
    const produto = await postgres.buscar<Produto>("produtos", id);
    return produto?.excluido_em ? undefined : produto;
  }
  const prods = await getProdutos();
  return prods.find((p) => p.id === id);
}

export async function atualizarProduto(id: string, patch: Pick<Produto, "nome" | "preco_pack" | "pack_quantidade"> & Partial<Pick<Produto, "categoria_id" | "custo_pack">>) {
  if (postgres.usarPostgres()) return postgres.atualizar<Produto>("produtos", id, patch);
  const run = writeChain.then(async () => {
    const dest = path.join(DATA_DIR, "produtos.json");
    const produtos: Produto[] = JSON.parse(await fs.readFile(dest, "utf8"));
    const produto = produtos.find((p) => p.id === id && !p.excluido_em);
    if (!produto) return undefined;
    Object.assign(produto, patch);
    await fs.writeFile(`${dest}.tmp`, JSON.stringify(produtos, null, 2), "utf8");
    await fs.rename(`${dest}.tmp`, dest);
    return produto;
  });
  writeChain = run.catch(() => undefined);
  return run;
}

export async function excluirProduto(id: string): Promise<boolean> {
  if (postgres.usarPostgres()) return postgres.excluirProduto(id);
  const run = writeChain.then(async () => {
    const produtos = await readData<Produto[]>("produtos.json", []);
    const produto = produtos.find(p => p.id === id && !p.excluido_em);
    if (!produto) return false;
    produto.excluido_em = new Date().toISOString();
    produto.ativo = false;
    const dest = path.join(DATA_DIR, "produtos.json");
    await fs.writeFile(dest + ".tmp", JSON.stringify(produtos, null, 2), "utf8");
    await fs.rename(dest + ".tmp", dest);
    return true;
  });
  writeChain = run.catch(() => undefined);
  return run;
}

/* ------------------------------- Pedidos ------------------------------ */

export async function criarProduto(input: Pick<Produto, "nome" | "preco_pack" | "pack_quantidade" | "categoria_id" | "custo_pack">) {
  if (postgres.usarPostgres()) return postgres.inserir<Produto>("produtos", {
    ...input, id: randomUUID(), descricao: "", unidade: "un", imagem_url: "", ativo: true, created_at: new Date().toISOString(),
  });
  const run = writeChain.then(async () => {
    const dest = path.join(DATA_DIR, "produtos.json");
    const produtos: Produto[] = JSON.parse(await fs.readFile(dest, "utf8"));
    const produto: Produto = { ...input, id: randomUUID(), descricao: "", unidade: "un", imagem_url: "", ativo: true, created_at: new Date().toISOString() };
    produtos.push(produto);
    await fs.writeFile(dest + ".tmp", JSON.stringify(produtos, null, 2), "utf8");
    await fs.rename(dest + ".tmp", dest);
    return produto;
  });
  writeChain = run.catch(() => undefined);
  return run;
}

export async function getPedidos(): Promise<Pedido[]> {
  const pedidos = await readData<Pedido[]>("pedidos.json", []);
  // mais recentes primeiro
  return pedidos.filter(p => !p.excluido_em).sort((a, b) => b.numero - a.numero);
}

export async function getPedido(id: string): Promise<Pedido | undefined> {
  if (postgres.usarPostgres()) {
    const pedido = await postgres.buscar<Pedido>("pedidos", id);
    return pedido?.excluido_em ? undefined : pedido;
  }
  const pedidos = await getPedidos();
  return pedidos.find((p) => p.id === id);
}

// Exclusão lógica preserva a numeração e impede que uma reimportação restaure o orçamento.
export async function excluirPedido(id: string): Promise<boolean> {
  if (postgres.usarPostgres()) return postgres.excluirPedido(id);
  const run = writeChain.then(async () => {
    const pedidos = await readData<Pedido[]>("pedidos.json", []);
    const pedido = pedidos.find(p => p.id === id && !p.excluido_em);
    if (!pedido) return false;
    pedido.excluido_em = new Date().toISOString();
    const dest = path.join(DATA_DIR, "pedidos.json");
    await fs.writeFile(dest + ".tmp", JSON.stringify(pedidos, null, 2), "utf8");
    await fs.rename(dest + ".tmp", dest);
    return true;
  });
  writeChain = run.catch(() => undefined);
  return run;
}

export interface NovoItem {
  produto_id: string;
  produto_nome: string;
  modo: "unidade" | "pacote";
  pack_quantidade?: number;
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
  const run = writeChain.then(async () => {
  const remoto = postgres.usarPostgres();
  const pedidos = remoto ? [] : await readData<Pedido[]>("pedidos.json", []);
  const numero =
    pedidos.reduce((max, p) => Math.max(max, p.numero || 0), 0) + 1;

  // Custos lidos no servidor e congelados; alterações futuras não mudam o histórico.
  const produtos = new Map((await getProdutos()).map(p => [p.id, p]));
  const itens: ItemPedido[] = (input.itens || []).map((it) => {
    const produto = produtos.get(it.produto_id);
    const custo = produto?.custo_pack;
    const custo_unitario = typeof custo === "number" && Number.isFinite(custo) && custo > 0
      ? (it.modo === "pacote" ? custo : custo / (produto?.pack_quantidade || 1)) : null;
    const quantidade = Math.max(1, Number(it.quantidade) || 1);
    const preco_unitario = Number(it.preco_unitario) || 0;
    return {
      id: randomUUID(),
      produto_id: it.produto_id,
      produto_nome: it.produto_nome,
      modo: it.modo,
      pack_quantidade:
        it.modo === "pacote"
          ? Math.max(1, Math.trunc(Number(it.pack_quantidade) || 1))
          : undefined,
      quantidade,
      preco_unitario,
      custo_unitario,
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
    lucro_bruto: itens.length > 0 && itens.every(it => it.custo_unitario != null)
      ? (Math.round(valor_total * 100) - itens.reduce((s, it) => s + Math.round(it.custo_unitario! * it.quantidade * 100), 0)) / 100
      : null,
    status: "novo",
    created_at: new Date().toISOString(),
  };

  if (remoto) return postgres.inserirPedido(novo);
  pedidos.push(novo);
  await ensureDir();
  const dest = path.join(DATA_DIR, "pedidos.json");
  await fs.writeFile(dest + ".tmp", JSON.stringify(pedidos, null, 2), "utf8");
  await fs.rename(dest + ".tmp", dest);
  return novo;
  });
  writeChain = run.catch(() => undefined);
  return run;
}
