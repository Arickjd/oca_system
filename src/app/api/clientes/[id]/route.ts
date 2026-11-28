import { NextRequest, NextResponse } from "next/server";
import { obterSessao, verificarAcessoApi } from "@/lib/auth-servidor";
import { atualizarCliente, getCliente, registrarAuditoria } from "@/lib/db";
import { ClienteInvalido, validarDadosCliente } from "@/lib/clientes";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const negado = await verificarAcessoApi(); if (negado) return negado;
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Entre novamente." }, { status: 401 });
  const { id } = await params;
  try {
    const dados = validarDadosCliente(await req.json().catch(() => ({})));
    const anterior = await getCliente(id);
    if (!anterior) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
    const cliente = await atualizarCliente(id, dados);
    if (!cliente) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
    await registrarAuditoria({
      usuario: { id: sessao.usuario.id, nome: sessao.usuario.nome },
      acao: "cliente.editado",
      titulo: "Cliente editado",
      alvo: cliente.nome,
      resumo: cliente.telefone || "sem telefone",
      detalhes: [
        { rotulo: "Nome anterior", valor: anterior.nome },
        { rotulo: "Nome atual", valor: cliente.nome },
        { rotulo: "Telefone", valor: cliente.telefone || "não informado" },
        { rotulo: "Editado por", valor: sessao.usuario.nome },
      ],
    });
    return NextResponse.json(cliente);
  } catch (error) {
    if (error instanceof ClienteInvalido) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: "Não foi possível atualizar o cliente. Tente novamente." }, { status: 500 });
  }
}
