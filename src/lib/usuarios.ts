export const USUARIOS = [
  { id: "jardel", nome: "Jardel", papel: "admin" },
  { id: "jairo", nome: "Jairo", papel: "operador" },
  { id: "gisele", nome: "Gisele", papel: "operador" },
  { id: "keylane", nome: "Keylane", papel: "operador" },
] as const;

export type Usuario = (typeof USUARIOS)[number];
export function buscarUsuario(id: unknown): Usuario | undefined {
  return USUARIOS.find(usuario => usuario.id === id);
}
