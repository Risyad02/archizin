import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../service";
import { useAuthStore } from "../../../store/authStore";

export function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setUser = useAuthStore((s) => s.setUser);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await login(username, password);
      setUser(user);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login gagal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="panel w-full max-w-sm">
        <h1 className="text-xl font-semibold">ArchIzin</h1>
        <p className="mb-6 text-sm text-ink-muted">Masuk untuk melanjutkan.</p>

        <div className="mb-4">
          <label htmlFor="username" className="field-label">
            Username
          </label>
          <input
            id="username"
            className="field-input w-full"
            autoComplete="username"
            autoFocus
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
            autoComplete="current-password"
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
          {loading ? "Memproses..." : "Masuk"}
        </button>
      </form>
    </div>
  );
}