import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fixa a raiz do projeto (há outro package-lock.json em C:\Users\aryck).
  outputFileTracingRoot: __dirname,
  eslint: {
    // Não bloquear o build por lint; o MVP prioriza funcionamento.
    ignoreDuringBuilds: true,
  },
  // O checkout foi incorporado ao carrinho; links antigos continuam funcionando.
  async redirects() {
    return [
      { source: "/checkout", destination: "/carrinho", permanent: true },
      // Nomes antigos dos ícones de produto (arquivos renomeados).
      { source: "/icons/produtos/marmita.jpeg", destination: "/icons/produtos/embalagem_fechada.jpeg", permanent: false },
      { source: "/icons/produtos/embalagem.jpeg", destination: "/icons/produtos/pacote.jpeg", permanent: false },
      { source: "/icons/produtos/embalagens_delivery.png", destination: "/icons/produtos/embalagens.png", permanent: false },
      { source: "/icons/produtos/pacote_garrafa_6.jpeg", destination: "/icons/produtos/pacote_garrafas.jpeg", permanent: false },
      { source: "/icons/produtos/pacote_lata_6.jpeg", destination: "/icons/produtos/pacote_latas.jpeg", permanent: false },
    ];
  },
};

export default nextConfig;
