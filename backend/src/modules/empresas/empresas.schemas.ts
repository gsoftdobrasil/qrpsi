import { z } from "zod";

export const createEmpresaSchema = z.object({
  nome: z.string().min(2).max(200),
  cnpj: z.string().max(20).optional().nullable(),
});

export const updateEmpresaSchema = createEmpresaSchema.partial();

export const listEmpresasQuerySchema = z.object({
  q: z.string().optional(),
});
