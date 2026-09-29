import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { can } from "../lib/permissions";
import type { Action } from "../lib/permissions";
import { logout } from "../modules/auth/service";

const navItems: { to: string; label: string; action: Action }[] = [
  { to: "/", label: "Dashboard", action: "record:read" },
  { to: "/jenis-izin", label: "Jenis Perizinan", action: "permit_type:manage" },
  { to: "/permit-records", label: "Data Perizinan", action: "record:read" },
  { to: "/audit-log", label: "Log Aktivitas", action: "audit:view" },
];

export function AppLayout() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const setUser = useAuthStore((s) => s.setUser);
  const [menuOpen, setMenuOpen] = useState(false);
  const visibleNavItems = navItems.filter((item) => can(currentUser?.role, item.action));
  
  async function handleLogout() {
    if (currentUser) {
      await logout(currentUser);
    }
    setUser(null);
  }
  
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="shrink-0 border-b border-line bg-paper-raised md:sticky md:top-0 md:h-screen md:w-56 md:overflow-y-auto md:border-b-0 md:border-r">
        <div className="flex items-center justify-between p-4">
          <h2 className="text-lg font-semibold">ArchIzin</h2>
          <button
            type="button"
            className="btn-secondary btn-sm md:hidden"
            aria-expanded={menuOpen}
            aria-controls="main-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? "Tutup" : "Menu"}
          </button>
        </div>

        <div id="main-menu" className={`${menuOpen ? "block" : "hidden"} px-4 pb-4 md:block`}>
          <nav className="space-y-1">
            {visibleNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  isActive ? "nav-item nav-item-active" : "nav-item"
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-6 border-t border-line pt-4">
            <p className="text-sm font-medium">{currentUser?.full_name}</p>
            <p className="mb-3 text-xs text-ink-muted">{currentUser?.role}</p>
            <button type="button" className="btn-secondary btn-sm w-full" onClick={handleLogout}>
              Keluar
            </button>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-4 sm:p-6">
        <Outlet />
      </main>
    </div>
  );
}