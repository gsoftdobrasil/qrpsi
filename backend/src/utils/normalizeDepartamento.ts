/** Normaliza para comparação: trim, espaços internos e minúsculas. */
export function normalizarDepartamentoNome(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").toLowerCase();
}
