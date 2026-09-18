import { useEffect, useState } from "react";
import { needsInitialSetup } from "./modules/auth/service";
import { SetupAdminPage } from "./modules/auth/pages/SetupAdminPage";
import { LoginPage } from "./modules/auth/pages/LoginPage";
import { useAuthStore } from "./store/authStore";
import "./App.css";

type BootState = "loading" | "needs-setup" | "ready";

function App() {
  const [boot, setBoot] = useState<BootState>("loading");
  const currentUser = useAuthStore((s) => s.currentUser);
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    needsInitialSetup().then((needsSetup) => {
      setBoot(needsSetup ? "needs-setup" : "ready");
    });
  }, []);

  if (boot === "loading") {
    return <div className="flex min-h-screen items-center justify-center">Memuat...</div>;
  }

  if (boot === "needs-setup") {
    return <SetupAdminPage onDone={() => setBoot("ready")} />;
  }

  if (!currentUser) {
    return <LoginPage />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <p className="mb-2 text-lg">Selamat datang, {currentUser.full_name}</p>
        <p className="mb-4 text-sm text-slate-500">Role: {currentUser.role}</p>
        <button
          className="rounded bg-slate-200 px-4 py-2"
          onClick={() => setUser(null)}
        >
          Keluar
        </button>
      </div>
    </div>
  );
}

export default App;