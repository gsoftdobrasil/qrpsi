import {
  Button,
  Code,
  Group,
  LoadingOverlay,
  Paper,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, pesquisaPublicUrl } from "../../api/client";
import { StatusBadge } from "../../components/StatusBadge";

type EmpresaOpt = { value: string; label: string };
type PesquisaRow = {
  id: number;
  uuidLink: string;
  titulo: string;
  dataPesquisa: string;
  status: string;
  empresaNome: string;
  totalRespostas: number;
};

export function PesquisasPage() {
  const navigate = useNavigate();
  const [empresas, setEmpresas] = useState<EmpresaOpt[]>([]);
  const [rows, setRows] = useState<PesquisaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [gerado, setGerado] = useState<string | null>(null);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [e, p] = await Promise.all([
        api.get<{ Id: number; Nome: string }[]>("/empresas"),
        api.get<PesquisaRow[]>("/pesquisas"),
      ]);
      setEmpresas(
        e.data.map((x) => ({
          value: String(x.Id),
          label: x.Nome,
        }))
      );
      setRows(p.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const form = useForm({
    initialValues: {
      empresaId: "",
      titulo: "",
      dataPesquisa: new Date() as Date | null,
    },
    validate: {
      empresaId: (v: string) => (!v ? "Selecione a empresa" : null),
      titulo: (v: string) => (!v?.trim() ? "Informe o título" : null),
      dataPesquisa: (v: Date | null) => (!v ? "Informe a data" : null),
    },
  });

  const uuidStr = (u: string) =>
    String(u).replace(/[{}]/g, "").toLowerCase();

  return (
    <Stack pos="relative">
      <LoadingOverlay visible={loading} />
      <Title order={3}>Links / Pesquisas</Title>
      <Text c="dimmed" size="sm">
        Gere um link público por empresa. Os colaboradores respondem sem login.
      </Text>

      <form
        onSubmit={form.onSubmit(async (v) => {
          try {
            const d = v.dataPesquisa!;
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            const res = await api.post<{
              pesquisa: { uuidLink: string };
            }>("/pesquisas", {
              empresaId: Number(v.empresaId),
              titulo: v.titulo.trim(),
              dataPesquisa: `${y}-${m}-${day}`,
              status: "ABERTA",
            });
            const link = pesquisaPublicUrl(
              uuidStr(res.data.pesquisa.uuidLink as unknown as string)
            );
            setGerado(link);
            notifications.show({
              title: "Pesquisa criada",
              message: "Link gerado com sucesso.",
              color: "green",
            });
            form.reset();
            void loadAll();
          } catch {
            notifications.show({
              title: "Erro",
              message: "Não foi possível criar a pesquisa.",
              color: "red",
            });
          }
        })}
      >
        <Stack gap="sm" maw={520}>
          <Select
            label="Empresa"
            placeholder="Selecione"
            data={empresas}
            searchable
            {...form.getInputProps("empresaId")}
          />
          <TextInput label="Título da pesquisa" {...form.getInputProps("titulo")} />
          <DateInput
            label="Data da pesquisa"
            valueFormat="DD/MM/YYYY"
            {...form.getInputProps("dataPesquisa")}
          />
          <Button type="submit" color="indigo">
            Gerar link
          </Button>
        </Stack>
      </form>

      {gerado && (
        <Paper withBorder shadow="sm" p="md" radius="md" maw={720}>
          <Stack gap="sm">
            <Text size="sm" fw={600}>
              Link público
            </Text>
            <Code
              block
              fz="sm"
              style={{ wordBreak: "break-all", lineHeight: 1.5 }}
            >
              {gerado}
            </Code>
            <Group gap="sm">
              <Button
                size="sm"
                color="indigo"
                variant="light"
                onClick={() => {
                  void navigator.clipboard.writeText(gerado);
                  notifications.show({ message: "Copiado", color: "teal" });
                }}
              >
                Copiar link
              </Button>
              <Button
                size="sm"
                variant="default"
                component="a"
                href={gerado}
                target="_blank"
                rel="noreferrer"
              >
                Abrir formulário
              </Button>
            </Group>
          </Stack>
        </Paper>
      )}

      <Title order={5} mt="xl">
        Pesquisas criadas
      </Title>
      <Table.ScrollContainer minWidth={720} type="native">
        <Table striped highlightOnHover withTableBorder layout="fixed">
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ width: "14%" }}>Empresa</Table.Th>
              <Table.Th style={{ width: "36%" }}>Título</Table.Th>
              <Table.Th style={{ width: "11%" }}>Data</Table.Th>
              <Table.Th style={{ width: "10%" }}>Status</Table.Th>
              <Table.Th style={{ width: "8%" }}>Respostas</Table.Th>
              <Table.Th style={{ width: "21%" }}>Ações</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((r) => (
              <Table.Tr key={r.id}>
                <Table.Td>
                  <Text size="sm" lineClamp={2}>
                    {r.empresaNome}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Tooltip
                    label={r.titulo}
                    multiline
                    maw={420}
                    withArrow
                    withinPortal
                  >
                    <Text size="sm" lineClamp={2} style={{ cursor: "default" }}>
                      {r.titulo}
                    </Text>
                  </Tooltip>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" ff="monospace">
                    {String(r.dataPesquisa).slice(0, 10)}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <StatusBadge status={r.status} />
                </Table.Td>
                <Table.Td style={{ textAlign: "right" }}>
                  <Text size="sm" span>
                    {r.totalRespostas}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Group gap={6} wrap="nowrap">
                    <Button
                      size="compact-sm"
                      variant="light"
                      color="indigo"
                      onClick={() => {
                        void navigator.clipboard.writeText(
                          pesquisaPublicUrl(uuidStr(r.uuidLink))
                        );
                        notifications.show({
                          message: "Link copiado",
                          color: "teal",
                        });
                      }}
                    >
                      Copiar
                    </Button>
                    <Button
                      size="compact-sm"
                      variant="light"
                      color="gray"
                      onClick={() => navigate(`/pesquisas/${r.id}`)}
                    >
                      Detalhes
                    </Button>
                    {r.status === "ABERTA" && (
                      <Button
                        size="compact-sm"
                        color="orange"
                        variant="light"
                        onClick={async () => {
                          try {
                            await api.patch(`/pesquisas/${r.id}/status`, {
                              status: "ENCERRADA",
                            });
                            notifications.show({
                              title: "Encerrada",
                              message: "A pesquisa não aceita novas respostas.",
                              color: "orange",
                            });
                            void loadAll();
                          } catch {
                            notifications.show({
                              title: "Erro",
                              message: "Não foi possível encerrar.",
                              color: "red",
                            });
                          }
                        }}
                      >
                        Encerrar
                      </Button>
                    )}
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Stack>
  );
}
