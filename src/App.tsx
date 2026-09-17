import { useEffect, useState } from "react";
import { getDb } from "./database/db";

function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDb()
      .then(() => setReady(true))
      .catch((e) => setError(String(e)));
  }, []);

  if (error) return <div>Gagal inisialisasi database: {error}</div>;
  if (!ready) return <div>Menyiapkan database…</div>;

  return <div>ArchIzin — Foundation siap. Database ter-migrasi.</div>;
}

export default App;