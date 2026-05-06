import { z } from "zod";

export const loginSchema = z.object({
  emailOuNome: z.string().min(1, "Informe e-mail ou nome de usuário"),
  senha: z.string().min(1, "Informe a senha"),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});
