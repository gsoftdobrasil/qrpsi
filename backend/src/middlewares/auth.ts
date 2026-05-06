import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
type AccessDecoded = {
  sub: number | string;
  email: string;
  nome: string;
  tipo?: string;
};
import { AppError } from "../utils/AppError";

export function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    next(new AppError(401, "Token não informado"));
    return;
  }

  const token = header.slice(7);
  try {
    const decoded = jwt.verify(
      token,
      env.JWT_ACCESS_SECRET
    ) as AccessDecoded;
    if (decoded.tipo !== "access") {
      next(new AppError(401, "Token inválido"));
      return;
    }
    const sub =
      typeof decoded.sub === "string"
        ? Number.parseInt(decoded.sub, 10)
        : Number(decoded.sub);
    req.user = {
      sub,
      email: decoded.email,
      nome: decoded.nome,
    };
    next();
  } catch {
    next(new AppError(401, "Token inválido ou expirado"));
  }
}
