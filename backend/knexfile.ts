import "dotenv/config";
import type { Knex } from "knex";

const connection = {
  server: process.env.DB_HOST ?? "localhost",
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 1433,
  user: process.env.DB_USER ?? "",
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME ?? "",
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
