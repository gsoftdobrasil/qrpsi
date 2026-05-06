import {
  Button,
  Group,
  LoadingOverlay,
  Modal,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useDisclosure } from "@mantine/hooks";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";

type EmpresaRow = {
  Id: number;
  Nome: string;
  Cnpj: string | null;
};

export function EmpresasPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<EmpresaRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [opened, { open, close }] = useDisclosure(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<EmpresaRow[]>("/empresas", {
        params: q.trim() ? { q: q.trim() } : {},
      });
      setRows(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const form = useForm({
    initialValues: { nome: "", cnpj: "" },
    validate: {
      nome: (v: string) => (!v?.trim() ? "Informe o nome" : null),
    },
  });

  return (
    <Stack pos="relative">
      <LoadingOverlay visible={loading} />
      <Group justify="space-between">
        <Title order={3}>Empresas</Title>
        <Button color="indigo" onClick={open}>
          Nova empresa
        </Button>
      </Group>

      <Group>
        <TextInput
          placeholder="Buscar por nome ou CNPJ"
          value={q}
          onChange={(e) => setQ(e.currentTarget.value)}
          style={{ flex: 1, maxWidth: 360 }}
        />
        <Button variant="light" onClick={() => void load()}>
          Buscar
        </Button>
      </Group>

      <Table striped highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Nome</Table.Th>
            <Table.Th>CNPJ</Table.Th>
            <Table.Th w={120} />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((e) => (
            <Table.Tr
              key={e.Id}
              style={{ cursor: "pointer" }}
              onClick={() => navigate(`/empresas/${e.Id}`)}
            >
              <Table.Td>{e.Nome}</Table.Td>
              <Table.Td>{e.Cnpj ?? "—"}</Table.Td>
              <Table.Td>
                <Text size="sm" c="indigo">
                  Abrir
                </Text>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      <Modal opened={opened} onClose={close} title="Nova empresa">
        <form
          onSubmit={form.onSubmit(async (values) => {
            try {
              await api.post("/empresas", {
                nome: values.nome.trim(),
                cnpj: values.cnpj.trim() || null,
              });
              notifications.show({
                title: "Salvo",
                message: "Empresa cadastrada.",
                color: "green",
              });
              form.reset();
              close();
              void load();
            } catch {
              notifications.show({
                title: "Erro",
                message: "Não foi possível salvar.",
                color: "red",
              });
            }
          })}
        >
          <Stack>
            <TextInput label="Nome" {...form.getInputProps("nome")} />
            <TextInput label="CNPJ (opcional)" {...form.getInputProps("cnpj")} />
            <Button type="submit" color="indigo">
              Salvar
            </Button>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
