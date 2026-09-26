import { redirect } from "next/navigation";
import { estaAutenticado } from "@/lib/auth";
import { AdminNav } from "@/components/admin/AdminNav";

export const dynamic = "force-dynamic";

export default async function PainelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await estaAutenticado())) {
    redirect("/admin/login");
  }
  return (
    <div className="min-h-dvh bg-slate-100">
      <AdminNav />
      <main className="max-w-4xl mx-auto px-3 py-5">{children}</main>
    </div>
  );
}
