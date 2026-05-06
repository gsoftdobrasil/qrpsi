import { db } from "../../config/database";
import { AppError } from "../../utils/AppError";

export async function list(q?: string) {
  const qb = db("Empresas").where({ Ativo: true }).orderBy("Nome", "asc");
  if (q?.trim()) {
    const t = `%${q.trim()}%`;
    qb.andWhere(function () {
      this.where("Nome", "like", t).orWhere("Cnpj", "like", t);
    });
  }
  return qb.select("Id", "Uuid", "Nome", "Cnpj", "CreatedAt");
}

export async function getById(id: number) {
  const empresa = await db("Empresas")
    .where({ Id: id, Ativo: true })
    .select("Id", "Uuid", "Nome", "Cnpj", "CreatedAt", "UpdatedAt")
    .first();

  if (!empresa) {
    throw new AppError(404, "Empresa não encontrada");
  }

  const pesquisas = await db("Pesquisas as p")
    .where("p.EmpresaId", id)
    .leftJoin(
      "PesquisasRespostas as pr",
      "pr.PesquisaId",
      "p.Id"
    )
    .leftJoin(
      "PesquisasRespostasDetalhes as prd",
      "prd.PesquisaRespostaId",
      "pr.Id"
    )
    .groupBy(
      "p.Id",
      "p.UuidLink",
      "p.Titulo",
      "p.DataPesquisa",
      "p.Status",
      "p.CreatedAt"
    )
    .select(
      "p.Id",
      "p.UuidLink",
      "p.Titulo",
      "p.DataPesquisa",
      "p.Status",
      "p.CreatedAt",
      db.raw("COUNT(DISTINCT pr.Id) as totalRespondentes"),
      db.raw(
        "ISNULL(SUM(CASE WHEN prd.Resposta = 1 THEN 1 ELSE 0 END),0) as totalSim"
      ),
      db.raw(
        "ISNULL(SUM(CASE WHEN prd.Resposta = 0 THEN 1 ELSE 0 END),0) as totalNao"
      )
    )
    .orderBy("p.DataPesquisa", "desc")
    .orderBy("p.Id", "desc");

  const enriched = pesquisas.map((row: Record<string, unknown>) => {
    const sim = Number(row.totalSim ?? 0);
    const nao = Number(row.totalNao ?? 0);
    const totalResp = sim + nao;
    const pctSim = totalResp > 0 ? (sim / totalResp) * 100 : 0;
    return {
      id: row.Id,
      uuidLink: row.UuidLink,
      titulo: row.Titulo,
      dataPesquisa: row.DataPesquisa,
      status: row.Status,
      createdAt: row.CreatedAt,
      totalRespondentes: Number(row.totalRespondentes ?? 0),
      totalSim: sim,
      totalNao: nao,
      percentualSim: Math.round(pctSim * 100) / 100,
    };
  });

  return { empresa, pesquisas: enriched };
}

export async function create(data: { nome: string; cnpj?: string | null }) {
  const inserted = await db("Empresas")
    .insert({
      Nome: data.nome,
      Cnpj: data.cnpj ?? null,
      Ativo: true,
      CreatedAt: db.fn.now(),
    })
    .returning(["Id"]);

  const row = inserted[0] as { Id: number } | undefined;
  if (!row?.Id) {
    throw new Error("Falha ao criar empresa");
  }

  return getById(row.Id);
}

export async function update(
  id: number,
  data: { nome?: string; cnpj?: string | null }
) {
  const exists = await db("Empresas").where({ Id: id, Ativo: true }).first();
  if (!exists) {
    throw new AppError(404, "Empresa não encontrada");
  }

  const patch: Record<string, unknown> = { UpdatedAt: db.fn.now() };
  if (data.nome !== undefined) patch.Nome = data.nome;
  if (data.cnpj !== undefined) patch.Cnpj = data.cnpj;

  await db("Empresas").where({ Id: id }).update(patch);
  return getById(id);
}

export async function remove(id: number) {
  const exists = await db("Empresas").where({ Id: id }).first();
  if (!exists) {
    throw new AppError(404, "Empresa não encontrada");
  }
  await db("Empresas").where({ Id: id }).del();
}
