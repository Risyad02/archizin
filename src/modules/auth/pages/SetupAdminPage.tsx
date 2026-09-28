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
    <div className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="panel w-full max-w-sm">
        <h1 className="text-xl font-semibold">Buat Akun Admin Pertama</h1>
        <p className="mb-6 text-sm text-ink-muted">
          Belum ada pengguna di ArchIzin. Buat akun administrator untuk mulai.
        </p>

        <div className="mb-4">
          <label htmlFor="fullName" className="field-label">
            Nama Lengkap
          </label>
          <input
            id="fullName"
            className="field-input w-full"
            autoComplete="name"
            autoFocus
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </div>

        <div className="mb-4">
          <label htmlFor="username" className="field-label">
            Username
          </label>
          <input
            id="username"
            className="field-input w-full"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        <div className="mb-4">
          <label htmlFor="password" className="field-label">
            Password
          </label>
          <input
            id="password"
            className="field-input w-full"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && (
          <p role="alert" className="mb-4 text-sm text-danger">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Membuat..." : "Buat Akun Admin"}
        </button>
      </form>
    </div>
  );
}