import { useState } from "react";
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
  const [menuOpen, setMenuOpen] = useState(false);

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
            {navItems.map((item) => (
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
            <button type="button" className="btn-secondary btn-sm w-full" onClick={() => setUser(null)}>
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