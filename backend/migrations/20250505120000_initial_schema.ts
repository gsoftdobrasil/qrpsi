import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("Usuarios", (table) => {
    table.increments("Id").primary();
    table.string("Nome", 150).notNullable();
    table.string("Email", 150).notNullable().unique();
    table.string("SenhaHash", 255).notNullable();
    table.text("RefreshToken").nullable();
    table.boolean("Ativo").notNullable().defaultTo(true);
    table.dateTime("CreatedAt").notNullable().defaultTo(knex.fn.now());
    table.dateTime("UpdatedAt").nullable();
  });

  await knex.schema.createTable("Empresas", (table) => {
    table.increments("Id").primary();
    table
      .specificType("Uuid", "uniqueidentifier")
      .notNullable()
      .defaultTo(knex.raw("NEWID()"));
    table.string("Nome", 200).notNullable();
    table.string("Cnpj", 20).nullable();
    table.boolean("Ativo").notNullable().defaultTo(true);
    table.dateTime("CreatedAt").notNullable().defaultTo(knex.fn.now());
    table.dateTime("UpdatedAt").nullable();
    table.unique(["Uuid"], "UQ_Empresas_Uuid");
  });

  await knex.schema.createTable("TemasPerguntas", (table) => {
    table.increments("Id").primary();
    table.integer("Ordem").notNullable();
    table.string("Nome", 200).notNullable();
    table.boolean("Ativo").notNullable().defaultTo(true);
  });

  await knex.schema.createTable("Perguntas", (table) => {
    table.increments("Id").primary();
    table
      .integer("TemaId")
      .notNullable()
      .references("Id")
      .inTable("TemasPerguntas")
      .onDelete("RESTRICT");
    table.integer("Ordem").notNullable();
    table.string("Texto", 500).notNullable();
    table.boolean("Ativo").notNullable().defaultTo(true);
  });

  await knex.schema.createTable("Departamentos", (table) => {
    table.increments("Id").primary();
    table
      .integer("EmpresaId")
      .notNullable()
      .references("Id")
      .inTable("Empresas")
      .onDelete("CASCADE");
    table.string("Nome", 150).notNullable();
    table.string("NomeNormalizado", 150).notNullable();
    table.dateTime("CreatedAt").notNullable().defaultTo(knex.fn.now());
    table.unique(["EmpresaId", "NomeNormalizado"], "UQ_Departamentos_Empresa_NomeNorm");
  });

  await knex.schema.createTable("Pesquisas", (table) => {
    table.increments("Id").primary();
    table
      .specificType("UuidLink", "uniqueidentifier")
      .notNullable()
      .defaultTo(knex.raw("NEWID()"));
    table
      .integer("EmpresaId")
      .notNullable()
      .references("Id")
      .inTable("Empresas")
      .onDelete("CASCADE");
    table.string("Titulo", 200).notNullable();
    table.date("DataPesquisa").notNullable();
    table.string("Status", 20).notNullable().defaultTo("ABERTA");
    table.dateTime("CreatedAt").notNullable().defaultTo(knex.fn.now());
    table.dateTime("UpdatedAt").nullable();
    table.unique(["UuidLink"], "UQ_Pesquisas_UuidLink");
  });

  await knex.schema.createTable("PesquisasRespostas", (table) => {
    table.increments("Id").primary();
    table
      .integer("PesquisaId")
      .notNullable()
      .references("Id")
      .inTable("Pesquisas")
      .onDelete("CASCADE");
    table
      .integer("DepartamentoId")
      .nullable()
      .references("Id")
      .inTable("Departamentos");
    /* Sem onDelete: SQL Server usa NO ACTION. SET NULL aqui geraria erro 1785 com CASCADE em Pesquisa. */
    table.string("NomeRespondente", 150).nullable();
    table.string("DepartamentoInformado", 150).nullable();
    table.dateTime("DataResposta").notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("PesquisasRespostasDetalhes", (table) => {
    table.increments("Id").primary();
    table
      .integer("PesquisaRespostaId")
      .notNullable()
      .references("Id")
      .inTable("PesquisasRespostas")
      .onDelete("CASCADE");
    table
      .integer("PerguntaId")
      .notNullable()
      .references("Id")
      .inTable("Perguntas")
      .onDelete("RESTRICT");
    table.boolean("Resposta").notNullable();
    table.unique(["PesquisaRespostaId", "PerguntaId"], "UQ_RespostaDetalhe_Pergunta");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("PesquisasRespostasDetalhes");
  await knex.schema.dropTableIfExists("PesquisasRespostas");
  await knex.schema.dropTableIfExists("Pesquisas");
  await knex.schema.dropTableIfExists("Departamentos");
  await knex.schema.dropTableIfExists("Perguntas");
  await knex.schema.dropTableIfExists("TemasPerguntas");
  await knex.schema.dropTableIfExists("Empresas");
  await knex.schema.dropTableIfExists("Usuarios");
}
