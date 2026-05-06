import { Router } from "express";
import { ZodError } from "zod";
import {
  createEmpresaSchema,
  listEmpresasQuerySchema,
  updateEmpresaSchema,
} from "./empresas.schemas";
import * as empresasService from "./empresas.service";

export const empresasRouter = Router();

empresasRouter.get("/", async (req, res, next) => {
  try {
    const q = listEmpresasQuerySchema.safeParse(req.query);
    const search = q.success ? q.data.q : undefined;
    const rows = await empresasService.list(search);
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

empresasRouter.get("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }
    const data = await empresasService.getById(id);
    res.json(data);
  } catch (e) {
    next(e);
  }
});

empresasRouter.post("/", async (req, res, next) => {
  try {
    const body = createEmpresaSchema.parse(req.body);
    const data = await empresasService.create({
      nome: body.nome,
      cnpj: body.cnpj ?? null,
    });
    res.status(201).json(data);
  } catch (e) {
    next(e instanceof ZodError ? e : e);
  }
});

empresasRouter.put("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }
    const body = updateEmpresaSchema.parse(req.body);
    const data = await empresasService.update(id, {
      nome: body.nome,
      cnpj: body.cnpj,
    });
    res.json(data);
  } catch (e) {
    next(e instanceof ZodError ? e : e);
  }
});

empresasRouter.delete("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }
    await empresasService.remove(id);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});
