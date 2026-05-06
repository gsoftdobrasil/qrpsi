import { z } from "zod";

export const responderSchema = z
  .object({
    nomeRespondente: z.union([z.string().max(150), z.literal("")]).optional(),
    departamento: z.union([z.string().max(150), z.literal("")]).optional(),
    respostas: z.array(
      z.object({
        perguntaId: z.number().int().positive(),
        resposta: z.boolean(),
      })
    ),
  })
  .refine((v) => v.respostas.length === 39, {
    message: "É necessário responder às 39 perguntas",
  })
  .refine(
    (v) => new Set(v.respostas.map((r) => r.perguntaId)).size === v.respostas.length,
    { message: "Perguntas duplicadas ou incompletas" }
  );
