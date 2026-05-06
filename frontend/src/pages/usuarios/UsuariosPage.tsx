import {
  Button,
  LoadingOverlay,
  Modal,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useEffect, useState } from "react";
import { api } from "../../api/client";

type UserRow = {
  Id: number;
  Nome: string;
  Email: string;
};

export function UsuariosPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [opened, { open, close }] = useDisclosure(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<UserRow[]>("/usuarios");
      setRows(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const form = useForm({
    initialValues: { nome: "", email: "", senha: "" },
    validate: {
      nome: (v: string) => (!v?.trim() ? "Informe o nome" : null),
      email: (v: string) => (!v?.includes("@") ? "E-mail inválido" : null),
      senha: (v: string) =>
        !v || v.length < 6 ? "Mínimo 6 caracteres" : null,
    },
  });

  return (
    <Stack pos="relative">
      <LoadingOverlay visible={loading} />
      <Stack gap={4}>
        <Title order={3}>Usuários</Title>
        <Text size="sm" c="dimmed">
          Cadastro interno do sistema (área administrativa).
        </Text>
      </Stack>

      <Button maw={200} color="indigo" onClick={open}>
        Novo usuário
      </Button>

      <Table striped highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Nome</Table.Th>
            <Table.Th>E-mail</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((u) => (
            <Table.Tr key={u.Id}>
              <Table.Td>{u.Nome}</Table.Td>
              <Table.Td>{u.Email}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      <Modal opened={opened} onClose={close} title="Novo usuário">
        <form
          onSubmit={form.onSubmit(async (v) => {
            try {
              await api.post("/usuarios", {
                nome: v.nome.trim(),
                email: v.email.trim(),
                senha: v.senha,
              });
              notifications.show({
                title: "Usuário criado",
                message: "Conta registrada com sucesso.",
                color: "green",
              });
              form.reset();
              close();
              void load();
            } catch {
              notifications.show({
                title: "Erro",
                message: "Não foi possível criar o usuário.",
                color: "red",
              });
            }
          })}
        >
          <Stack>
            <TextInput label="Nome" {...form.getInputProps("nome")} />
            <TextInput label="E-mail" {...form.getInputProps("email")} />
            <TextInput
              type="password"
              label="Senha"
              {...form.getInputProps("senha")}
            />
            <Button type="submit" color="indigo">
              Salvar
            </Button>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
