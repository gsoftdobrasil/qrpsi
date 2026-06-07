import { db } from "../../config/database";
import { unwrapKnexRawRows } from "../../utils/unwrapKnexRaw";

const ALERTA_PCT_TEMA = 35;

export async function resumo() {
  const empresas = await db("Empresas")
    .where({ Ativo: true })
    .count<{ c: string | number }>("* as c")
    .first();
  const pesquisasTotal = await db("Pesquisas")
    .where({ Ativo: true })
    .count<{ c: string | number }>("* as c")
    .first();
  const pesquisasAbertas = await db("Pesquisas")
    .where({ Status: "ABERTA", Ativo: true })
    .count<{ c: string | number }>("* as c")
    .first();
  const respostasTotal = await db("PesquisasRespostas")
    .count<{ c: string | number }>("* as c")
    .first();

  const simNao = await db("PesquisasRespostasDetalhes")
    .select(
      db.raw(
        "SUM(CASE WHEN Resposta = 1 THEN 1 ELSE 0 END) AS totalSim"
      ),
      db.raw(
        "SUM(CASE WHEN Resposta = 0 THEN 1 ELSE 0 END) AS totalNao"
      )
    )
    .first();

  const r = simNao as Record<string, unknown> | undefined;
  const totalSim = Number(r?.totalSim ?? 0);
  const totalNao = Number(r?.totalNao ?? 0);

  return {
    totalEmpresas: Number((empresas as { c?: string | number } | undefined)?.c ?? 0),
    totalPesquisas: Number((pesquisasTotal as { c?: string | number } | undefined)?.c ?? 0),
    totalPesquisasAbertas: Number(
      (pesquisasAbertas as { c?: string | number } | undefined)?.c ?? 0
    ),
    totalRespostasColetadas: Number(
      (respostasTotal as { c?: string | number } | undefined)?.c ?? 0
    ),
    totalSimGeral: totalSim,
    totalNaoGeral: totalNao,
  };
}

export async function graficos() {
  const simNao = await resumo();

  const porTemaRaw = await db.raw(
    `
    SELECT
      tp.Nome AS tema,
      tp.Ordem AS temaOrdem,
      ISNULL(SUM(CASE WHEN prd.Resposta = 1 THEN 1 ELSE 0 END), 0) AS totalSim,
      ISNULL(SUM(CASE WHEN prd.Resposta = 0 THEN 1 ELSE 0 END), 0) AS totalNao
    FROM TemasPerguntas tp
    INNER JOIN Perguntas p ON p.TemaId = tp.Id AND p.Ativo = 1
    LEFT JOIN PesquisasRespostasDetalhes prd ON prd.PerguntaId = p.Id
    GROUP BY tp.Nome, tp.Ordem
    ORDER BY tp.Ordem
    `
  );

  const porTema = unwrapKnexRawRows<Record<string, unknown>>(porTemaRaw).map(
    (row) => {
    const ts = Number(row.totalSim ?? row.TotalSim);
    const tn = Number(row.totalNao ?? row.TotalNao);
    const tot = ts + tn;
    const pct = tot > 0 ? (ts / tot) * 100 : 0;
    return {
      tema: String(row.tema ?? row.Tema),
      temaOrdem: Number(row.temaOrdem ?? row.TemaOrdem),
      totalSim: ts,
      totalNao: tn,
      percentualSim: Math.round(pct * 100) / 100,
      alertaAltoRisco: pct >= ALERTA_PCT_TEMA,
    };
  }
  );

  const topRaw = await db.raw(
    `
    SELECT TOP 10
      p.Id AS perguntaId,
      p.Ordem AS ordem,
      p.Texto AS texto,
      tp.Nome AS tema,
      ISNULL(SUM(CASE WHEN prd.Resposta = 1 THEN 1 ELSE 0 END), 0) AS totalSim
    FROM Perguntas p
    INNER JOIN TemasPerguntas tp ON tp.Id = p.TemaId
    LEFT JOIN PesquisasRespostasDetalhes prd ON prd.PerguntaId = p.Id AND prd.Resposta = 1
    WHERE p.Ativo = 1
    GROUP BY p.Id, p.Ordem, p.Texto, tp.Nome
    ORDER BY totalSim DESC, p.Ordem ASC
    `
  );

  const topPerguntasSim = unwrapKnexRawRows<Record<string, unknown>>(topRaw).map(
    (x) => ({
    perguntaId: Number(x.perguntaId ?? x.PerguntaId),
    ordem: Number(x.ordem ?? x.Ordem),
    texto: String(x.texto ?? x.Texto),
    tema: String(x.tema ?? x.Tema),
    totalSim: Number(x.totalSim ?? x.TotalSim),
  })
  );

  const recentes = await db("Pesquisas as p")
    .join("Empresas as e", "p.EmpresaId", "e.Id")
    .where("p.Ativo", true)
    .orderBy("p.CreatedAt", "desc")
    .limit(8)
    .select(
      "p.Id",
      "p.Titulo",
      "p.DataPesquisa",
      "p.Status",
      "e.Nome as empresaNome",
      "p.CreatedAt"
    );

  const empresasVolumeRaw = await db.raw(
    `
    SELECT TOP 8
      e.Id AS empresaId,
      e.Nome AS empresaNome,
      COUNT(pr.Id) AS totalRespostas
    FROM Empresas e
    LEFT JOIN Pesquisas p ON p.EmpresaId = e.Id AND p.Ativo = 1
    LEFT JOIN PesquisasRespostas pr ON pr.PesquisaId = p.Id
    WHERE e.Ativo = 1
    GROUP BY e.Id, e.Nome
    ORDER BY totalRespostas DESC
    `
  );

  const empresasMaiorVolume = unwrapKnexRawRows<Record<string, unknown>>(
    empresasVolumeRaw
  ).map((x) => ({
    empresaId: Number(x.empresaId ?? x.EmpresaId),
    empresaNome: String(x.empresaNome ?? x.EmpresaNome),
    totalRespostas: Number(x.totalRespostas ?? x.TotalRespostas),
  }));

  return {
    simNaoGeral: {
      sim: simNao.totalSimGeral,
      nao: simNao.totalNaoGeral,
    },
    percentualSimPorTema: porTema,
    topPerguntasMaisSim: topPerguntasSim,
    pesquisasRecentes: recentes,
    empresasMaiorVolume,
  };
}
