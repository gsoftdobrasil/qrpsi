import { Router } from "express";
import { ZodError } from "zod";
import { authMiddleware } from "../../middlewares/auth";
import { loginSchema, refreshSchema } from "./auth.schemas";
import * as authService from "./auth.service";

export const authRouter = Router();

authRouter.post("/login", async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const result = await authService.login(body.emailOuNome, body.senha);
    res.json(result);
  } catch (e) {
    next(e instanceof ZodError ? e : e);
  }
});

authRouter.post("/refresh", async (req, res, next) => {
  try {
    const body = refreshSchema.parse(req.body);
    const result = await authService.refresh(body.refreshToken);
    res.json(result);
  } catch (e) {
    next(e instanceof ZodError ? e : e);
  }
});

authRouter.post("/logout", authMiddleware, async (req, res, next) => {
  try {
    await authService.logout(req.user!.sub);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

authRouter.get("/me", authMiddleware, async (req, res, next) => {
  try {
    const user = await authService.me(req.user!.sub);
    res.json(user);
  } catch (e) {
    next(e);
  }
});
