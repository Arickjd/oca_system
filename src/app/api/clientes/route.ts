import { NextRequest, NextResponse } from "next/server";
import { obterSessao, verificarAcessoApi } from "@/lib/auth-servidor";
import { criarCliente, getClientes, registrarAuditoria } from "@/lib/db";
import { ClienteInvalido, clienteCombina, validarDadosCliente } from "@/lib/clientes";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const negado = await verificarAcessoApi(); if (negado) return negado;
  const { searchParams } = new URL(req.url);
  const busca = searchParams.get("busca") ?? "";
  const limite = Math.min(50, Math.max(1, Number(searchParams.get("limite")) || 20));
  const clientes = (await getClientes()).filter(c => clienteCombina(c, busca)).slice(0, limite);
  return NextResponse.json(clientes);
}

export async function POST(req: NextRequest) {
  const negado = await verificarAcessoApi(); if (negado) return negado;
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Entre novamente." }, { status: 401 });
  try {
    const dados = validarDadosCliente(await req.json().catch(() => ({})));
    const cliente = await criarCliente({ ...dados, criado_por: { id: sessao.usuario.id, nome: sessao.usuario.nome } });
    await registrarAuditoria({
      usuario: { id: sessao.usuario.id, nome: sessao.usuario.nome },
      acao: "cliente.criado",
      titulo: "Cliente criado",
      alvo: cliente.nome,
      resumo: cliente.telefone || "sem telefone",
      detalhes: [
        { rotulo: "Nome", valor: cliente.nome },
        { rotulo: "Telefone", valor: cliente.telefone || "não informado" },
        { rotulo: "Documento", valor: cliente.documento || "não informado" },
        { rotulo: "Criado por", valor: sessao.usuario.nome },
      ],
    });
    return NextResponse.json(cliente, { status: 201 });
  } catch (error) {
    if (error instanceof ClienteInvalido) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: "Não foi possível cadastrar o cliente. Tente novamente." }, { status: 500 });
  }
}
