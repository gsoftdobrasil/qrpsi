import { Router } from "express";
import { ZodError } from "zod";
import {
  createPesquisaSchema,
  patchStatusSchema,
  updatePesquisaSchema,
} from "./pesquisas.schemas";
import * as pesquisasService from "./pesquisas.service";

export const pesquisasRouter = Router();

pesquisasRouter.get("/", async (_req, res, next) => {
  try {
    const rows = await pesquisasService.list();
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

pesquisasRouter.get("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }
    const data = await pesquisasService.getById(id);
    res.json(data);
  } catch (e) {
    next(e);
  }
});

pesquisasRouter.get("/:id/resumo", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }
    const data = await pesquisasService.getResumo(id);
    res.json(data);
  } catch (e) {
    next(e);
  }
});

pesquisasRouter.get("/:id/resultados-perguntas", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }
    const data = await pesquisasService.resultadosPerguntas(id);
    res.json(data);
  } catch (e) {
    next(e);
  }
});

pesquisasRouter.get("/:id/resultados-temas", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }
    const data = await pesquisasService.resultadosTemas(id);
    res.json(data);
  } catch (e) {
    next(e);
  }
});

pesquisasRouter.get("/:id/resultados-departamentos", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }
    const data = await pesquisasService.resultadosDepartamentos(id);
    res.json(data);
  } catch (e) {
    next(e);
  }
});

pesquisasRouter.post("/", async (req, res, next) => {
  try {
    const body = createPesquisaSchema.parse(req.body);
    const data = await pesquisasService.create({
      empresaId: body.empresaId,
      titulo: body.titulo,
      dataPesquisa: body.dataPesquisa,
      status: body.status,
    });
    res.status(201).json(data);
  } catch (e) {
    next(e instanceof ZodError ? e : e);
  }
});

pesquisasRouter.put("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }
    const body = updatePesquisaSchema.parse(req.body);
    const data = await pesquisasService.update(id, body);
    res.json(data);
  } catch (e) {
    next(e instanceof ZodError ? e : e);
  }
});

pesquisasRouter.patch("/:id/status", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }
    const body = patchStatusSchema.parse(req.body);
    const data = await pesquisasService.patchStatus(id, body.status);
    res.json(data);
  } catch (e) {
    next(e instanceof ZodError ? e : e);
  }
});
