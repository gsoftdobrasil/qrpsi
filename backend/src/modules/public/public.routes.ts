import { Router } from "express";
import { ZodError } from "zod";
import { responderSchema } from "./public.schemas";
import * as publicService from "./public.service";

export const publicRouter = Router();

publicRouter.get("/pesquisas/:uuidLink", async (req, res, next) => {
  try {
    const { uuidLink } = req.params;
    const data = await publicService.getPesquisaPublica(uuidLink);
    if (!data) {
      res.status(404).json({ error: "Pesquisa não encontrada" });
      return;
    }
    res.json(data);
  } catch (e) {
    next(e);
  }
});

publicRouter.get(
  "/pesquisas/:uuidLink/departamentos",
  async (req, res, next) => {
    try {
      const { uuidLink } = req.params;
      const empresaId = await publicService.getEmpresaIdPorUuid(uuidLink);
      if (empresaId === null) {
        res.status(404).json({ error: "Pesquisa não encontrada" });
        return;
      }
      const deps = await publicService.listDepartamentosEmpresa(empresaId);
      res.json(deps);
    } catch (e) {
      next(e);
    }
  }
);

publicRouter.post(
  "/pesquisas/:uuidLink/responder",
  async (req, res, next) => {
    try {
      const { uuidLink } = req.params;
      const body = responderSchema.parse(req.body);
      await publicService.registrarResposta(uuidLink, {
        nomeRespondente: body.nomeRespondente,
        departamento: body.departamento,
        respostas: body.respostas,
      });
      res.status(201).json({ message: "Resposta registrada com sucesso" });
    } catch (e) {
      next(e instanceof ZodError ? e : e);
    }
  }
);
