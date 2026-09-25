import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getActivePermitTypes, createPermitType } from "../service";

export function PermitTypesPage() {
 const queryClient = useQueryClient();
  const { data: items = [], isLoading: loading } = useQuery({
    queryKey: ["permit-types"],
    queryFn: getActivePermitTypes,
  });
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ code: "", name: "", description: "" });
  const [submitting, setSubmitting] = useState(false);


   async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await createPermitType(form);
      setForm({ code: "", name: "", description: "" });
      await queryClient.invalidateQueries({ queryKey: ["permit-types"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat jenis izin");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Jenis Perizinan</h1>

      <form onSubmit={handleSubmit} className="mb-6 flex flex-wrap gap-2 rounded border bg-white p-4">
        <input
          className="rounded border px-2 py-1"
          placeholder="Kode (mis. PBG)"
          value={form.code}
          onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
          required
        />
        <input
          className="flex-1 rounded border px-2 py-1"
          placeholder="Nama jenis izin"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          required
        />
        <input
          className="flex-1 rounded border px-2 py-1"
          placeholder="Deskripsi (opsional)"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
        <button type="submit" disabled={submitting} className="rounded bg-blue-600 px-4 py-1 text-white disabled:opacity-50">
          Tambah
        </button>
      </form>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p>Memuat...</p>
      ) : (
        <table className="w-full border-collapse rounded border bg-white text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-left">
              <th className="px-3 py-2">Kode</th>
              <th className="px-3 py-2">Nama</th>
              <th className="px-3 py-2">Deskripsi</th>
              <th className="px-3 py-2">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b last:border-0">
                <td className="px-3 py-2 font-mono">{item.code}</td>
                <td className="px-3 py-2">{item.name}</td>
                <td className="px-3 py-2 text-slate-500">{item.description}</td>
                <td className="px-3 py-2">
                  <Link className="text-blue-600" to={`/jenis-izin/${item.id}`}>
                    Kelola Field
                  </Link>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-slate-400">
                  Belum ada jenis izin. Tambahkan lewat form di atas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}