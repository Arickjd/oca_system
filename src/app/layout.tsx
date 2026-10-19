import type { Metadata, Viewport } from "next";
import "./globals.css";
import { CartProvider } from "@/lib/cart";

export const metadata: Metadata = {
  title: "OCA Distribuidora",
  description: "Monte pedidos no atacado e gere orçamentos — OCA Distribuidora",
};

export const viewport: Viewport = {
  themeColor: "#111827",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
