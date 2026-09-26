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
};

export default nextConfig;
