import {
  Box,
  Button,
  Card,
  Container,
  Group,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useNavigate, useLocation } from "react-router-dom";
import { ColorSchemeToggle } from "../../components/ColorSchemeToggle";
import { useAuth } from "../../context/AuthContext";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from =
    (location.state as { from?: { pathname: string } })?.from?.pathname ??
    "/dashboard";

  const form = useForm({
    initialValues: { emailOuNome: "", senha: "" },
    validate: {
      emailOuNome: (v: string) =>
        !v?.trim() ? "Informe e-mail ou usuário" : null,
      senha: (v: string) => (!v ? "Informe a senha" : null),
    },
  });

  return (
    <Box mih="100vh" bg="var(--mantine-color-body)">
      <Container size={420} py={80}>
        <Group justify="flex-end" mb="xs">
          <ColorSchemeToggle size="md" />
        </Group>
        <Card withBorder shadow="md" padding="xl" radius="md">
          <Stack gap="lg">
            <div>
              <Title order={2} ta="center">
                QRPSI
              </Title>
              <Text c="dimmed" size="sm" ta="center" mt={4}>
                Questionários de Riscos Psicossociais — área administrativa
              </Text>
            </div>

            <form
              onSubmit={form.onSubmit(async (values) => {
                try {
                  await login(values.emailOuNome.trim(), values.senha);
                  notifications.show({
                    title: "Bem-vindo",
                    message: "Login realizado com sucesso.",
                    color: "green",
                  });
                  navigate(from, { replace: true });
                } catch {
                  notifications.show({
                    title: "Falha no login",
                    message: "Verifique suas credenciais.",
                    color: "red",
                  });
                }
              })}
            >
              <Stack gap="md">
                <TextInput
                  label="E-mail ou nome de usuário"
                  placeholder="admin@qrpsi.local"
                  autoComplete="username"
                  {...form.getInputProps("emailOuNome")}
                />
                <PasswordInput
                  label="Senha"
                  autoComplete="current-password"
                  {...form.getInputProps("senha")}
                />
                <Button type="submit" fullWidth color="indigo">
                  Entrar
                </Button>
              </Stack>
            </form>

            <Text size="xs" c="dimmed" ta="center">
              Os colaboradores respondem pelo link público da pesquisa, sem login.
            </Text>
          </Stack>
        </Card>
      </Container>
    </Box>
  );
}
