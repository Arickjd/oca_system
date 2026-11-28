import { obterSessao, verificarAcessoApi } from "@/lib/auth-servidor";
import { NextRequest, NextResponse } from "next/server";
import { getCliente, getPedido, excluirPedido, finalizarPagamento, editarPedido, registrarPagamentoParcial, registrarAuditoria, EdicaoInvalida, PagamentoInvalido } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { revalidarHistorico } from "@/lib/revalidarHistorico";
import type { FormaPagamento } from "@/lib/types";
import { formatBRL } from "@/lib/format";
import { valorPago, valorRestante } from "@/lib/pagamentos";
import { dataCurta, formasPagamento } from "@/lib/periodoOrcamentos";
import { alvoDoPedido } from "@/lib/auditoria";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const negado = await verificarAcessoApi(); if (negado) return negado;
  const { id } = await params;
  const sessao = await obterSessao();
  const admin = sessao?.usuario.papel === "admin";
  const antes = await getPedido(id);
  try {
    const body = await req.json().catch(() => null);
    if (body && typeof body === "object" && typeof body.cliente_id === "string" && body.cliente_id.trim()) {
      const cliente = await getCliente(body.cliente_id.trim());
      if (!cliente) return NextResponse.json({ error: "O cliente selecionado não existe mais. Escolha outro ou digite apenas o nome." }, { status: 400 });
      if (typeof body.cliente_nome !== "string" || !body.cliente_nome.trim()) body.cliente_nome = cliente.nome;
    }
    const pedido = await editarPedido(id, body, admin);
    if (!pedido) {
      if (!admin && (await getPedido(id))?.status_pagamento === "finalizado") {
        return NextResponse.json({ error: "Apenas o administrador pode editar vendas." }, { status: 403 });
      }
      return NextResponse.json({ error: "O registro foi alterado, efetivado ou excluído. Recarregue a página antes de continuar." }, { status: 409 });
    }
    if (sessao) {
      await registrarAuditoria({
        usuario: sessao.usuario,
        acao: "pedido.editado",
        titulo: "Orçamento editado",
        alvo: alvoDoPedido(pedido),
        resumo: `Total ${formatBRL(antes?.valor_total ?? 0)} → ${formatBRL(pedido.valor_total)}`,
        detalhes: [
          { rotulo: "Cliente", valor: antes && antes.cliente_nome !== pedido.cliente_nome ? `${antes.cliente_nome || "não informado"} → ${pedido.cliente_nome || "não informado"}` : pedido.cliente_nome || "não informado" },
          { rotulo: "Total", valor: `${formatBRL(antes?.valor_total ?? 0)} → ${formatBRL(pedido.valor_total)}` },
          { rotulo: "Produtos", valor: `${antes?.itens.length ?? 0} → ${pedido.itens.length}` },
          { rotulo: "Alterado por", valor: sessao.usuario.nome },
        ],
      });
    }
    revalidarHistorico();
    revalidatePath(`/orcamento/${id}`);
    revalidatePath(`/orcamento/${id}/editar`);
    return NextResponse.json({ id: pedido.id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof EdicaoInvalida ? error.message : "Não foi possível salvar o orçamento. Tente novamente." }, { status: error instanceof EdicaoInvalida ? 400 : 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const negado = await verificarAcessoApi(); if (negado) return negado;
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Entre novamente." }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  if (!Number.isSafeInteger(body.revisao) || body.revisao < 0) return NextResponse.json({ error: "Atualize a página antes de confirmar o pagamento." }, { status: 400 });
  const quem = { id: sessao.usuario.id, nome: sessao.usuario.nome };
  const antes = await getPedido(id);
  try {
    if (body.pagamento_parcial !== undefined) {
      const pedido = await registrarPagamentoParcial(id, body.pagamento_parcial, quem, body.revisao);
      if (!pedido) {
        const existe = await getPedido(id);
        return NextResponse.json({ error: existe ? "Este orçamento foi alterado ou já foi finalizado. Atualize a página e confira o valor." : "Orçamento não encontrado." }, { status: existe ? 409 : 404 });
      }
      const info = body.pagamento_parcial as { valor?: number; forma_pagamento?: FormaPagamento };
      const valor = Number(info.valor);
      const forma = info.forma_pagamento as FormaPagamento;
      await registrarAuditoria({
        usuario: quem,
        acao: "pagamento.parcial",
        titulo: "Recebimento parcial",
        alvo: alvoDoPedido(pedido),
        resumo: `${formatBRL(valor)} via ${formasPagamento[forma]} · falta ${formatBRL(valorRestante(pedido))}`,
        detalhes: [
          { rotulo: "Cliente", valor: pedido.cliente_nome || "não informado" },
          { rotulo: "Valor recebido", valor: formatBRL(valor) },
          { rotulo: "Forma", valor: formasPagamento[forma] },
          { rotulo: "Total do orçamento", valor: formatBRL(pedido.valor_total) },
          { rotulo: "Já pago", valor: formatBRL(valorPago(pedido)) },
          { rotulo: "Falta receber", valor: formatBRL(valorRestante(pedido)) },
          { rotulo: "Lembrete", valor: pedido.previsao_recebimento ? dataCurta(pedido.previsao_recebimento) : "sem lembrete" },
        ],
      });
      revalidarHistorico();
      revalidatePath(`/orcamento/${id}`);
      revalidatePath("/orcamentos");
      revalidatePath("/orcamentos/recebimento-parcial");
      revalidatePath("/home");
      return NextResponse.json({ status_pagamento: pedido.status_pagamento, valor_pago: pedido.valor_pago, previsao_recebimento: pedido.previsao_recebimento });
    }
    if (!["pix", "cartao", "dinheiro"].includes(body.forma_pagamento)) {
      return NextResponse.json({ error: "Selecione Pix, cartão ou dinheiro." }, { status: 400 });
    }
    const pedido = await finalizarPagamento(id, body.forma_pagamento as FormaPagamento, body.revisao, quem);
    if (!pedido) {
      const existe = await getPedido(id);
      return NextResponse.json({ error: existe ? "Este orçamento foi alterado ou já foi finalizado. Atualize a página e confira o valor." : "Orçamento não encontrado." }, { status: existe ? 409 : 404 });
    }
    const forma = body.forma_pagamento as FormaPagamento;
    const pagoAntes = antes ? valorPago(antes) : 0;
    const eraParcial = antes?.status_pagamento === "parcial";
    const recebidoAgora = Math.max(0, Math.round((pedido.valor_total - pagoAntes) * 100) / 100);
    await registrarAuditoria({
      usuario: quem,
      acao: eraParcial ? "pagamento.quitacao" : "pagamento.total",
      titulo: eraParcial ? "Recebimento quitado" : "Venda efetivada",
      alvo: alvoDoPedido(pedido),
      resumo: `${formatBRL(recebidoAgora)} via ${formasPagamento[forma]}`,
      detalhes: [
        { rotulo: "Cliente", valor: pedido.cliente_nome || "não informado" },
        { rotulo: "Total", valor: formatBRL(pedido.valor_total) },
        { rotulo: "Forma", valor: formasPagamento[forma] },
        ...(eraParcial ? [
          { rotulo: "Já recebido antes", valor: formatBRL(pagoAntes) },
          { rotulo: "Recebido agora", valor: formatBRL(recebidoAgora) },
        ] : []),
        { rotulo: "Confirmado por", valor: sessao.usuario.nome },
      ],
    });
    revalidarHistorico();
    revalidatePath(`/orcamento/${id}`);
    revalidatePath("/orcamentos");
    revalidatePath("/orcamentos/recebimento-parcial");
    revalidatePath("/home");
    return NextResponse.json({ status_pagamento: pedido.status_pagamento, forma_pagamento: pedido.forma_pagamento });
  } catch (error) {
    if (error instanceof PagamentoInvalido) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: "Não foi possível concluir o pagamento. Tente novamente." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const negado = await verificarAcessoApi(); if (negado) return negado;
  const { id } = await params;
  const sessao = await obterSessao();
  const admin = sessao?.usuario.papel === "admin";
  const antes = await getPedido(id);
  try {
    if (!await excluirPedido(id, admin)) {
      if (!admin && (await getPedido(id))?.status_pagamento === "finalizado") {
        return NextResponse.json({ error: "Apenas o administrador pode excluir vendas." }, { status: 403 });
      }
      return NextResponse.json({ error: "Orçamento não encontrado." }, { status: 404 });
    }
    if (sessao && antes) {
      await registrarAuditoria({
        usuario: sessao.usuario,
        acao: antes.status_pagamento === "finalizado" ? "venda.excluida" : "pedido.excluido",
        titulo: antes.status_pagamento === "finalizado" ? "Venda excluída" : "Orçamento excluído",
        alvo: alvoDoPedido(antes),
        resumo: `${formatBRL(antes.valor_total)} · ${antes.cliente_nome || "cliente não informado"}`,
        detalhes: [
          { rotulo: "Cliente", valor: antes.cliente_nome || "não informado" },
          { rotulo: "Total", valor: formatBRL(antes.valor_total) },
          { rotulo: "Situação", valor: antes.status_pagamento === "finalizado" ? "venda finalizada" : antes.status_pagamento === "parcial" ? "recebimento parcial" : "em aberto" },
          { rotulo: "Excluído por", valor: sessao.usuario.nome },
        ],
      });
    }
    revalidarHistorico();
    revalidatePath(`/orcamento/${id}`);
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Não foi possível excluir o orçamento. Tente novamente." }, { status: 500 });
  }
}

export async function GET(_req: NextRequest, { params }: Params) {
  const negado = await verificarAcessoApi(); if (negado) return negado;
  const { id } = await params;
  const pedido = await getPedido(id);
  if (!pedido) {
    return NextResponse.json(
      { error: "Pedido não encontrado" },
      { status: 404 }
    );
  }
  // A consulta individual acompanha o documento do cliente, sem dados internos.
  const { lucro_bruto: _lucro, ...publico } = pedido;
  return NextResponse.json({ ...publico, itens: pedido.itens.map(({ custo_unitario: _custo, ...item }) => item) });
}
