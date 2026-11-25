// Informação de apresentação exibida abaixo do nome do produto nos documentos.
export function descricaoPacote(pack: number | null | undefined): string | null {
  return typeof pack === "number" && pack > 1 ? `${pack} itens/pacote` : null;
}
