import {
  alpha,
  Button,
  Grid,
  Group,
  LoadingOverlay,
  Paper,
  Stack,
  Table,
  Text,
  Title,
  useMantineColorScheme,
  useMantineTheme,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api, pesquisaPublicUrl } from "../../api/client";
import { StatusBadge } from "../../components/StatusBadge";

type Resumo = {
  pesquisa: {
    id: number;
    uuidLink: string;
    titulo: string;
    dataPesquisa: string;
    status: string;
    empresaNome: string;
  };
  totalRespondentes: number;
  totalSim: number;
  totalNao: number;
  totalRespostas: number;
  percentualSim: number;
};

type PerguntaRes = {
  tema: string;
  ordem: number;
  texto: string;
  totalSim: number;
  totalNao: number;
  totalRespostas: number;
  percentualSim: number;
  alertaAltoRisco: boolean;
};

type TemaRes = {
  tema: string;
  totalSim: number;
  totalNao: number;
  percentualSim: number;
  alertaAltoRisco: boolean;
};

type DeptRes = {
  departamento: string;
  totalRespondentes: number;
  totalSim: number;
  totalNao: number;
  percentualSim: number;
};

export function PesquisaDetailPage() {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const alertRowBg =
    colorScheme === "dark"
      ? alpha(theme.colors.red[8], 0.28)
      : alpha(theme.colors.red[6], 0.14);

  const chartGridStroke =
    colorScheme === "dark" ? theme.colors.dark[4] : theme.colors.gray[3];
  const chartTickFill =
    colorScheme === "dark" ? theme.colors.gray[4] : theme.colors.gray[7];
  const chartTooltipBg =
    colorScheme === "dark" ? theme.colors.dark[7] : theme.white;
  const chartTooltipBorder =
    colorScheme === "dark" ? theme.colors.dark[4] : theme.colors.gray[3];
  const chartTooltipColor =
    colorScheme === "dark" ? theme.colors.gray[0] : theme.colors.dark[9];

  const { id } = useParams();
  const navigate = useNavigate();
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [perguntas, setPerguntas] = useState<PerguntaRes[]>([]);
  const [temas, setTemas] = useState<TemaRes[]>([]);
  const [depts, setDepts] = useState<DeptRes[]>([]);
  const [loading, setLoading] = useState(true);

  const uuidStr = (u: string) =>
    String(u).replace(/[{}]/g, "").toLowerCase();

  useEffect(() => {
    let ok = true;
    void (async () => {
      try {
        const [r, p, t, d] = await Promise.all([
          api.get<Resumo>(`/pesquisas/${id}/resumo`),
          api.get<PerguntaRes[]>(`/pesquisas/${id}/resultados-perguntas`),
          api.get<TemaRes[]>(`/pesquisas/${id}/resultados-temas`),
          api.get<DeptRes[]>(`/pesquisas/${id}/resultados-departamentos`),
        ]);
        if (ok) {
          setResumo(r.data);
          setPerguntas(p.data);
          setTemas(t.data);
          setDepts(d.data);
        }
      } catch {
        notifications.show({
          title: "Erro",
          message: "Não foi possível carregar a pesquisa.",
          color: "red",
        });
        navigate("/pesquisas");
      } finally {
        if (ok) setLoading(false);
      }
    })();
    return () => {
      ok = false;
    };
  }, [id, navigate]);

  const publicLink = resumo
    ? pesquisaPublicUrl(uuidStr(resumo.pesquisa.uuidLink))
    : "";

  const pieData =
    resumo && resumo.totalRespostas > 0
      ? [
          { name: "Sim", value: resumo.totalSim, fill: "#fa5252" },
          { name: "Não", value: resumo.totalNao, fill: "#51cf66" },
        ].filter((x) => x.value > 0)
      : null;

  const sanitizeFilePart = (v: string) =>
    v
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();

  const exportToExcel = async (
    rows: Record<string, string | number | boolean>[],
    sheetName: string,
    suffix: string
  ) => {
    if (rows.length === 0) {
      notifications.show({
        title: "Sem dados",
        message: "Não há dados para exportar.",
        color: "yellow",
      });
      return;
    }

    const ExcelJS = await import("exceljs");
    const wb = new ExcelJS.Workbook();
    const exportedAt = new Date().toLocaleString("pt-BR");
    const headers = Object.keys(rows[0] ?? {});
    const ws = wb.addWorksheet(sheetName, {
      views: [{ state: "frozen", ySplit: 1 }],
    });

    const applyDataStyle = (
      sheet: import("exceljs").Worksheet,
      fromRow: number,
      toRow: number,
      totalColumns: number
    ) => {
      for (let rowIdx = fromRow; rowIdx <= toRow; rowIdx += 1) {
        const row = sheet.getRow(rowIdx);
        const zebra = rowIdx % 2 === 0;
        for (let colIdx = 1; colIdx <= totalColumns; colIdx += 1) {
          const cell = row.getCell(colIdx);
          cell.border = {
            top: { style: "thin", color: { argb: "FFD0D7DE" } },
            left: { style: "thin", color: { argb: "FFD0D7DE" } },
            bottom: { style: "thin", color: { argb: "FFD0D7DE" } },
            right: { style: "thin", color: { argb: "FFD0D7DE" } },
          };
          if (zebra) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFF8FAFD" },
            };
          }
        }
      }
    };

    if (headers.length > 0) {
      ws.columns = headers.map((h) => {
        const maxCell = rows.reduce((m, row) => {
          const cell = row[h];
          return Math.max(m, String(cell ?? "").length);
        }, h.length);
        return {
          header: h,
          key: h,
          width: Math.min(60, Math.max(12, maxCell + 2)),
        };
      });

      const normalizedRows = rows.map((row) => {
        const out: Record<string, string | number | boolean> = { ...row };
        headers.forEach((h) => {
          const val = row[h];
          if (typeof val !== "number") return;
          const isPercentCol =
            h.toLowerCase().includes("percentual") ||
            h.trim().toLowerCase().startsWith("%");
          if (!isPercentCol) return;
          out[h] = val / 100;
        });
        return out;
      });
      ws.addRows(normalizedRows);

      ws.autoFilter = {
        from: "A1",
        to: { row: 1, column: headers.length },
      };

      const headerRow = ws.getRow(1);
      headerRow.height = 22;
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      headerRow.alignment = { vertical: "middle", horizontal: "center" };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF364FC7" },
      };

      headers.forEach((h, cidx) => {
        const isPercentCol =
          h.toLowerCase().includes("percentual") ||
          h.trim().toLowerCase().startsWith("%");
        if (!isPercentCol) return;

        for (let ridx = 2; ridx <= rows.length + 1; ridx += 1) {
          const cell = ws.getCell(ridx, cidx + 1);
          if (typeof cell.value !== "number") continue;
          cell.numFmt = "0.00%";
        }
      });

      applyDataStyle(ws, 2, rows.length + 1, headers.length);

      const riskFont = {
        bold: true,
        color: { argb: "FFE03131" },
      } as const;
      const RISK_FRACTION = 0.35;

      headers.forEach((h, cidx) => {
        const hl = h.toLowerCase();
        const isPercentCol =
          hl.includes("percentual") ||
          h.trim().toLowerCase().startsWith("%");
        const isAlertaAlto = hl.includes("alerta");

        for (let ridx = 2; ridx <= rows.length + 1; ridx += 1) {
          const cell = ws.getCell(ridx, cidx + 1);
          if (
            isPercentCol &&
            typeof cell.value === "number" &&
            cell.value >= RISK_FRACTION
          ) {
            cell.font = { ...riskFont };
          }
          if (isAlertaAlto && cell.value === "Sim") {
            cell.font = { ...riskFont };
          }
        }
      });

      const footerRowIndex = rows.length + 3;
      ws.getCell(footerRowIndex, 1).value = `Exportado em: ${exportedAt}`;
      ws.getCell(footerRowIndex, 1).font = {
        italic: true,
        color: { argb: "FF5C6770" },
      };
      if (headers.length > 1) {
        ws.mergeCells(footerRowIndex, 1, footerRowIndex, headers.length);
      }
    }

    if (resumo) {
      const meta = wb.addWorksheet("Metadados", {
        views: [{ state: "frozen", ySplit: 1 }],
      });
      const metaRows: Array<{ Campo: string; Valor: string | number }> = [
        { Campo: "Pesquisa ID", Valor: resumo.pesquisa.id },
        { Campo: "Título", Valor: resumo.pesquisa.titulo },
        { Campo: "Empresa", Valor: resumo.pesquisa.empresaNome },
        {
          Campo: "Data da pesquisa",
          Valor: String(resumo.pesquisa.dataPesquisa).slice(0, 10),
        },
        { Campo: "Status", Valor: resumo.pesquisa.status },
        { Campo: "Total respondentes", Valor: resumo.totalRespondentes },
        { Campo: "Total Sim", Valor: resumo.totalSim },
        { Campo: "Total Não", Valor: resumo.totalNao },
        { Campo: "Total respostas", Valor: resumo.totalRespostas },
        { Campo: "% Sim geral", Valor: resumo.percentualSim },
      ];

      meta.columns = [
        { header: "Campo", key: "Campo", width: 24 },
        { header: "Valor", key: "Valor", width: 46 },
      ];
      meta.addRows(metaRows);
      meta.autoFilter = {
        from: "A1",
        to: "B1",
      };

      const metaHeader = meta.getRow(1);
      metaHeader.height = 22;
      metaHeader.font = { bold: true, color: { argb: "FFFFFFFF" } };
      metaHeader.alignment = { vertical: "middle", horizontal: "center" };
      metaHeader.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF364FC7" },
      };

      const pctMetaCell = meta.getCell("B11");
      if (typeof pctMetaCell.value === "number") {
        const pctFrac = pctMetaCell.value / 100;
        pctMetaCell.value = pctFrac;
        pctMetaCell.numFmt = "0.00%";
        if (pctFrac >= 0.35) {
          pctMetaCell.font = {
            bold: true,
            color: { argb: "FFE03131" },
          };
        }
      }

      applyDataStyle(meta, 2, metaRows.length + 1, 2);

      const metaFooterIndex = metaRows.length + 3;
      meta.getCell(metaFooterIndex, 1).value = `Exportado em: ${exportedAt}`;
      meta.getCell(metaFooterIndex, 1).font = {
        italic: true,
        color: { argb: "FF5C6770" },
      };
      meta.mergeCells(metaFooterIndex, 1, metaFooterIndex, 2);
    }

    const base =
      resumo?.pesquisa?.titulo?.trim().length
        ? sanitizeFilePart(resumo.pesquisa.titulo)
        : "pesquisa";
    const fileName = `${base}_${suffix}.xlsx`;
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Stack pos="relative">
      <LoadingOverlay visible={loading} />
      <Button variant="subtle" onClick={() => navigate("/pesquisas")}>
        ← Voltar
      </Button>

      {resumo && (
        <>
          <Group justify="space-between" align="flex-start">
            <div>
              <Title order={3}>{resumo.pesquisa.titulo}</Title>
              <Text c="dimmed" size="sm">
                {resumo.pesquisa.empresaNome} ·{" "}
                {String(resumo.pesquisa.dataPesquisa).slice(0, 10)}
              </Text>
              <Group mt="xs">
                <StatusBadge status={resumo.pesquisa.status} />
              </Group>
            </div>
            <Group>
              <Button
                size="xs"
                variant="light"
                onClick={() => {
                  void navigator.clipboard.writeText(publicLink);
                  notifications.show({ message: "Link copiado", color: "teal" });
                }}
              >
                Copiar link público
              </Button>
            </Group>
          </Group>

          <Grid>
            <Grid.Col span={{ base: 6, sm: 3 }}>
              <Paper withBorder p="sm">
                <Text size="xs" c="dimmed">
                  Respondentes
                </Text>
                <Text fw={700}>{resumo.totalRespondentes}</Text>
              </Paper>
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 3 }}>
              <Paper withBorder p="sm">
                <Text size="xs" c="dimmed">
                  Sim / Não
                </Text>
                <Text fw={700}>
                  {resumo.totalSim} / {resumo.totalNao}
                </Text>
              </Paper>
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Paper withBorder p="sm">
                <Text size="xs" c="dimmed">
                  % geral “Sim” (indicativo de risco)
                </Text>
                <Text fw={700} c={resumo.percentualSim >= 35 ? "red" : undefined}>
                  {resumo.percentualSim}%
                </Text>
              </Paper>
            </Grid.Col>
          </Grid>

          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Paper withBorder p="md">
                <Text fw={600} mb="sm">
                  Sim × Não
                </Text>
                <div style={{ height: 260 }}>
                  {pieData ? (
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          label
                        >
                          {pieData.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: chartTooltipBg,
                            border: `1px solid ${chartTooltipBorder}`,
                            borderRadius: 8,
                          }}
                          labelStyle={{ color: chartTooltipColor }}
                          itemStyle={{ color: chartTooltipColor }}
                        />
                        <Legend wrapperStyle={{ color: chartTickFill }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <Text c="dimmed" size="sm">
                      Sem respostas.
                    </Text>
                  )}
                </div>
              </Paper>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Paper withBorder p="md">
                <Text fw={600} mb="sm">
                  % Sim por tema
                </Text>
                <div style={{ height: 260 }}>
                  {temas.length > 0 ? (
                    <ResponsiveContainer>
                        <BarChart
                        data={temas.map((t) => ({
                          nome:
                            t.tema.length > 24
                              ? `${t.tema.slice(0, 24)}…`
                              : t.tema,
                          pct: t.percentualSim,
                          alerta: t.alertaAltoRisco,
                        }))}
                        layout="vertical"
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={chartGridStroke}
                        />
                        <XAxis
                          type="number"
                          domain={[0, 100]}
                          tick={{ fill: chartTickFill }}
                          stroke={chartGridStroke}
                        />
                        <YAxis
                          type="category"
                          dataKey="nome"
                          width={100}
                          tick={{ fill: chartTickFill }}
                          stroke={chartGridStroke}
                        />
                        <Tooltip
                          contentStyle={{
                            background: chartTooltipBg,
                            border: `1px solid ${chartTooltipBorder}`,
                            borderRadius: 8,
                          }}
                          labelStyle={{ color: chartTooltipColor }}
                          itemStyle={{ color: chartTooltipColor }}
                        />
                        <Bar dataKey="pct" name="% Sim">
                          {temas.map((t, i) => (
                            <Cell
                              key={i}
                              fill={
                                t.alertaAltoRisco ? "#fa5252" : "#9775fa"
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <Text c="dimmed" size="sm">
                      Sem dados.
                    </Text>
                  )}
                </div>
              </Paper>
            </Grid.Col>
          </Grid>

          <Group justify="space-between" align="center" mt="md">
            <Title order={5}>Por pergunta</Title>
            <Button
              size="xs"
              variant="light"
              onClick={() =>
                void exportToExcel(
                  perguntas.map((p) => ({
                    Tema: p.tema,
                    Ordem: p.ordem,
                    Pergunta: p.texto,
                    Sim: p.totalSim,
                    Nao: p.totalNao,
                    TotalRespostas: p.totalRespostas,
                    PercentualSim: p.percentualSim,
                    AlertaAltoRisco: p.alertaAltoRisco ? "Sim" : "Não",
                  })),
                  "PorPergunta",
                  "por_pergunta"
                )
              }
            >
              Exportar Excel
            </Button>
          </Group>
          <Paper withBorder p={0} radius="md" style={{ overflow: "auto" }}>
          <Table striped highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Tema</Table.Th>
                <Table.Th>#</Table.Th>
                <Table.Th>Pergunta</Table.Th>
                <Table.Th>Sim</Table.Th>
                <Table.Th>Não</Table.Th>
                <Table.Th>% Sim</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {perguntas.map((p, i) => (
                <Table.Tr
                  key={i}
                  bg={p.alertaAltoRisco ? alertRowBg : undefined}
                >
                  <Table.Td>{p.tema}</Table.Td>
                  <Table.Td>{p.ordem}</Table.Td>
                  <Table.Td>{p.texto}</Table.Td>
                  <Table.Td>{p.totalSim}</Table.Td>
                  <Table.Td>{p.totalNao}</Table.Td>
                  <Table.Td fw={p.alertaAltoRisco ? 700 : undefined}>
                    {p.percentualSim}%
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
          </Paper>

          <Group justify="space-between" align="center" mt="xl">
            <Title order={5}>Por tema</Title>
            <Button
              size="xs"
              variant="light"
              onClick={() =>
                void exportToExcel(
                  temas.map((t) => ({
                    Tema: t.tema,
                    Sim: t.totalSim,
                    Nao: t.totalNao,
                    PercentualSim: t.percentualSim,
                    AlertaAltoRisco: t.alertaAltoRisco ? "Sim" : "Não",
                  })),
                  "PorTema",
                  "por_tema"
                )
              }
            >
              Exportar Excel
            </Button>
          </Group>
          <Paper withBorder p={0} radius="md" style={{ overflow: "auto" }}>
          <Table striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Tema</Table.Th>
                <Table.Th>Sim</Table.Th>
                <Table.Th>Não</Table.Th>
                <Table.Th>% Sim</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {temas.map((t, i) => (
                <Table.Tr key={i}>
                  <Table.Td>{t.tema}</Table.Td>
                  <Table.Td>{t.totalSim}</Table.Td>
                  <Table.Td>{t.totalNao}</Table.Td>
                  <Table.Td>{t.percentualSim}%</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
          </Paper>

          <Group justify="space-between" align="center" mt="xl">
            <Title order={5}>Por departamento</Title>
            <Button
              size="xs"
              variant="light"
              onClick={() =>
                void exportToExcel(
                  depts.map((d) => ({
                    Departamento: d.departamento,
                    Respondentes: d.totalRespondentes,
                    Sim: d.totalSim,
                    Nao: d.totalNao,
                    PercentualSim: d.percentualSim,
                  })),
                  "PorDepartamento",
                  "por_departamento"
                )
              }
            >
              Exportar Excel
            </Button>
          </Group>
          <Paper withBorder p={0} radius="md" style={{ overflow: "auto" }}>
          <Table striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Departamento</Table.Th>
                <Table.Th>Respondentes</Table.Th>
                <Table.Th>Sim</Table.Th>
                <Table.Th>Não</Table.Th>
                <Table.Th>% Sim</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {depts.map((d, i) => (
                <Table.Tr key={i}>
                  <Table.Td>{d.departamento}</Table.Td>
                  <Table.Td>{d.totalRespondentes}</Table.Td>
                  <Table.Td>{d.totalSim}</Table.Td>
                  <Table.Td>{d.totalNao}</Table.Td>
                  <Table.Td>{d.percentualSim}%</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
          </Paper>

          {depts.length > 0 && (
            <Paper withBorder p="md" mt="md">
              <Text fw={600} mb="sm">
                Respondentes por departamento
              </Text>
              <div style={{ height: 280 }}>
                <ResponsiveContainer>
                  <BarChart
                    data={depts.map((d) => ({
                      nome:
                        d.departamento.length > 20
                          ? `${d.departamento.slice(0, 20)}…`
                          : d.departamento,
                      pct: d.percentualSim,
                    }))}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={chartGridStroke}
                    />
                    <XAxis
                      dataKey="nome"
                      angle={-25}
                      textAnchor="end"
                      height={80}
                      tick={{ fill: chartTickFill }}
                      stroke={chartGridStroke}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fill: chartTickFill }}
                      stroke={chartGridStroke}
                    />
                    <Tooltip
                      contentStyle={{
                        background: chartTooltipBg,
                        border: `1px solid ${chartTooltipBorder}`,
                        borderRadius: 8,
                      }}
                      labelStyle={{ color: chartTooltipColor }}
                      itemStyle={{ color: chartTooltipColor }}
                    />
                    <Bar dataKey="pct" fill="#339af0" name="% Sim" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Paper>
          )}
        </>
      )}
    </Stack>
  );
}
