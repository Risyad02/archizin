import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { needsInitialSetup } from "./modules/auth/service";
import { SetupAdminPage } from "./modules/auth/pages/SetupAdminPage";
import { LoginPage } from "./modules/auth/pages/LoginPage";
import { AppLayout } from "./layouts/AppLayout";
import { ProtectedRoute, PermissionRoute } from "./routes/guards";
import { PermitTypesPage } from "./modules/permit-types/pages/PermitTypesPage";
import { PermitTypeDetailPage } from "./modules/permit-types/pages/PermitTypeDetailPage";
import { useAuthStore } from "./store/authStore";
import { PermitRecordsPage } from "./modules/permit-records/pages/PermitRecordsPage";
import { PermitRecordFormPage } from "./modules/permit-records/pages/PermitRecordFormPage";
import PermitRecordDetailPage from "./modules/permit-records/pages/PermitRecordDetailPage";
import { getStorageSettings } from "./modules/storage-settings/service"; // ganti dari needsStorageSetup
import { grantStorageScope } from "./lib/filesystem";import { SetupStoragePage } from "./modules/storage-settings/pages/SetupStoragePage";
import { AuditLogPage } from "./modules/audit-log/pages/AuditLogPage";

type BootState = "needs-admin" | "needs-storage" | "ready";

function DashboardPlaceholder() {
  return <div>Dashboard (dibangun di Fase 7)</div>;
}

function useBootStatus() {
  return useQuery<BootState>({
    queryKey: ["boot-status"],
    queryFn: async () => {
      const needsAdmin = await needsInitialSetup();
      if (needsAdmin) return "needs-admin";

      const settings = await getStorageSettings();
      if (!settings?.storageRoot) return "needs-storage";

      await grantStorageScope(settings.storageRoot); // BARU — tiap app dibuka
      return "ready";
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}

function App() {
  const { data: boot, isLoading, refetch } = useBootStatus();
  const recheckBoot = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isLoading || !boot) {
    return <div className="flex min-h-screen items-center justify-center">Memuat...</div>;
  }
  if (boot === "needs-admin") {
    return <SetupAdminPage onDone={recheckBoot} />;
  }
  if (boot === "needs-storage") {
    return <SetupStoragePage onDone={recheckBoot} />;
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
            <Route element={<PermissionRoute action="audit:view" />}>
              <Route path="/audit-log" element={<AuditLogPage />} />
            </Route>
            <Route element={<PermissionRoute action="permit_type:manage" />}>
              <Route path="/jenis-izin" element={<PermitTypesPage />} />
              <Route path="/jenis-izin/:id" element={<PermitTypeDetailPage />} />
            </Route>
            <Route path="/permit-records" element={<PermitRecordsPage />} />
            <Route element={<PermissionRoute action="record:create" />}>
              <Route path="/permit-records/new" element={<PermitRecordFormPage />} />
            </Route>
            <Route element={<PermissionRoute action="record:update" />}>
              <Route path="/permit-records/:id/edit" element={<PermitRecordFormPage />} />
            </Route>
            <Route path="/permit-records/:id" element={<PermitRecordDetailPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default App;