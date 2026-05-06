import knex, { type Knex } from "knex";
import { env } from "./env";

/** Instância Knex para a API (mesmos parâmetros do knexfile). */
export const db: Knex = knex({
  client: "mssql",
  connection: {
    server: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    options: {
      encrypt: env.DB_ENCRYPT,
      trustServerCertificate: env.DB_TRUST_CERT,
    },
  },
  pool: { min: 0, max: 10 },
});
