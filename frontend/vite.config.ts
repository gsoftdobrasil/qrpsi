import react from "@vitejs/plugin-react";
import postcssPresetMantine from "postcss-preset-mantine";
import postcssSimpleVars from "postcss-simple-vars";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  css: {
    postcss: {
      plugins: [
        postcssPresetMantine(),
        postcssSimpleVars({
          variables: {
            "mantine-breakpoint-xs": "36em",
            "mantine-breakpoint-sm": "48em",
            "mantine-breakpoint-md": "62em",
            "mantine-breakpoint-lg": "75em",
            "mantine-breakpoint-xl": "88em",
          },
        }),
      ],
    },
  },
  server: {
    port: 5173,
    /** Permite acessar o dev server pelo IP da LAN (celular na mesma rede) */
    host: true,
    proxy: {
      "/api": {
        target: "http://localhost:7891",
        changeOrigin: true,
      },
    },
  },
});
