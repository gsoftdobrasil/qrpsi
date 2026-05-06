import bcrypt from "bcrypt";
import { db } from "../../config/database";
import { AppError } from "../../utils/AppError";

export async function list() {
  return db("Usuarios")
    .where({ Ativo: true })
    .orderBy("Nome", "asc")
    .select("Id", "Nome", "Email", "CreatedAt");
}

export async function create(data: {
  nome: string;
  email: string;
  senha: string;
}) {
  const exists = await db("Usuarios")
    .whereRaw("LOWER(Email) = LOWER(?)", [data.email])
    .first();

  if (exists) {
    throw new AppError(409, "E-mail já cadastrado");
  }

  const senhaHash = await bcrypt.hash(data.senha, 10);

  const inserted = await db("Usuarios")
    .insert({
      Nome: data.nome,
      Email: data.email.trim().toLowerCase(),
      SenhaHash: senhaHash,
      Ativo: true,
      CreatedAt: db.fn.now(),
    })
    .returning(["Id"]);

  const row = inserted[0] as { Id: number } | undefined;
  if (!row?.Id) {
    throw new Error("Falha ao criar usuário");
  }

  const u = await db("Usuarios")
    .where({ Id: row.Id })
    .select("Id", "Nome", "Email", "CreatedAt")
    .first();

  return u;
}
