import "dotenv/config";
import type { Knex } from "knex";

function pickEnv(...keys: string[]): string | undefined {
  for (const key of keys) {
    if (process.env[key] !== undefined) {
      return process.env[key];
    }
  }
  return undefined;
}

const nodeEnv = process.env.NODE_ENV ?? "development";
const isProduction = nodeEnv === "production";
const profilePrefix = isProduction ? "PROD" : "DEV";

const profileDbHostKey = `${profilePrefix}_DB_SERVER`;
const profileDbPortKey = `${profilePrefix}_DB_PORT`;
const profileDbUserKey = `${profilePrefix}_DB_USER`;
const profileDbPasswordKey = `${profilePrefix}_DB_PASSWORD`;
const profileDbNameKey = `${profilePrefix}_DB_DATABASE`;

const connection = {
  server: pickEnv("DB_HOST", profileDbHostKey) ?? "localhost",
  port: Number(pickEnv("DB_PORT", profileDbPortKey) ?? 1433),
  user: pickEnv("DB_USER", profileDbUserKey) ?? "",
  password: pickEnv("DB_PASSWORD", profileDbPasswordKey) ?? "",
  database: pickEnv("DB_NAME", profileDbNameKey) ?? "",
  options: {
    encrypt: process.env.DB_ENCRYPT !== "false",
    trustServerCertificate: process.env.DB_TRUST_CERT === "true",
  },
} as Knex.MsSqlConnectionConfig;

const config: { [key: string]: Knex.Config } = {
  development: {
    client: "mssql",
    connection,
    migrations: {
      directory: "./migrations",
      extension: "ts",
      loadExtensions: [".ts"],
    },
    seeds: {
      directory: "./seeds",
      extension: "ts",
      loadExtensions: [".ts"],
    },
    pool: { min: 0, max: 10 },
  },
  production: {
    client: "mssql",
    connection,
    migrations: {
      directory: "./migrations",
      extension: "ts",
      loadExtensions: [".ts"],
    },
    seeds: {
      directory: "./seeds",
      extension: "ts",
      loadExtensions: [".ts"],
    },
    pool: { min: 0, max: 10 },
  },
};

export default config;
