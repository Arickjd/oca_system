import { verificarAcessoApi, obterSessao } from "@/lib/auth-servidor";
import { NextRequest, NextResponse } from "next/server";
import { getProdutos, criarProduto, registrarAuditoria } from "@/lib/db";
import { validarProduto } from "@/lib/validarProduto";
import { formatBRL } from "@/lib/format";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const negado = await verificarAcessoApi(); if (negado) return negado;
  const sessao = await obterSessao();
  let input;
  try { input = await validarProduto(await req.json()); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Dados inválidos." }, { status: 400 }); }
  try {
    const produto = await criarProduto({ ...input, categoria_id: input.categoria_id ?? "" });
    if (sessao) {
      await registrarAuditoria({
        usuario: sessao.usuario,
        acao: "produto.criado",
        titulo: "Produto criado",
        alvo: produto.nome,
        resumo: `${formatBRL(produto.preco_pack)} · ${produto.pack_quantidade} un/pacote`,
        detalhes: [
          { rotulo: "Preço de venda", valor: formatBRL(produto.preco_pack) },
          { rotulo: "Preço de compra", valor: produto.custo_pack ? formatBRL(produto.custo_pack) : "não informado" },
          { rotulo: "Itens por pacote", valor: String(produto.pack_quantidade) },
          { rotulo: "Criado por", valor: sessao.usuario.nome },
        ],
      });
    }
    revalidatePath("/produtos");
    revalidatePath("/categorias");
    revalidatePath("/gerenciar-produtos");
    return NextResponse.json(produto, { status: 201 });
  } catch { return NextResponse.json({ error: "Não foi possível salvar o produto." }, { status: 500 }); }
}

export async function GET() {
  const negado = await verificarAcessoApi(); if (negado) return negado;
  const prods = await getProdutos();
  return NextResponse.json(prods);
}
