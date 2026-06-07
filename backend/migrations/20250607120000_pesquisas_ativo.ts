import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("Pesquisas", (table) => {
    table.boolean("Ativo").notNullable().defaultTo(true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("Pesquisas", (table) => {
    table.dropColumn("Ativo");
  });
}
