import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { can } from "../lib/permissions";
import type { Action } from "../lib/permissions";

export function ProtectedRoute() {
  const currentUser = useAuthStore((s) => s.currentUser);
  if (!currentUser) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export function PermissionRoute({ action }: { action: Action }) {
  const currentUser = useAuthStore((s) => s.currentUser);
  if (!currentUser) return <Navigate to="/login" replace />;
  if (!can(currentUser.role, action)) {
    return (
      <div className="panel">
        <p role="alert" className="text-danger">
          Anda tidak punya akses ke halaman ini.
        </p>
      </div>
    );
  }
  return <Outlet />;
}