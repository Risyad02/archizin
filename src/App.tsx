import { useEffect, useState } from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { needsInitialSetup } from "./modules/auth/service";
import { SetupAdminPage } from "./modules/auth/pages/SetupAdminPage";
import { LoginPage } from "./modules/auth/pages/LoginPage";
import { AppLayout } from "./layouts/AppLayout";
import { ProtectedRoute, AdminRoute } from "./routes/guards";
import { PermitTypesPage } from "./modules/permit-types/pages/PermitTypesPage";
import { PermitTypeDetailPage } from "./modules/permit-types/pages/PermitTypeDetailPage";
import { useAuthStore } from "./store/authStore";
import { PermitRecordsPage }  from "./modules/permit-records/pages/PermitRecordsPage";
import { PermitRecordFormPage }  from "./modules/permit-records/pages/PermitRecordFormPage";
import  PermitRecordDetailPage from "./modules/permit-records/pages/PermitRecordDetailPage";

type BootState = "loading" | "needs-setup" | "ready";

function DashboardPlaceholder() {
  return <div>Dashboard (dibangun di Fase 7)</div>;
}

function App() {
  const [boot, setBoot] = useState<BootState>("loading");

  useEffect(() => {
    needsInitialSetup().then((needsSetup) => setBoot(needsSetup ? "needs-setup" : "ready"));
  }, []);

  if (boot === "loading") {
    return <div className="flex min-h-screen items-center justify-center">Memuat...</div>;
  }
  if (boot === "needs-setup") {
    return <SetupAdminPage onDone={() => setBoot("ready")} />;
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={
          useAuthStore.getState().currentUser ? <Navigate to="/" replace /> : <LoginPage />
        } />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout /> } >
            <Route path="/" element={<DashboardPlaceholder />} />
            <Route element={<AdminRoute />}>
              <Route path="/jenis-izin" element={<PermitTypesPage />} />
              <Route path="/jenis-izin/:id" element={<PermitTypeDetailPage />} />
            </Route>
            <Route path="/permit-records" element={<PermitRecordsPage />} />
            <Route path="/permit-records/new" element={<PermitRecordFormPage />} />
            <Route path="/permit-records/:id/edit" element={<PermitRecordFormPage />} />
            <Route path="/permit-records/:id" element={<PermitRecordDetailPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default App;