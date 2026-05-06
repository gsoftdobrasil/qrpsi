import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/notifications/styles.css";
import {
  ColorSchemeScript,
  MantineProvider,
  localStorageColorSchemeManager,
} from "@mantine/core";
import { DatesProvider } from "@mantine/dates";
import { Notifications } from "@mantine/notifications";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { COLOR_SCHEME_STORAGE_KEY } from "./constants/colorSchemeStorage";
import { AuthProvider } from "./context/AuthContext";
import { qrpsiCssVariablesResolver, qrpsiTheme } from "./theme/qrpsiTheme";

dayjs.locale("pt-br");

const colorSchemeManager = localStorageColorSchemeManager({
  key: COLOR_SCHEME_STORAGE_KEY,
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ColorSchemeScript
      defaultColorScheme="light"
      localStorageKey={COLOR_SCHEME_STORAGE_KEY}
    />
    <BrowserRouter>
      <MantineProvider
        theme={qrpsiTheme}
        cssVariablesResolver={qrpsiCssVariablesResolver}
        defaultColorScheme="light"
        colorSchemeManager={colorSchemeManager}
      >
        <DatesProvider settings={{ locale: "pt-br", firstDayOfWeek: 1 }}>
          <Notifications position="top-right" zIndex={4000} />
          <AuthProvider>
            <App />
          </AuthProvider>
        </DatesProvider>
      </MantineProvider>
    </BrowserRouter>
  </StrictMode>
);
