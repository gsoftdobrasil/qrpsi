import { Router } from "express";
import { ZodError } from "zod";
import { createUsuarioSchema } from "./usuarios.schemas";
import * as usuariosService from "./usuarios.service";

export const usuariosRouter = Router();

usuariosRouter.get("/", async (_req, res, next) => {
  try {
    const rows = await usuariosService.list();
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

usuariosRouter.post("/", async (req, res, next) => {
  try {
    const body = createUsuarioSchema.parse(req.body);
    const user = await usuariosService.create(body);
    res.status(201).json(user);
  } catch (e) {
    next(e instanceof ZodError ? e : e);
  }
});
