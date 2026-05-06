import { Router } from "express";
import * as dashboardService from "./dashboard.service";

export const dashboardRouter = Router();

dashboardRouter.get("/resumo", async (_req, res, next) => {
  try {
    const data = await dashboardService.resumo();
    res.json(data);
  } catch (e) {
    next(e);
  }
});

dashboardRouter.get("/graficos", async (_req, res, next) => {
  try {
    const data = await dashboardService.graficos();
    res.json(data);
  } catch (e) {
    next(e);
  }
});
