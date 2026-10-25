export const USUARIOS = [
  { id: "jardel", nome: "Jardel" },
  { id: "jairo", nome: "Jairo" },
  { id: "gisele", nome: "Gisele" },
  { id: "keylane", nome: "Keylane" },
] as const;

export type Usuario = (typeof USUARIOS)[number];
export function buscarUsuario(id: unknown): Usuario | undefined {
  return USUARIOS.find(usuario => usuario.id === id);
}
