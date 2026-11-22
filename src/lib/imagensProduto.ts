// Ícones predefinidos dos produtos (arquivos em public/icons/produtos).
export const IMAGEM_PADRAO = "/icons/produtos/padrao.png";

export const IMAGENS_PRODUTO = [
  { arquivo: "caixa.jpeg", rotulo: "Caixa" },
  { arquivo: "caixa_pizza.jpeg", rotulo: "Caixa de pizza" },
  { arquivo: "copo.jpeg", rotulo: "Copo" },
  { arquivo: "doces.jpeg", rotulo: "Doces" },
  { arquivo: "pacote.jpeg", rotulo: "Pacote" },
  { arquivo: "embalagens.png", rotulo: "Embalagens" },
  { arquivo: "galao.jpeg", rotulo: "Galão" },
  { arquivo: "garrafa.jpeg", rotulo: "Garrafa" },
  { arquivo: "garrafa_vidro.jpeg", rotulo: "Garrafa de vidro" },
  { arquivo: "grade_garrafa.jpeg", rotulo: "Grade" },
  { arquivo: "lata.jpeg", rotulo: "Lata" },
  { arquivo: "embalagem_fechada.jpeg", rotulo: "Embalagem fechada" },
  { arquivo: "marmita_unidade.png", rotulo: "Marmita unidade" },
  { arquivo: "marmita_atacado.png", rotulo: "Marmita atacado" },
  { arquivo: "pacote_garrafas.jpeg", rotulo: "Pacote de garrafas" },
  { arquivo: "pacote_latas.jpeg", rotulo: "Pacote de latas" },
  { arquivo: "pote.jpeg", rotulo: "Pote" },
  { arquivo: "rolos.jpeg", rotulo: "Rolos" },
  { arquivo: "sacola.jpeg", rotulo: "Sacola" },
  { arquivo: "pacote_sacola.png", rotulo: "Pacote de sacolas" },
  { arquivo: "sacola_papel.jpeg", rotulo: "Sacola de papel" },
] as const;

export function urlDoIcone(arquivo: string): string {
  return `/icons/produtos/${arquivo}`;
}

const PERMITIDAS = new Set<string>(IMAGENS_PRODUTO.map(icone => urlDoIcone(icone.arquivo)));

// Nomes antigos de arquivo continuam válidos para produtos que já salvaram esse valor.
const ALIASES: Record<string, string> = {
  "/icons/produtos/marmita.jpeg": "/icons/produtos/embalagem_fechada.jpeg",
  "/icons/produtos/embalagem.jpeg": "/icons/produtos/pacote.jpeg",
  "/icons/produtos/embalagens_delivery.png": "/icons/produtos/embalagens.png",
  "/icons/produtos/pacote_garrafa_6.jpeg": "/icons/produtos/pacote_garrafas.jpeg",
  "/icons/produtos/pacote_lata_6.jpeg": "/icons/produtos/pacote_latas.jpeg",
};

function canonicar(url: string): string {
  return ALIASES[url] ?? url;
}

// Produto sem ícone (inclusive os cadastrados antes deste recurso) usa o padrão.
export function imagemDoProduto(produto: { imagem_url?: string | null }): string {
  const url = canonicar((produto.imagem_url ?? "").trim());
  return url || IMAGEM_PADRAO;
}

// Aceita vazio (padrão) ou um dos ícones predefinidos; evita URLs arbitrárias.
export function normalizarImagem(valor: unknown): string {
  if (typeof valor !== "string") throw new Error("Ícone inválido.");
  const url = canonicar(valor.trim());
  if (!url) return "";
  if (!PERMITIDAS.has(url)) throw new Error("Escolha um ícone da lista.");
  return url;
}
