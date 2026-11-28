import { obterSessao, verificarAcessoApi } from "@/lib/auth-servidor";
import { NextRequest, NextResponse } from "next/server";
import { getProdutos, getCategorias, getMovimentosEstoque, registrarMovimentoManual, registrarAuditoria, MovimentoInvalido } from "@/lib/db";
import { consolidarSaldos, ROTULOS_MOVIMENTO } from "@/lib/estoque";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

// Saldos por produto + histórico recente de movimentações (filtrável por produto).
export async function GET(req: NextRequest) {
  const negado = await verificarAcessoApi(); if (negado) return negado;
  const url = new URL(req.url);
  const produtoId = url.searchParams.get("produto") || undefined;
  const limiteBruto = Number(url.searchParams.get("limite"));
  const limite = Number.isFinite(limiteBruto) && limiteBruto > 0 ? limiteBruto : 50;
  const antes = url.searchParams.get("antes") || undefined;
  const [produtos, categorias, movimentos] = await Promise.all([
    getProdutos(), getCategorias(), getMovimentosEstoque({ produtoId, limite, antes }),
  ]);
  return NextResponse.json({
    saldos: consolidarSaldos(produtos),
    categorias,
    movimentos,
  });
}

// Entrada (compra), ajuste de inventário ou perda — somente administrador.
export async function POST(req: NextRequest) {
  const negado = await verificarAcessoApi(); if (negado) return negado;
  const sessao = await obterSessao();
  if (sessao?.usuario.papel !== "admin") {
    return NextResponse.json({ error: "Apenas o administrador pode movimentar o estoque." }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || typeof body.produto_id !== "string" || !body.produto_id) {
    return NextResponse.json({ error: "Selecione o produto." }, { status: 400 });
  }
  try {
    const resultado = await registrarMovimentoManual(body.produto_id, body, { id: sessao.usuario.id, nome: sessao.usuario.nome });
    if (!resultado) return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
    const { produto, movimento } = resultado;
    await registrarAuditoria({
      usuario: sessao.usuario,
      acao: `estoque.${movimento.tipo}`,
      titulo: ROTULOS_MOVIMENTO[movimento.tipo],
      alvo: produto.nome,
      resumo: `${movimento.quantidade > 0 ? "+" : ""}${movimento.quantidade} un · saldo ${movimento.saldo_apos} un`,
      detalhes: [
        { rotulo: "Produto", valor: produto.nome },
        { rotulo: "Movimentação", valor: `${movimento.quantidade > 0 ? "+" : ""}${movimento.quantidade} unidade(s)` },
        { rotulo: "Saldo após", valor: `${movimento.saldo_apos} unidade(s)` },
        ...(movimento.motivo ? [{ rotulo: "Motivo", valor: movimento.motivo }] : []),
        { rotulo: "Registrado por", valor: sessao.usuario.nome },
      ],
    });
    revalidatePath("/gerenciar-estoque");
    revalidatePath("/produtos");
    revalidatePath("/home");
    return NextResponse.json({ produto, movimento }, { status: 201 });
  } catch (error) {
    if (error instanceof MovimentoInvalido) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: "Não foi possível registrar a movimentação. Tente novamente." }, { status: 500 });
  }
}
