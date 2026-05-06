import { z } from "zod";
import "dotenv/config";

/**
 * Várias origens separadas por vírgula (útil em dev: localhost + IP na LAN para o celular).
 */
export function parseFrontendOrigins(raw: string | undefined): string[] {
  const parts = String(raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (parts.length === 0) {
    throw new Error(
      'Defina FRONTEND_URL no .env (ex.: http://localhost:5173 ou várias URLs separadas por vírgula)'
    );
  }
  for (const p of parts) {
    if (!URL.canParse(p)) {
      throw new Error(`FRONTEND_URL contém URL inválida: ${p}`);
    }
  }
  return parts;
}

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),
  DB_HOST: z.string(),
  DB_PORT: z.coerce.number().default(1433),
  DB_USER: z.string(),
  DB_PASSWORD: z.string(),
  DB_NAME: z.string(),
  DB_ENCRYPT: z
    .string()
    .optional()
    .transform((v) => v !== "false"),
  DB_TRUST_CERT: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  /** Uma ou mais origens do front (CORS), separadas por vírgula */
  FRONTEND_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
});

const parsed = schema.parse({
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_NAME: process.env.DB_NAME,
  DB_ENCRYPT: process.env.DB_ENCRYPT,
  DB_TRUST_CERT: process.env.DB_TRUST_CERT,
  FRONTEND_URL: process.env.FRONTEND_URL,
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN,
});

export const env = {
  ...parsed,
  frontendOrigins: parseFrontendOrigins(parsed.FRONTEND_URL),
};

export type Env = typeof env;
