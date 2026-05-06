/** Normaliza retorno de db.raw no driver mssql/knex. */
export function unwrapKnexRawRows<T>(rows: unknown): T[] {
  if (Array.isArray(rows)) {
    return rows as T[];
  }
  if (
    rows &&
    typeof rows === "object" &&
    "rows" in rows &&
    Array.isArray((rows as { rows: unknown }).rows)
  ) {
    return (rows as { rows: T[] }).rows;
  }
  return [];
}
