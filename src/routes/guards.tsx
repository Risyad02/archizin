import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export function ProtectedRoute() {
  const currentUser = useAuthStore((s) => s.currentUser);
  if (!currentUser) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export function AdminRoute() {
  const currentUser = useAuthStore((s) => s.currentUser);
  if (!currentUser) return <Navigate to="/login" replace />;
  if (currentUser.role !== "ADMIN") {
    return <div className="p-6 text-red-600">Anda tidak punya akses ke halaman ini.</div>;
  }
  return <Outlet />;
}