import { obterSessao, verificarAcessoApi } from "@/lib/auth-servidor";
import { NextResponse } from "next/server";
import { getCategorias, getProdutos } from "@/lib/db";
import { getConfig } from "@/lib/config";
import { gerarProdutosPdf } from "@/lib/produtosPdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// O catálogo traz preço de compra: mesma restrição das demais telas com custo.
export async function GET() {
  const negado = await verificarAcessoApi(); if (negado) return negado;
  const sessao = await obterSessao();
  if (sessao?.usuario.papel !== "admin") {
    return NextResponse.json({ error: "Apenas o administrador pode baixar o catálogo com custos." }, { status: 403 });
  }
  try {
    const [produtos, categorias, config] = await Promise.all([getProdutos(), getCategorias(), getConfig()]);
    const pdf = gerarProdutosPdf(produtos, categorias, config.distribuidora_nome);
    const data = new Date().toISOString().slice(0, 10);
    return new Response(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="produtos-${data}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Não foi possível gerar o catálogo. Tente novamente." }, { status: 500 });
  }
}
