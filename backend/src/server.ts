import cors from "cors";
import express from "express";
import helmet from "helmet";
import pino from "pino";
import pinoHttp from "pino-http";
import { env } from "./config/env";
import { authMiddleware } from "./middlewares/auth";
import { errorHandler } from "./middlewares/errorHandler";
import { authRouter } from "./modules/auth/auth.routes";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes";
import { empresasRouter } from "./modules/empresas/empresas.routes";
import { pesquisasRouter } from "./modules/pesquisas/pesquisas.routes";
import { publicRouter } from "./modules/public/public.routes";
import { usuariosRouter } from "./modules/usuarios/usuarios.routes";

const logger = pino({
  level: env.NODE_ENV === "development" ? "debug" : "info",
  transport:
    env.NODE_ENV === "development"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
});

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(
  cors({
    origin: env.frontendOrigins,
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(
  pinoHttp({
    logger,
    autoLogging: true,
  })
);

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRouter);
app.use("/api/public", publicRouter);

const protectedApi = express.Router();
protectedApi.use(authMiddleware);
protectedApi.use("/empresas", empresasRouter);
protectedApi.use("/pesquisas", pesquisasRouter);
protectedApi.use("/dashboard", dashboardRouter);
protectedApi.use("/usuarios", usuariosRouter);

app.use("/api", protectedApi);

app.use(errorHandler);

app.listen(env.PORT, () => {
  logger.info(`API QRPSI em http://localhost:${env.PORT}`);
});
