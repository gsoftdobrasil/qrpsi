import { db } from "../../config/database";
import { AppError } from "../../utils/AppError";
import { unwrapKnexRawRows } from "../../utils/unwrapKnexRaw";

/** Evolução futura: aqui pode-se incorporar cálculo IRGP com pesos oficiais por pergunta/tema. */

async function ensurePesquisaExists(id: number) {
  const p = await db("Pesquisas as p")
    .join("Empresas as e", "p.EmpresaId", "e.Id")
    .where("p.Id", id)
    .where("p.Ativo", true)
    .select(
      "p.Id",
      "p.UuidLink",
      "p.Titulo",
      "p.DataPesquisa",
      "p.Status",
      "p.EmpresaId",
      "p.CreatedAt",
      "p.UpdatedAt",
      "e.Nome as EmpresaNome"
    )
    .first();

  if (!p) {
    throw new AppError(404, "Pesquisa não encontrada");
  }

  return p;
}

export async function aggregateGlobais(pesquisaId: number) {
  const resp = await db("PesquisasRespostas")
    .where({ PesquisaId: pesquisaId })
    .count<{ c: string | number }>("* as c")
    .first();

  const totalRespondentes = Number(resp?.c ?? 0);

  const agg = await db("PesquisasRespostasDetalhes as prd")
    .join(
      "PesquisasRespostas as pr",
      "prd.PesquisaRespostaId",
      "pr.Id"
    )
    .where("pr.PesquisaId", pesquisaId)
    .select(
      db.raw(
        "SUM(CASE WHEN prd.Resposta = 1 THEN 1 ELSE 0 END) AS totalSim"
      ),
      db.raw(
        "SUM(CASE WHEN prd.Resposta = 0 THEN 1 ELSE 0 END) AS totalNao"
      )
    )
    .first();

  const row = agg as Record<string, unknown> | undefined;
  const totalSim = Number(row?.totalSim ?? row?.TotalSim ?? 0);
  const totalNao = Number(row?.totalNao ?? row?.TotalNao ?? 0);
  const totalRespostas = totalSim + totalNao;
  const percentualSim =
    totalRespostas > 0 ? (totalSim / totalRespostas) * 100 : 0;

  return {
    totalRespondentes,
    totalSim,
    totalNao,
    totalRespostas,
    percentualSim: Math.round(percentualSim * 100) / 100,
  };
}

export async function list() {
  const rows = await db("Pesquisas as p")
    .join("Empresas as e", "p.EmpresaId", "e.Id")
    .where("p.Ativo", true)
    .leftJoin(
      "PesquisasRespostas as pr",
      "pr.PesquisaId",
      "p.Id"
    )
    .groupBy(
      "p.Id",
      "p.UuidLink",
      "p.Titulo",
      "p.DataPesquisa",
      "p.Status",
      "p.CreatedAt",
      "e.Nome",
      "e.Id"
    )
    .select(
      "p.Id",
      "p.UuidLink",
      "p.Titulo",
      "p.DataPesquisa",
      "p.Status",
      "p.CreatedAt",
      "e.Id as empresaId",
      "e.Nome as empresaNome",
      db.raw("COUNT(pr.Id) as totalRespostas")
    )
    .orderBy("p.CreatedAt", "desc");

  return rows.map((r: Record<string, unknown>) => ({
    id: r.Id,
    uuidLink: r.UuidLink,
    titulo: r.Titulo,
    dataPesquisa: r.DataPesquisa,
    status: r.Status,
    createdAt: r.CreatedAt,
    empresaId: r.empresaId,
    empresaNome: r.empresaNome,
    totalRespostas: Number(r.totalRespostas ?? 0),
  }));
}

export async function getById(id: number) {
  const p = await ensurePesquisaExists(id);
  const agg = await aggregateGlobais(id);

  return {
    pesquisa: {
      id: p.Id,
      uuidLink: p.UuidLink,
      titulo: p.Titulo,
      dataPesquisa: p.DataPesquisa,
      status: p.Status,
      empresaId: p.EmpresaId,
      empresaNome: p.EmpresaNome,
      createdAt: p.CreatedAt,
      updatedAt: p.UpdatedAt,
    },
    ...agg,
  };
}

export async function create(data: {
  empresaId: number;
  titulo: string;
  dataPesquisa: string;
  status: string;
}) {
  const empresa = await db("Empresas")
    .where({ Id: data.empresaId, Ativo: true })
    .first();
  if (!empresa) {
    throw new AppError(404, "Empresa não encontrada");
  }

  const inserted = await db("Pesquisas")
    .insert({
      EmpresaId: data.empresaId,
      Titulo: data.titulo,
      DataPesquisa: data.dataPesquisa,
      Status: data.status,
      Ativo: true,
      CreatedAt: db.fn.now(),
    })
    .returning(["Id", "UuidLink"]);

  const row = inserted[0] as { Id: number; UuidLink: string } | undefined;
  if (!row?.Id) {
    throw new Error("Falha ao criar pesquisa");
  }

  return getById(row.Id);
}

