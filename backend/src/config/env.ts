import { z } from "zod";
import "dotenv/config";

function pickEnv(...keys: string[]): string | undefined {
  for (const key of keys) {
    if (process.env[key] !== undefined) {
      return process.env[key];
    }
  }
  return undefined;
}

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

const nodeEnv = process.env.NODE_ENV ?? "development";
const isProduction = nodeEnv === "production";
const profilePrefix = isProduction ? "PROD" : "DEV";

const profilePortKey = `${profilePrefix}_APP_PORT`;
const profileDbHostKey = `${profilePrefix}_DB_SERVER`;
const profileDbPortKey = `${profilePrefix}_DB_PORT`;
const profileDbUserKey = `${profilePrefix}_DB_USER`;
const profileDbPasswordKey = `${profilePrefix}_DB_PASSWORD`;
const profileDbNameKey = `${profilePrefix}_DB_DATABASE`;

const parsed = schema.parse({
  NODE_ENV: nodeEnv,
  PORT: pickEnv("PORT", profilePortKey),
  DB_HOST: pickEnv("DB_HOST", profileDbHostKey),
  DB_PORT: pickEnv("DB_PORT", profileDbPortKey),
  DB_USER: pickEnv("DB_USER", profileDbUserKey),
  DB_PASSWORD: pickEnv("DB_PASSWORD", profileDbPasswordKey),
  DB_NAME: pickEnv("DB_NAME", profileDbNameKey),
  DB_ENCRYPT: process.env.DB_ENCRYPT,
  DB_TRUST_CERT: process.env.DB_TRUST_CERT,
  FRONTEND_URL: process.env.FRONTEND_URL,
  JWT_ACCESS_SECRET: pickEnv("JWT_ACCESS_SECRET", "JWT_SECRET_KEY"),
  JWT_REFRESH_SECRET: pickEnv("JWT_REFRESH_SECRET", "JWT_SECRET_KEY"),
  JWT_ACCESS_EXPIRES_IN: pickEnv("JWT_ACCESS_EXPIRES_IN", "JWT_EXPIRES_IN"),
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN,
});

export const env = {
  ...parsed,
  frontendOrigins: parseFrontendOrigins(parsed.FRONTEND_URL),
};

export type Env = typeof env;
