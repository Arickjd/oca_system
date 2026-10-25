export interface RegistroBanco {
  colecao: string;
  id: string;
  dados: Record<string, unknown>;
}

export interface SnapshotBanco {
  registros: RegistroBanco[];
  contadores: { id: string; valor: string }[];
  gerado_em: string;
  origem: "postgres" | "local";
}