export async function update(
  id: number,
  data: { titulo?: string; dataPesquisa?: string; status?: string }
) {
  await ensurePesquisaExists(id);

  const patch: Record<string, unknown> = { UpdatedAt: db.fn.now() };
  if (data.titulo !== undefined) patch.Titulo = data.titulo;
  if (data.dataPesquisa !== undefined) patch.DataPesquisa = data.dataPesquisa;
  if (data.status !== undefined) patch.Status = data.status;

  await db("Pesquisas").where({ Id: id }).update(patch);
  return getById(id);
}

export async function patchStatus(id: number, status: string) {
  await ensurePesquisaExists(id);
  await db("Pesquisas").where({ Id: id }).update({
    Status: status,
    UpdatedAt: db.fn.now(),
  });
  return getById(id);
}

export async function remove(id: number) {
  const exists = await db("Pesquisas")
    .where({ Id: id, Ativo: true })
    .first();
  if (!exists) {
    throw new AppError(404, "Pesquisa não encontrada");
  }
  await db("Pesquisas").where({ Id: id }).update({
    Ativo: false,
    Status: "CANCELADA",
    UpdatedAt: db.fn.now(),
  });
}

export async function getResumo(id: number) {
  const base = await getById(id);
  return base;
}

export async function respostasCompletas(id: number) {
  const p = await ensurePesquisaExists(id);

  const perguntas = await db("Perguntas as pg")
    .join("TemasPerguntas as tp", "pg.TemaId", "tp.Id")
    .where("pg.Ativo", true)
    .orderBy(["tp.Ordem", "pg.Ordem"])
    .select("pg.Id as id", "pg.Ordem as ordem", "pg.Texto as texto");

  const respostasRows = await db("PesquisasRespostas as pr")
    .leftJoin("Departamentos as d", "d.Id", "pr.DepartamentoId")
    .where("pr.PesquisaId", id)
    .orderBy("pr.DataResposta", "asc")
    .select(
      "pr.Id as id",
      "pr.DataResposta as dataResposta",
      "pr.NomeRespondente as nomeRespondente",
      db.raw(
        "COALESCE(d.Nome, pr.DepartamentoInformado, '') as departamento"
      )
    );

  const detalhesRows = await db("PesquisasRespostasDetalhes as prd")
    .join("PesquisasRespostas as pr", "pr.Id", "prd.PesquisaRespostaId")
    .where("pr.PesquisaId", id)
    .select(
      "prd.PesquisaRespostaId as respostaId",
      "prd.PerguntaId as perguntaId",
      "prd.Resposta as resposta"
    );

  const detalhesPorResposta = new Map<number, Map<number, boolean>>();
  for (const d of detalhesRows as Array<{
    respostaId: number;
    perguntaId: number;
    resposta: boolean | number;
  }>) {
    if (!detalhesPorResposta.has(d.respostaId)) {
      detalhesPorResposta.set(d.respostaId, new Map());
    }
    detalhesPorResposta
      .get(d.respostaId)!
      .set(d.perguntaId, Boolean(d.resposta));
  }

  const linhas = (respostasRows as Array<{
    id: number;
    dataResposta: Date | string;
    nomeRespondente: string | null;
    departamento: string;
  }>).map((r) => {
    const respostasMap = detalhesPorResposta.get(r.id) ?? new Map();
    const respostas: Record<number, "Sim" | "Não" | ""> = {};
    for (const pg of perguntas as Array<{ id: number }>) {
      const val = respostasMap.get(pg.id);
      respostas[pg.id] =
        val === true ? "Sim" : val === false ? "Não" : "";
    }
    return {
      dataResposta: r.dataResposta,
      nomeRespondente: r.nomeRespondente ?? "",
      departamento: r.departamento ?? "",
      respostas,
    };
  });

  return {
    empresaNome: p.EmpresaNome as string,
    perguntas: (perguntas as Array<{ id: number; ordem: number; texto: string }>).map(
      (pg) => ({
        id: pg.id,
        ordem: pg.ordem,
        texto: pg.texto,
      })
    ),
    linhas,
  };
}

