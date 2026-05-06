import {
  Affix,
  Alert,
  Autocomplete,
  Box,
  Button,
  Divider,
  Group,
  Loader,
  Paper,
  Radio,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { ColorSchemeToggle } from "../../components/ColorSchemeToggle";
import { notifications } from "@mantine/notifications";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../api/client";

type Pergunta = { id: number; ordem: number; texto: string };
type TemaBloco = {
  id: number;
  ordem: number;
  nome: string;
  perguntas: Pergunta[];
};

type PesquisaPub = {
  titulo: string;
  dataPesquisa: string;
  status: string;
  empresaNome: string;
};

export function ResponderPage() {
  const { uuidLink } = useParams();
  const [loading, setLoading] = useState(true);
  const [pesquisa, setPesquisa] = useState<PesquisaPub | null>(null);
  const [temas, setTemas] = useState<TemaBloco[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const [nome, setNome] = useState("");
  const [dept, setDept] = useState("");
  const [deptOpts, setDeptOpts] = useState<string[]>([]);

  const ids = useMemo(() => {
    const list: number[] = [];
    for (const t of temas) {
      for (const p of t.perguntas) list.push(p.id);
    }
    return list.sort((a, b) => a - b);
  }, [temas]);

  const [answers, setAnswers] = useState<Record<number, boolean | null>>({});

  useEffect(() => {
    let alive = true;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.get<{
          pesquisa: PesquisaPub;
          temasComPerguntas: TemaBloco[];
        }>(`public/pesquisas/${uuidLink}`);
        if (!alive) return;
        setPesquisa(data.pesquisa);

        if (data.pesquisa.status !== "ABERTA") {
          setTemas([]);
          return;
        }

        setTemas(data.temasComPerguntas);
        const init: Record<number, boolean | null> = {};
        for (const t of data.temasComPerguntas) {
          for (const p of t.perguntas) init[p.id] = null;
        }
        setAnswers(init);

        try {
          const d = await api.get<{ Nome: string }[]>(
            `public/pesquisas/${uuidLink}/departamentos`
          );
          if (alive) setDeptOpts(d.data.map((x) => x.Nome));
        } catch {
          /* opcional */
        }
      } catch {
        if (alive) setError("notfound");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [uuidLink]);

  const themeAffix = (
    <Affix position={{ top: 16, right: 16 }} zIndex={200}>
      <ColorSchemeToggle size="md" />
    </Affix>
  );

  if (loading) {
    return (
      <Box mih="100vh" bg="var(--mantine-color-body)">
        {themeAffix}
        <Stack align="center" py={80}>
          <Loader />
          <Text size="sm" c="dimmed">
            Carregando pesquisa…
          </Text>
        </Stack>
      </Box>
    );
  }

  if (error === "notfound") {
    return (
      <Box mih="100vh" bg="var(--mantine-color-body)">
        {themeAffix}
        <Paper maw={480} mx="auto" mt={48} p="xl" withBorder>
          <Title order={4}>Pesquisa não encontrada</Title>
          <Text c="dimmed" mt="sm">
            Verifique o link enviado pela sua empresa ou pelo técnico de segurança.
          </Text>
        </Paper>
      </Box>
    );
  }

  if (pesquisa?.status === "ENCERRADA") {
    return (
      <Box mih="100vh" bg="var(--mantine-color-body)">
        {themeAffix}
        <Paper maw={480} mx="auto" mt={48} p="xl" withBorder>
          <Title order={4}>Pesquisa encerrada</Title>
          <Text c="dimmed" mt="sm">
            Esta pesquisa não está mais recebendo respostas.
          </Text>
        </Paper>
      </Box>
    );
  }

  if (pesquisa?.status === "CANCELADA") {
    return (
      <Box mih="100vh" bg="var(--mantine-color-body)">
        {themeAffix}
        <Paper maw={480} mx="auto" mt={48} p="xl" withBorder>
          <Title order={4}>Pesquisa cancelada</Title>
          <Text c="dimmed" mt="sm">
            Esta pesquisa não está mais recebendo respostas.
          </Text>
        </Paper>
      </Box>
    );
  }

  if (pesquisa?.status === "RASCUNHO") {
    return (
      <Box mih="100vh" bg="var(--mantine-color-body)">
        {themeAffix}
        <Paper maw={480} mx="auto" mt={48} p="xl" withBorder>
          <Title order={4}>Pesquisa indisponível</Title>
          <Text c="dimmed" mt="sm">
            Esta pesquisa ainda não foi publicada para respostas.
          </Text>
        </Paper>
      </Box>
    );
  }

  if (done) {
    return (
      <Box mih="100vh" bg="var(--mantine-color-body)">
        {themeAffix}
        <Paper maw={520} mx="auto" mt={48} p="xl" withBorder>
          <Title order={4}>Obrigado</Title>
          <Text mt="sm">
            Resposta registrada com sucesso. Obrigado pela participação.
          </Text>
        </Paper>
      </Box>
    );
  }

  if (!pesquisa || ids.length !== 39) {
    return (
      <Box mih="100vh" bg="var(--mantine-color-body)">
        {themeAffix}
        <Paper maw={480} mx="auto" mt={48} p="xl" withBorder>
          <Text>Erro ao carregar o formulário.</Text>
        </Paper>
      </Box>
    );
  }

  const allAnswered = ids.every((id) => answers[id] !== null);

  return (
    <Box mih="100vh" bg="var(--mantine-color-body)">
      {themeAffix}
      <Stack maw={720} mx="auto" py="md" px="sm">
      <Paper p="md" radius="md" withBorder shadow="sm">
        <Title order={3} c="indigo.6">
          Questionário Riscos Psicossociais
        </Title>
        <Text fw={600} mt="xs">
          {pesquisa.empresaNome}
        </Text>
        <Text size="sm" c="dimmed">
          {pesquisa.titulo} · {String(pesquisa.dataPesquisa).slice(0, 10)}
        </Text>
      </Paper>

      <Alert color="blue" variant="light">
        Esta pesquisa é confidencial. O preenchimento do nome é opcional. As
        respostas serão utilizadas apenas de forma consolidada para análise de
        riscos psicossociais.
      </Alert>

      <Paper p="md" withBorder>
        <Stack gap="md">
          <TextInput
            label="Nome do respondente (opcional)"
            placeholder="Deixe em branco para permanecer anônimo"
            value={nome}
            onChange={(e) => setNome(e.currentTarget.value)}
          />
          <Autocomplete
            label="Departamento (opcional, recomendado)"
            placeholder="Digite ou selecione"
            data={deptOpts}
            value={dept}
            onChange={setDept}
          />
        </Stack>
      </Paper>

      {temas.map((tema) => (
        <Paper key={tema.id} p="md" withBorder radius="md">
          <Box
            mb="md"
            px="sm"
            py={8}
            style={{
              borderRadius: 8,
              background:
                "linear-gradient(135deg, var(--mantine-color-indigo-7), var(--mantine-color-indigo-6))",
              borderBottom: "1px solid var(--mantine-color-indigo-4)",
              boxShadow: "inset 0 -1px 0 rgba(255, 255, 255, 0.08)",
            }}
          >
            <Text c="white" fw={700} ta="center">
              {tema.nome}
            </Text>
          </Box>
          <Stack gap="lg">
            {tema.perguntas.map((p) => (
              <div key={p.id}>
                <Text size="sm" fw={500} mb={6}>
                  {p.ordem}. {p.texto}
                </Text>
                <Radio.Group
                  value={
                    answers[p.id] === null
                      ? ""
                      : answers[p.id]
                        ? "sim"
                        : "nao"
                  }
                  onChange={(v) =>
                    setAnswers((prev) => ({
                      ...prev,
                      [p.id]: v === "sim",
                    }))
                  }
                >
                  <Group gap="xl">
                    <Radio value="sim" label="Sim" />
                    <Radio value="nao" label="Não" />
                  </Group>
                </Radio.Group>
              </div>
            ))}
          </Stack>
        </Paper>
      ))}

      <Divider />

      <Button
        size="md"
        fullWidth
        color="indigo"
        disabled={!allAnswered}
        onClick={async () => {
          if (!allAnswered) return;
          try {
            const respostas = ids.map((pid) => ({
              perguntaId: pid,
              resposta: answers[pid] as boolean,
            }));
            await api.post(`public/pesquisas/${uuidLink}/responder`, {
              nomeRespondente: nome.trim() || undefined,
              departamento: dept.trim() || undefined,
              respostas,
            });
            setDone(true);
          } catch {
            notifications.show({
              title: "Erro ao enviar",
              message: "Tente novamente em instantes.",
              color: "red",
            });
          }
        }}
      >
        Enviar respostas
      </Button>
    </Stack>
    </Box>
  );
}
