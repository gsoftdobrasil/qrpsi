import { Card, Paper, createTheme } from "@mantine/core";
import type { CSSVariablesResolver, MantineTheme } from "@mantine/core";

/**
 * Variáveis em light/dark para camadas (canvas ≠ superfície dos cards).
 */
export const qrpsiCssVariablesResolver: CSSVariablesResolver = (
  theme: MantineTheme
) => ({
  variables: {},
  light: {
    /* Canvas da aplicação (atrás dos cards) */
    "--mantine-color-body": theme.colors.gray[1],
    "--qrpsi-elevated": theme.white,
    "--qrpsi-border-subtle": theme.colors.gray[3],
    "--qrpsi-header-bg": theme.white,
    "--qrpsi-navbar-bg": theme.white,
  },
  dark: {
    "--mantine-color-body": theme.colors.dark[8],
    "--qrpsi-elevated": theme.colors.dark[6],
    "--qrpsi-border-subtle": theme.colors.dark[4],
    "--qrpsi-header-bg": theme.colors.dark[7],
    "--qrpsi-navbar-bg": theme.colors.dark[7],
  },
});

export const qrpsiTheme = createTheme({
  primaryColor: "indigo",
  defaultRadius: "md",
  fontFamily:
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  headings: {
    fontWeight: "600",
  },
  shadows: {
    xs: "0 1px 2px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.04)",
    sm: "0 1px 3px rgba(0, 0, 0, 0.06), 0 2px 8px rgba(0, 0, 0, 0.06)",
    md: "0 4px 12px rgba(0, 0, 0, 0.07), 0 2px 6px rgba(0, 0, 0, 0.05)",
  },
  components: {
    Card: Card.extend({
      defaultProps: {
        withBorder: true,
        shadow: "sm",
        radius: "md",
        padding: "lg",
      },
      styles: {
        root: {
          backgroundColor: "var(--qrpsi-elevated)",
          borderColor: "var(--qrpsi-border-subtle)",
        },
      },
    }),
    Paper: Paper.extend({
      defaultProps: {
        withBorder: true,
        shadow: "xs",
        radius: "md",
      },
      styles: {
        root: {
          backgroundColor: "var(--qrpsi-elevated)",
          borderColor: "var(--qrpsi-border-subtle)",
        },
      },
    }),
  },
});
