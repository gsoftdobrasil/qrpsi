import bcrypt from "bcrypt";
import jwt, { type Secret, type SignOptions } from "jsonwebtoken";
import { db } from "../../config/database";
import { env } from "../../config/env";
import { AppError } from "../../utils/AppError";

type UsuarioRow = {
  Id: number;
  Nome: string;
  Email: string;
  SenhaHash: string;
  Ativo: boolean;
  RefreshToken: string | null;
};

const signOptsAccess: SignOptions = {
  expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions["expiresIn"],
};

const signOptsRefresh: SignOptions = {
  expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions["expiresIn"],
};

function signAccessToken(user: UsuarioRow): string {
  return jwt.sign(
    {
      sub: user.Id,
      email: user.Email,
      nome: user.Nome,
      tipo: "access",
    },
    env.JWT_ACCESS_SECRET as Secret,
    signOptsAccess
  );
}

function signRefreshToken(userId: number): string {
  return jwt.sign(
    { sub: userId, tipo: "refresh" },
    env.JWT_REFRESH_SECRET as Secret,
    signOptsRefresh
  );
}

export async function login(emailOuNome: string, senha: string) {
  const termo = emailOuNome.trim();
  const usuario = await db<UsuarioRow>("Usuarios")
    .where(function () {
      this.whereRaw("LOWER(Email) = LOWER(?)", [termo]).orWhereRaw(
        "LOWER(Nome) = LOWER(?)",
        [termo]
      );
    })
    .first();

  if (!usuario || !usuario.Ativo) {
    throw new AppError(401, "Credenciais inválidas");
  }

  const ok = await bcrypt.compare(senha, usuario.SenhaHash);
  if (!ok) {
    throw new AppError(401, "Credenciais inválidas");
  }

  const accessToken = signAccessToken(usuario);
  const refreshToken = signRefreshToken(usuario.Id);

  await db("Usuarios").where({ Id: usuario.Id }).update({
    RefreshToken: refreshToken,
    UpdatedAt: db.fn.now(),
  });

  return {
    accessToken,
    refreshToken,
    usuario: {
      id: usuario.Id,
      nome: usuario.Nome,
      email: usuario.Email,
    },
  };
}

type RefreshDecoded = {
  sub: number | string;
  tipo?: string;
};

export async function refresh(refreshToken: string) {
  let decoded: RefreshDecoded;
  try {
    decoded = jwt.verify(
      refreshToken,
      env.JWT_REFRESH_SECRET
    ) as RefreshDecoded;
  } catch {
    throw new AppError(401, "Refresh token inválido");
  }

  if (decoded.tipo !== "refresh") {
    throw new AppError(401, "Refresh token inválido");
  }

  const userId =
    typeof decoded.sub === "string"
      ? Number.parseInt(decoded.sub, 10)
      : decoded.sub;

  const usuario = await db<UsuarioRow>("Usuarios")
    .where({ Id: userId })
    .first();

  if (
    !usuario ||
    !usuario.Ativo ||
    !usuario.RefreshToken ||
    usuario.RefreshToken !== refreshToken
  ) {
    throw new AppError(401, "Sessão inválida");
  }

  const accessToken = signAccessToken(usuario);
  const newRefresh = signRefreshToken(usuario.Id);

  await db("Usuarios").where({ Id: usuario.Id }).update({
    RefreshToken: newRefresh,
    UpdatedAt: db.fn.now(),
  });

  return {
    accessToken,
    refreshToken: newRefresh,
    usuario: {
      id: usuario.Id,
      nome: usuario.Nome,
      email: usuario.Email,
    },
  };
}

export async function logout(userId: number) {
  await db("Usuarios").where({ Id: userId }).update({
    RefreshToken: null,
    UpdatedAt: db.fn.now(),
  });
}

export async function me(userId: number) {
  const usuario = await db<UsuarioRow>("Usuarios")
    .where({ Id: userId })
    .first();

  if (!usuario || !usuario.Ativo) {
    throw new AppError(404, "Usuário não encontrado");
  }

  return {
    id: usuario.Id,
    nome: usuario.Nome,
    email: usuario.Email,
  };
}
