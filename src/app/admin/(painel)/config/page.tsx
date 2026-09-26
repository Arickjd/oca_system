import { getConfig } from "@/lib/config";
import { ConfigForm } from "@/components/admin/ConfigForm";

export const dynamic = "force-dynamic";

export default async function ConfigPage() {
  const config = await getConfig();
  return <ConfigForm config={config} />;
}
