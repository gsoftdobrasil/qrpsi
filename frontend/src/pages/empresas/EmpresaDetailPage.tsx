import {
  Button,
  Card,
  Grid,
  Group,
  LoadingOverlay,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, pesquisaPublicUrl } from "../../api/client";
import { StatusBadge } from "../../components/StatusBadge";

type PesquisaCard = {
  id: number;
  uuidLink: string;
  titulo: string;
  dataPesquisa: string;
  status: string;
  totalRespondentes: number;
  totalSim: number;
  totalNao: number;
  percentualSim: number;
};

type EmpresaDetail = {
  empresa: {
    Id: number;
    Nome: string;
    Cnpj: string | null;
    CreatedAt: string;
  };
  pesquisas: PesquisaCard[];
};

export function EmpresaDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<EmpresaDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ok = true;
    void (async () => {
      try {
        const res = await api.get<EmpresaDetail>(`/empresas/${id}`);
        if (ok) setData(res.data);
      } catch {
        notifications.show({
          title: "Erro",
          message: "Empresa não encontrada.",
          color: "red",
        });
        navigate("/empresas");
      } finally {
        if (ok) setLoading(false);
      }
    })();
    return () => {
      ok = false;
    };
  }, [id, navigate]);

  const uuidStr = (u: string) =>
    String(u).replace(/[{}]/g, "").toLowerCase();

  return (
    <Stack pos="relative">
      <LoadingOverlay visible={loading} />
      <Button variant="subtle" onClick={() => navigate("/empresas")}>
        ← Voltar
      </Button>

      {data && (
        <>
          <Group justify="space-between">
            <div>
              <Title order={3}>{data.empresa.Nome}</Title>
              <Text c="dimmed" size="sm">
                CNPJ: {data.empresa.Cnpj ?? "—"}
              </Text>
            </div>
          </Group>

          <Title order={5} mt="md">
            Pesquisas
          </Title>
          <Grid>
            {data.pesquisas.map((p) => (
              <Grid.Col key={p.id} span={{ base: 12, md: 6 }}>
                <Card withBorder shadow="sm" padding="md">
                  <Group justify="space-between" mb="xs">
                    <Text fw={600}>{p.titulo}</Text>
                    <StatusBadge status={p.status} />
                  </Group>
                  <Text size="sm" c="dimmed">
                    Data: {String(p.dataPesquisa).slice(0, 10)}
                  </Text>
                  <Table variant="unstyled" mt="sm" fz="sm">
                    <Table.Tbody>
                      <Table.Tr>
                        <Table.Td>Respondentes</Table.Td>
                        <Table.Td ta="right">{p.totalRespondentes}</Table.Td>
                      </Table.Tr>
                      <Table.Tr>
                        <Table.Td>Sim / Não</Table.Td>
                        <Table.Td ta="right">
                          {p.totalSim} / {p.totalNao}
                        </Table.Td>
                      </Table.Tr>
                      <Table.Tr>
                        <Table.Td>% Sim</Table.Td>
                        <Table.Td ta="right">{p.percentualSim}%</Table.Td>
                      </Table.Tr>
                    </Table.Tbody>
                  </Table>
                  <Group mt="md" gap="xs">
                    <Button
                      size="xs"
                      variant="light"
                      onClick={() => navigate(`/pesquisas/${p.id}`)}
                    >
                      Detalhes
                    </Button>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() =>
                        navigator.clipboard.writeText(
                          pesquisaPublicUrl(uuidStr(p.uuidLink))
                        )
                      }
                    >
                      Copiar link
                    </Button>
                  </Group>
                </Card>
              </Grid.Col>
            ))}
          </Grid>
          {data.pesquisas.length === 0 && (
            <Text c="dimmed">Nenhuma pesquisa para esta empresa.</Text>
          )}
        </>
      )}
    </Stack>
  );
}
