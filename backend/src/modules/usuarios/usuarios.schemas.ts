import { z } from "zod";

export const createUsuarioSchema = z.object({
  nome: z.string().min(2).max(150),
  email: z.string().email().max(150),
  senha: z.string().min(6).max(100),
});
