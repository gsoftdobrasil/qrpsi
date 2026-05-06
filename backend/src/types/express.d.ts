import type { JwtPayload } from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      user?: {
        sub: number;
        email: string;
        nome: string;
      };
    }
  }
}

export type AccessTokenPayload = JwtPayload & {
  sub: number;
  email: string;
  nome: string;
  tipo: "access";
};

export type RefreshTokenPayload = JwtPayload & {
  sub: number;
  tipo: "refresh";
};
