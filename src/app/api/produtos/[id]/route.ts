import { verificarAcessoApi, obterSessao } from "@/lib/auth-servidor";
import { NextRequest, NextResponse } from "next/server";
import { getProduto, atualizarProduto, excluirProduto, registrarAuditoria } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { validarProduto } from "@/lib/validarProduto";
import { formatBRL } from "@/lib/format";

type Params = { params: Promise<{ id: string }> };

// O carrinho atualiza somente nome e apresentação; preço é negociado por venda.
export async function PATCH(req: NextRequest, { params }: Params) {
  const negado = await verificarAcessoApi(); if (negado) return negado;
  const { id } = await params;
  const sessao = await obterSessao();
  const antes = await getProduto(id);
  let patch;
  try {
    const body = await req.json();
    const validado = await validarProduto({ nome: body?.nome, pack_quantidade: body?.pack_quantidade, preco_pack: 0 });
    patch = { nome: validado.nome, pack_quantidade: validado.pack_quantidade };
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Dados inválidos." }, { status: 400 });
  }
  try {
    const produto = await atualizarProduto(id, patch);
    if (!produto) return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
    if (sessao) {
      await registrarAuditoria({
        usuario: sessao.usuario,
        acao: "produto.atualizado",
        titulo: "Produto atualizado",
        alvo: produto.nome,
        resumo: "Nome/apresentação",
        detalhes: [
          { rotulo: "Nome", valor: antes && antes.nome !== produto.nome ? `${antes.nome} → ${produto.nome}` : produto.nome },
          { rotulo: "Itens por pacote", valor: antes && antes.pack_quantidade !== produto.pack_quantidade ? `${antes.pack_quantidade} → ${produto.pack_quantidade}` : String(produto.pack_quantidade) },
          { rotulo: "Alterado por", valor: sessao.usuario.nome },
        ],
      });
    }
    revalidatePath("/produtos");
    revalidatePath("/categorias");
    revalidatePath("/gerenciar-produtos");
    return NextResponse.json(produto);
  } catch {
    return NextResponse.json({ error: "Não foi possível salvar o catálogo. Tente novamente." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const negado = await verificarAcessoApi(); if (negado) return negado;
  const { id } = await params;
  const sessao = await obterSessao();
  const antes = await getProduto(id);
  try {
    if (!await excluirProduto(id)) return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
    if (sessao && antes) {
      await registrarAuditoria({
        usuario: sessao.usuario,
        acao: "produto.excluido",
        titulo: "Produto excluído",
        alvo: antes.nome,
        resumo: formatBRL(antes.preco_pack),
        detalhes: [
          { rotulo: "Nome", valor: antes.nome },
          { rotulo: "Preço de venda", valor: formatBRL(antes.preco_pack) },
          { rotulo: "Preço de compra", valor: antes.custo_pack ? formatBRL(antes.custo_pack) : "não informado" },
          { rotulo: "Excluído por", valor: sessao.usuario.nome },
        ],
      });
    }
    revalidatePath("/", "layout");
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Não foi possível excluir o produto. Tente novamente." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  const negado = await verificarAcessoApi(); if (negado) return negado;
  const { id } = await params;
  const sessao = await obterSessao();
  const antes = await getProduto(id);
  let patch;
  try { patch = await validarProduto(await req.json()); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Dados inválidos." }, { status: 400 }); }
  try {
    const produto = await atualizarProduto(id, patch);
    if (!produto) return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
    if (sessao) {
      await registrarAuditoria({
        usuario: sessao.usuario,
        acao: "produto.editado",
        titulo: "Produto editado",
        alvo: produto.nome,
        resumo: `Preço ${formatBRL(antes?.preco_pack ?? 0)} → ${formatBRL(produto.preco_pack)}`,
        detalhes: [
          { rotulo: "Nome", valor: antes && antes.nome !== produto.nome ? `${antes.nome} → ${produto.nome}` : produto.nome },
          { rotulo: "Preço de venda", valor: `${formatBRL(antes?.preco_pack ?? 0)} → ${formatBRL(produto.preco_pack)}` },
          { rotulo: "Preço de compra", valor: `${antes?.custo_pack ? formatBRL(antes.custo_pack) : "não informado"} → ${produto.custo_pack ? formatBRL(produto.custo_pack) : "não informado"}` },
          { rotulo: "Itens por pacote", valor: antes && antes.pack_quantidade !== produto.pack_quantidade ? `${antes.pack_quantidade} → ${produto.pack_quantidade}` : String(produto.pack_quantidade) },
          { rotulo: "Alterado por", valor: sessao.usuario.nome },
        ],
      });
    }
    revalidatePath("/produtos");
    revalidatePath("/categorias");
    revalidatePath("/gerenciar-produtos");
    return NextResponse.json(produto);
  } catch {
    return NextResponse.json({ error: "Não foi possível salvar o catálogo. Tente novamente." }, { status: 500 });
  }
}

export async function GET(_req: NextRequest, { params }: Params) {
  const negado = await verificarAcessoApi(); if (negado) return negado;
  const { id } = await params;
  const produto = await getProduto(id);
  if (!produto) {
    return NextResponse.json(
      { error: "Produto não encontrado" },
      { status: 404 }
    );
  }
  return NextResponse.json(produto);
}