export async function resultadosPerguntas(id: number) {
  await ensurePesquisaExists(id);

  const raw = await db.raw(
    `
    SELECT
      tp.Nome AS TemaNome,
      tp.Ordem AS TemaOrdem,
      p.Id AS PerguntaId,
      p.Ordem AS Ordem,
      p.Texto AS Texto,
      ISNULL(SUM(CASE WHEN prd.Resposta = 1 THEN 1 ELSE 0 END), 0) AS TotalSim,
      ISNULL(SUM(CASE WHEN prd.Resposta = 0 THEN 1 ELSE 0 END), 0) AS TotalNao
    FROM Perguntas p
    INNER JOIN TemasPerguntas tp ON p.TemaId = tp.Id
    LEFT JOIN (
      SELECT prd.PerguntaId, prd.Resposta
      FROM PesquisasRespostasDetalhes prd
      INNER JOIN PesquisasRespostas pr ON pr.Id = prd.PesquisaRespostaId
      WHERE pr.PesquisaId = ?
    ) prd ON prd.PerguntaId = p.Id
    WHERE p.Ativo = 1
    GROUP BY tp.Nome, tp.Ordem, p.Id, p.Ordem, p.Texto
    ORDER BY tp.Ordem, p.Ordem
    `,
    [id]
  );

  const result = unwrapKnexRawRows<{
    TemaNome: string;
    TemaOrdem: number;
    PerguntaId: number;
    Ordem: number;
    Texto: string;
    TotalSim: number;
    TotalNao: number;
  }>(raw);

  const mapped = result.map((r) => {
    const totalSim = Number(r.TotalSim);
    const totalNao = Number(r.TotalNao);
    const total = totalSim + totalNao;
    const pct = total > 0 ? (totalSim / total) * 100 : 0;
    return {
      tema: r.TemaNome,
      temaOrdem: r.TemaOrdem,
      perguntaId: r.PerguntaId,
      ordem: r.Ordem,
      texto: r.Texto,
      totalSim,
      totalNao,
      totalRespostas: total,
      percentualSim: Math.round(pct * 100) / 100,
      alertaAltoRisco: pct >= 35,
    };
  });

  return mapped;
}

export async function resultadosTemas(id: number) {
  await ensurePesquisaExists(id);

  const raw = await db.raw(
    `
    SELECT
      tp.Nome AS TemaNome,
      tp.Ordem AS TemaOrdem,
      ISNULL(SUM(CASE WHEN prd.Resposta = 1 THEN 1 ELSE 0 END), 0) AS TotalSim,
      ISNULL(SUM(CASE WHEN prd.Resposta = 0 THEN 1 ELSE 0 END), 0) AS TotalNao
    FROM TemasPerguntas tp
    INNER JOIN Perguntas p ON p.TemaId = tp.Id AND p.Ativo = 1
    LEFT JOIN (
      SELECT prd.PerguntaId, prd.Resposta
      FROM PesquisasRespostasDetalhes prd
      INNER JOIN PesquisasRespostas pr ON pr.Id = prd.PesquisaRespostaId
      WHERE pr.PesquisaId = ?
    ) prd ON prd.PerguntaId = p.Id
    GROUP BY tp.Nome, tp.Ordem
    ORDER BY tp.Ordem
    `,
    [id]
  );

  const result = unwrapKnexRawRows<{
    TemaNome: string;
    TemaOrdem: number;
    TotalSim: number;
    TotalNao: number;
  }>(raw);

  return result.map((r) => {
    const totalSim = Number(r.TotalSim);
    const totalNao = Number(r.TotalNao);
    const total = totalSim + totalNao;
    const pct = total > 0 ? (totalSim / total) * 100 : 0;
    return {
      tema: r.TemaNome,
      temaOrdem: r.TemaOrdem,
      totalSim,
      totalNao,
      percentualSim: Math.round(pct * 100) / 100,
      alertaAltoRisco: pct >= 35,
    };
  });
}

export async function resultadosDepartamentos(id: number) {
  await ensurePesquisaExists(id);

  const raw = await db.raw(
    `
    SELECT
      COALESCE(d.Nome, '(Sem departamento informado)') AS DepartamentoNome,
      COUNT(DISTINCT pr.Id) AS TotalRespondentes,
      ISNULL(SUM(CASE WHEN prd.Resposta = 1 THEN 1 ELSE 0 END), 0) AS TotalSim,
      ISNULL(SUM(CASE WHEN prd.Resposta = 0 THEN 1 ELSE 0 END), 0) AS TotalNao
    FROM PesquisasRespostas pr
    LEFT JOIN Departamentos d ON d.Id = pr.DepartamentoId
    LEFT JOIN PesquisasRespostasDetalhes prd ON prd.PesquisaRespostaId = pr.Id
    WHERE pr.PesquisaId = ?
    GROUP BY COALESCE(d.Nome, '(Sem departamento informado)')
    ORDER BY DepartamentoNome
    `,
    [id]
  );

  const result = unwrapKnexRawRows<{
    DepartamentoNome: string | null;
    TotalRespondentes: number;
    TotalSim: number;
    TotalNao: number;
  }>(raw);

  return result.map((r) => {
    const totalSim = Number(r.TotalSim);
    const totalNao = Number(r.TotalNao);
    const total = totalSim + totalNao;
    const pct = total > 0 ? (totalSim / total) * 100 : 0;
    return {
      departamento: r.DepartamentoNome,
      totalRespondentes: Number(r.TotalRespondentes),
      totalSim,
      totalNao,
      percentualSim: Math.round(pct * 100) / 100,
    };
  });
}
