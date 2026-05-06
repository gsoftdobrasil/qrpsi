import { Badge } from "@mantine/core";

const map: Record<string, { color: string; label: string }> = {
  RASCUNHO: { color: "gray", label: "Rascunho" },
  ABERTA: { color: "green", label: "Aberta" },
  ENCERRADA: { color: "orange", label: "Encerrada" },
  CANCELADA: { color: "red", label: "Cancelada" },
};

export function StatusBadge({ status }: { status: string }) {
  const m = map[status] ?? { color: "gray", label: status };
  return (
    <Badge color={m.color} variant="light">
      {m.label}
    </Badge>
  );
}
