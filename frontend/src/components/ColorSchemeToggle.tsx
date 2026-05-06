import {
  ActionIcon,
  Tooltip,
  useComputedColorScheme,
  useMantineColorScheme,
} from "@mantine/core";
import { IconMoon, IconSun } from "@tabler/icons-react";

type Props = {
  size?: "sm" | "md" | "lg";
};

export function ColorSchemeToggle({ size = "lg" }: Props) {
  const computed = useComputedColorScheme("light", {
    getInitialValueInEffect: true,
  });
  const { toggleColorScheme } = useMantineColorScheme();

  const isDark = computed === "dark";

  return (
    <Tooltip
      label={isDark ? "Modo claro" : "Modo escuro"}
      position="bottom"
      withArrow
    >
      <ActionIcon
        onClick={() => toggleColorScheme()}
        variant="default"
        size={size}
        aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
      >
        {isDark ? <IconSun size={18} stroke={1.5} /> : <IconMoon size={18} stroke={1.5} />}
      </ActionIcon>
    </Tooltip>
  );
}
