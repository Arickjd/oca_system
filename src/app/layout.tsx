import type { Metadata, Viewport } from "next";
import "./globals.css";
import { CartProvider } from "@/lib/cart";
import { obterSessao } from "@/lib/auth-servidor";

export const metadata: Metadata = {
  title: "Sistema OCA",
  applicationName: "Sistema OCA",
  appleWebApp: { capable: true, title: "Sistema OCA", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  description: "Monte pedidos no atacado e gere orçamentos — OCA Distribuidora",
};

export const viewport: Viewport = {
  themeColor: "#111827",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessao = await obterSessao();
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        <CartProvider key={sessao?.usuario.id ?? "visitante"} usuarioId={sessao?.usuario.id ?? null}>{children}</CartProvider>
      </body>
    </html>
  );
}
