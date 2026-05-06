import { Navigate, Route, Routes } from "react-router-dom";
import { RequireAuth } from "./components/RequireAuth";
import { AppLayout } from "./layouts/AppLayout";
import { LoginPage } from "./pages/auth/LoginPage";
import { DashboardPage } from "./pages/dashboard/DashboardPage";
import { EmpresaDetailPage } from "./pages/empresas/EmpresaDetailPage";
import { EmpresasPage } from "./pages/empresas/EmpresasPage";
import { PesquisaDetailPage } from "./pages/pesquisas/PesquisaDetailPage";
import { PesquisasPage } from "./pages/pesquisas/PesquisasPage";
import { ResponderPage } from "./pages/public/ResponderPage";
import { UsuariosPage } from "./pages/usuarios/UsuariosPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/responder/:uuidLink" element={<ResponderPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/empresas" element={<EmpresasPage />} />
          <Route path="/empresas/:id" element={<EmpresaDetailPage />} />
          <Route path="/pesquisas" element={<PesquisasPage />} />
          <Route path="/pesquisas/:id" element={<PesquisaDetailPage />} />
          <Route path="/usuarios" element={<UsuariosPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
