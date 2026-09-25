import { NavLink, Outlet } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

const navItems = [
  { to: "/", label: "Dashboard" },
  { to: "/jenis-izin", label: "Jenis Perizinan" },
  { to: "/permit-records", label: "Data Perizinan" },
];

export function AppLayout() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const setUser = useAuthStore((s) => s.setUser);

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r bg-slate-50 p-4">
        <h2 className="mb-4 text-lg font-semibold">ArchIzin</h2>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `block rounded px-3 py-2 text-sm ${isActive ? "bg-blue-600 text-white" : "hover:bg-slate-200"}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-6 border-t pt-4 text-sm text-slate-500">
          <p>{currentUser?.full_name}</p>
          <p className="text-xs">{currentUser?.role}</p>
          <button className="mt-2 text-sm text-blue-600" onClick={() => setUser(null)}>
            Keluar
          </button>
        </div>
      </aside>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}