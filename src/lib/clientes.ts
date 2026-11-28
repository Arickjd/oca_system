import { textoCombina } from "./busca";
import type { Cliente } from "./types";

export class ClienteInvalido extends Error {}

export interface DadosCliente {
  nome: string;
  telefone: string;
  documento: string;
  observacao: string;
}

export function validarDadosCliente(body: unknown): DadosCliente {
  if (!body || typeof body !== "object") throw new ClienteInvalido("Dados inválidos.");
  const b = body as Record<string, unknown>;
  const texto = (valor: unknown) => typeof valor === "string" ? valor.trim().replace(/\s+/g, " ") : "";
  const nome = texto(b.nome);
  const telefone = texto(b.telefone);
  const documento = texto(b.documento);
  const observacao = typeof b.observacao === "string" ? b.observacao.trim() : "";

  if (!nome) throw new ClienteInvalido("Informe o nome do cliente.");
  if (nome.length > 120) throw new ClienteInvalido("O nome deve ter até 120 caracteres.");
  if (telefone.length > 30) throw new ClienteInvalido("O telefone deve ter até 30 caracteres.");
  if (documento.length > 20) throw new ClienteInvalido("O documento deve ter até 20 caracteres.");
  if (observacao.length > 500) throw new ClienteInvalido("A observação deve ter até 500 caracteres.");
  return { nome, telefone, documento, observacao };
}

export function clienteCombina(cliente: Pick<Cliente, "nome" | "telefone" | "documento">, consulta: string) {
  const texto = `${cliente.nome} ${cliente.telefone} ${cliente.documento ?? ""}`;
  if (textoCombina(texto, consulta)) return true;
  // CPF/telefone digitados sem pontuação também encontram o cadastro.
  if (/[a-z]/i.test(consulta)) return false;
  const digitos = consulta.replace(/\D/g, "");
  if (digitos.length < 3) return false;
  return `${cliente.telefone} ${cliente.documento ?? ""}`.replace(/\D/g, "").includes(digitos);
}
