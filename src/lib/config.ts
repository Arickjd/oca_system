import { readData } from "./db";
import type { Config } from "./types";

// Dados padrão da distribuidora (extraídos do logo/contato).
export const CONFIG_PADRAO: Config = {
  distribuidora_nome: "OCA Distribuidora",
  distribuidora_contato: "(89) 99427-0756",
  whatsapp: "5589994270756",
  endereco: "",
  pack_padrao: 6,
};

export async function getConfig(): Promise<Config> {
  const cfg = await readData<Partial<Config> | null>("config.json", null);
  return { ...CONFIG_PADRAO, ...(cfg || {}) };
}
