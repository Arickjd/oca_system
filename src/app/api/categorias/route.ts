import { verificarAcessoApi, obterSessao } from "@/lib/auth-servidor";
import { NextResponse } from "next/server";
import { getCategorias, criarCategoria, registrarAuditoria } from "@/lib/db";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const negado = await verificarAcessoApi(); if (negado) return negado;
  let nome: string;
  try {
    const body = await req.json();
    if (typeof body?.nome !== "string") throw new Error();
    nome = body.nome.trim().replace(/\s+/g, " ");
    if (!nome || nome.length > 100) throw new Error();
  } catch {
    return NextResponse.json({ error: "Informe um nome de categoria com até 100 caracteres." }, { status: 400 });
  }
  try {
    const categoria = await criarCategoria(nome);
    const sessao = await obterSessao();
    if (sessao) {
      await registrarAuditoria({
        usuario: sessao.usuario,
        acao: "categoria.criada",
        titulo: "Categoria criada",
        alvo: categoria.nome,
        detalhes: [
          { rotulo: "Categoria", valor: categoria.nome },
          { rotulo: "Criada por", valor: sessao.usuario.nome },
        ],
      });
    }
    revalidatePath("/gerenciar-produtos");
    revalidatePath("/categorias");
    revalidatePath("/produtos");
    return NextResponse.json(categoria, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Não foi possível salvar a categoria. Tente novamente." }, { status: 500 });
  }
}

export async function GET() {
  const negado = await verificarAcessoApi(); if (negado) return negado;
  const cats = await getCategorias();
  return NextResponse.json(cats);
}
