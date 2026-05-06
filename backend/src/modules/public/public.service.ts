import { db } from "../../config/database";
import { AppError } from "../../utils/AppError";
import { normalizarDepartamentoNome } from "../../utils/normalizeDepartamento";

export async function getEmpresaIdPorUuid(uuidLink: string): Promise<number | null> {
  const row = await db("Pesquisas as p")
    .join("Empresas as e", "p.EmpresaId", "e.Id")
    .whereRaw("CONVERT(varchar(36), p.UuidLink) = ?", [uuidLink])
    .where("e.Ativo", true)
    .select("p.EmpresaId")
    .first();

  return row ? (row.EmpresaId as number) : null;
}

export async function getPesquisaPublica(uuidLink: string) {
  const row = await db("Pesquisas as p")
    .join("Empresas as e", "p.EmpresaId", "e.Id")
    .whereRaw("CONVERT(varchar(36), p.UuidLink) = ?", [uuidLink])
    .where("e.Ativo", true)
    .select(
      "p.Id",
      "p.UuidLink",
      "p.Titulo",
      "p.DataPesquisa",
      "p.Status",
      "p.EmpresaId",
      "e.Nome as empresaNome"
    )
    .first();

  if (!row) {
    return null;
  }

  const temas = await db("TemasPerguntas as tp")
    .where("tp.Ativo", true)
    .orderBy("tp.Ordem", "asc")
    .select("tp.Id", "tp.Ordem", "tp.Nome");

  const perguntas = await db("Perguntas as p")
    .where("p.Ativo", true)
    .orderBy("p.Ordem", "asc")
    .select("p.Id", "p.TemaId", "p.Ordem", "p.Texto");

  const perguntasPorTema = temas.map((t) => ({
    id: t.Id,
    ordem: t.Ordem,
    nome: t.Nome,
    perguntas: perguntas
      .filter((p) => p.TemaId === t.Id)
      .map((p) => ({
        id: p.Id,
        ordem: p.Ordem,
        texto: p.Texto,
      })),
  }));

  return {
    pesquisa: {
      titulo: row.Titulo,
      dataPesquisa: row.DataPesquisa,
      status: row.Status,
      empresaNome: row.empresaNome,
    },
    temasComPerguntas: perguntasPorTema,
  };
}

export async function listDepartamentosEmpresa(empresaId: number) {
  return db("Departamentos")
    .where({ EmpresaId: empresaId })
    .orderBy("Nome", "asc")
    .select("Id", "Nome");
}

async function resolveDepartamento(
  empresaId: number,
  textoBruto: string | undefined
): Promise<{ departamentoId: number | null; departamentoInformado: string | null }> {
  const trimmed = textoBruto?.trim() ?? "";
  if (!trimmed) {
    return { departamentoId: null, departamentoInformado: null };
  }

  const norm = normalizarDepartamentoNome(trimmed);

  const existente = await db("Departamentos")
    .where({ EmpresaId: empresaId, NomeNormalizado: norm })
    .first();

  if (existente) {
    return {
      departamentoId: existente.Id as number,
      departamentoInformado: trimmed,
    };
  }

  const inserted = await db("Departamentos")
    .insert({
      EmpresaId: empresaId,
      Nome: trimmed,
      NomeNormalizado: norm,
      CreatedAt: db.fn.now(),
    })
    .returning(["Id"]);

  const ins = inserted[0] as { Id: number } | undefined;
  if (!ins?.Id) {
    throw new Error("Falha ao cadastrar departamento");
  }

  return {
    departamentoId: ins.Id,
    departamentoInformado: trimmed,
  };
}

export async function registrarResposta(
  uuidLink: string,
  input: {
    nomeRespondente?: string;
    departamento?: string;
    respostas: { perguntaId: number; resposta: boolean }[];
  }
) {
  const pesquisa = await db("Pesquisas as p")
    .join("Empresas as e", "p.EmpresaId", "e.Id")
    .whereRaw("CONVERT(varchar(36), p.UuidLink) = ?", [uuidLink])
    .where("e.Ativo", true)
    .select("p.Id", "p.Status", "p.EmpresaId")
    .first();

  if (!pesquisa) {
    throw new AppError(404, "Pesquisa não encontrada");
  }

  if (pesquisa.Status !== "ABERTA") {
    throw new AppError(400, "Esta pesquisa não está recebendo respostas");
  }

  const catalogo = await db("Perguntas")
    .where({ Ativo: true })
    .select("Id");

  const idsEsperados = new Set(catalogo.map((c) => c.Id as number));
  const idsRecebidos = new Set(input.respostas.map((r) => r.perguntaId));

  if (idsEsperados.size !== idsRecebidos.size) {
    throw new AppError(400, "Conjunto de perguntas inválido");
  }

  for (const id of idsEsperados) {
    if (!idsRecebidos.has(id)) {
      throw new AppError(400, "Responda todas as perguntas");
    }
  }

  const nomeTrim =
    input.nomeRespondente?.trim() !== ""
      ? input.nomeRespondente?.trim().slice(0, 150)
      : null;

  const { departamentoId, departamentoInformado } = await resolveDepartamento(
    pesquisa.EmpresaId as number,
    input.departamento
  );

  await db.transaction(async (trx) => {
    const inserted = await trx("PesquisasRespostas")
      .insert({
        PesquisaId: pesquisa.Id,
        DepartamentoId: departamentoId,
        NomeRespondente: nomeTrim,
        DepartamentoInformado: departamentoInformado,
        DataResposta: trx.fn.now(),
      })
      .returning(["Id"]);

    const respostaRow = inserted[0] as { Id: number } | undefined;
    if (!respostaRow?.Id) {
      throw new Error("Falha ao salvar resposta");
    }

    const detalhes = input.respostas.map((r) => ({
      PesquisaRespostaId: respostaRow.Id,
      PerguntaId: r.perguntaId,
      Resposta: r.resposta,
    }));

    await trx("PesquisasRespostasDetalhes").insert(detalhes);
  });

  return { ok: true };
}
