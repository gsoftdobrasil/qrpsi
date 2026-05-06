import { z } from "zod";

export const statusPesquisaEnum = z.enum([
  "RASCUNHO",
  "ABERTA",
  "ENCERRADA",
  "CANCELADA",
]);

export const createPesquisaSchema = z.object({
  empresaId: z.number().int().positive(),
  titulo: z.string().min(2).max(200),
  dataPesquisa: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: statusPesquisaEnum.optional().default("ABERTA"),
});

export const updatePesquisaSchema = z.object({
  titulo: z.string().min(2).max(200).optional(),
  dataPesquisa: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: statusPesquisaEnum.optional(),
});

export const patchStatusSchema = z.object({
  status: statusPesquisaEnum,
});
