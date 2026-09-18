import { useState } from "react";
import { createFirstAdmin } from "../service";

export function SetupAdminPage({ onDone }: { onDone: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await createFirstAdmin({ username, password, fullName });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat akun admin");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-lg bg-white p-6 shadow">
        <h1 className="mb-4 text-lg font-semibold">Buat Akun Admin Pertama</h1>
        <p className="mb-4 text-sm text-slate-500">
          Belum ada pengguna di ArchIzin. Buat akun administrator untuk mulai.
        </p>
        <input
          className="mb-3 w-full rounded border px-3 py-2"
          placeholder="Nama lengkap"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
        <input
          className="mb-3 w-full rounded border px-3 py-2"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          className="mb-3 w-full rounded border px-3 py-2"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-blue-600 py-2 text-white disabled:opacity-50"
        >
          {loading ? "Membuat..." : "Buat Akun Admin"}
        </button>
      </form>
    </div>
  );
}