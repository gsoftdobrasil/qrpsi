import {
  Card,
  Grid,
  LoadingOverlay,
  Paper,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { useEffect, useState } from "react";
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
import { api } from "../../api/client";

type Resumo = {
  totalEmpresas: number;
  totalPesquisas: number;
  totalPesquisasAbertas: number;
  totalRespostasColetadas: number;
  totalSimGeral: number;
  totalNaoGeral: number;
};

type Graficos = {
  simNaoGeral: { sim: number; nao: number };
  percentualSimPorTema: {
    tema: string;
    percentualSim: number;
    alertaAltoRisco: boolean;
  }[];
  topPerguntasMaisSim: {
    texto: string;
    tema: string;
    totalSim: number;
  }[];
  pesquisasRecentes: {
    Id: number;
    Titulo: string;
    DataPesquisa: string;
    Status: string;
    empresaNome: string;
  }[];
  empresasMaiorVolume: {
    empresaNome: string;
    totalRespostas: number;
  }[];
};

const COLORS = ["#e03131", "#fd7e14", "#fcc419", "#74c0fc", "#9775fa"];

export function DashboardPage() {
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [graf, setGraf] = useState<Graficos | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ok = true;
    void (async () => {
      try {
        const [r, g] = await Promise.all([
          api.get<Resumo>("/dashboard/resumo"),
          api.get<Graficos>("/dashboard/graficos"),
        ]);
        if (ok) {
          setResumo(r.data);
          setGraf(g.data);
        }
      } finally {
        if (ok) setLoading(false);
      }
    })();
    return () => {
      ok = false;
    };
  }, []);

  const pieData =
    graf &&
    [
      { name: "Sim", value: graf.simNaoGeral.sim, fill: "#fa5252" },
      { name: "Não", value: graf.simNaoGeral.nao, fill: "#51cf66" },
    ].filter((d) => d.value > 0);

  const temaChart =
    graf?.percentualSimPorTema.map((t) => ({
      nome: t.tema.length > 28 ? `${t.tema.slice(0, 28)}…` : t.tema,
      pct: t.percentualSim,
      alerta: t.alertaAltoRisco,
    })) ?? [];

  return (
    <Stack pos="relative">
      <LoadingOverlay visible={loading} />
      <Title order={3}>Dashboard</Title>
      <Text c="dimmed" size="sm">
        Visão geral das empresas, pesquisas e respostas consolidadas.
      </Text>

      <Grid>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card withBorder radius="md">
            <Text size="xs" c="dimmed">
              Empresas
            </Text>
            <Text fw={700} size="xl">
              {resumo?.totalEmpresas ?? "—"}
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card withBorder radius="md">
            <Text size="xs" c="dimmed">
              Pesquisas
            </Text>
            <Text fw={700} size="xl">
              {resumo?.totalPesquisas ?? "—"}
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card withBorder radius="md">
            <Text size="xs" c="dimmed">
              Pesquisas abertas
            </Text>
            <Text fw={700} size="xl">
              {resumo?.totalPesquisasAbertas ?? "—"}
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card withBorder radius="md">
            <Text size="xs" c="dimmed">
              Respostas coletadas
            </Text>
            <Text fw={700} size="xl">
              {resumo?.totalRespostasColetadas ?? "—"}
            </Text>
          </Card>
        </Grid.Col>
      </Grid>

      <Grid>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper withBorder p="md" radius="md">
            <Text fw={600} mb="sm">
              Respostas Sim × Não (geral)
            </Text>
            <div style={{ width: "100%", height: 280 }}>
              {pieData && pieData.length > 0 ? (
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Text c="dimmed" size="sm">
                  Sem dados ainda.
                </Text>
              )}
            </div>
          </Paper>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper withBorder p="md" radius="md">
            <Text fw={600} mb="sm">
              % Sim por tema
            </Text>
            <div style={{ width: "100%", height: 280 }}>
              {temaChart.length > 0 ? (
                <ResponsiveContainer>
                  <BarChart
                    data={temaChart}
                    layout="vertical"
                    margin={{ left: 8, right: 16 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis type="category" dataKey="nome" width={120} />
                    <Tooltip />
                    <Bar dataKey="pct" name="% Sim" radius={[0, 4, 4, 0]}>
                      {temaChart.map((e, i) => (
                        <Cell
                          key={i}
                          fill={e.alerta ? "#fa5252" : COLORS[i % COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Text c="dimmed" size="sm">
                  Sem dados ainda.
                </Text>
              )}
            </div>
          </Paper>
        </Grid.Col>
      </Grid>

      <Grid>
        <Grid.Col span={{ base: 12 }}>
          <Paper withBorder p="md" radius="md">
            <Text fw={600} mb="sm">
              Perguntas com mais respostas “Sim” (top 10)
            </Text>
            <div style={{ width: "100%", height: 320 }}>
              {graf && graf.topPerguntasMaisSim.length > 0 ? (
                <ResponsiveContainer>
                  <BarChart
                    data={graf.topPerguntasMaisSim.map((p) => ({
                      nome:
                        p.texto.length > 40
                          ? `${p.texto.slice(0, 40)}…`
                          : p.texto,
                      sim: p.totalSim,
                    }))}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="nome" width={200} />
                    <Tooltip />
                    <Bar dataKey="sim" fill="#9775fa" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Text c="dimmed" size="sm">
                  Sem dados ainda.
                </Text>
              )}
            </div>
          </Paper>
        </Grid.Col>
      </Grid>

      <Grid>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper withBorder p="md" radius="md">
            <Text fw={600} mb="sm">
              Pesquisas recentes
            </Text>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Empresa</Table.Th>
                  <Table.Th>Título</Table.Th>
                  <Table.Th>Status</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {graf?.pesquisasRecentes?.map((p) => (
                  <Table.Tr key={p.Id}>
                    <Table.Td>{p.empresaNome}</Table.Td>
                    <Table.Td>{p.Titulo}</Table.Td>
                    <Table.Td>{p.Status}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper withBorder p="md" radius="md">
            <Text fw={600} mb="sm">
              Empresas com maior volume de respostas
            </Text>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Empresa</Table.Th>
                  <Table.Th>Respostas</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {graf?.empresasMaiorVolume?.map((e, i) => (
                  <Table.Tr key={i}>
                    <Table.Td>{e.empresaNome}</Table.Td>
                    <Table.Td>{e.totalRespostas}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
