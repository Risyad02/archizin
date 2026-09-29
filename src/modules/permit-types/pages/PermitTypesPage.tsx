import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getActivePermitTypes, createPermitType } from "../service";
import { useAuthStore } from "../../../store/authStore";

export function PermitTypesPage() {
  const queryClient = useQueryClient();
  const { data: items = [], isLoading: loading } = useQuery({
    queryKey: ["permit-types"],
    queryFn: getActivePermitTypes,
  });
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ code: "", name: "", description: "" });
  const [submitting, setSubmitting] = useState(false);
  const currentUser = useAuthStore((s) => s.currentUser);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await createPermitType(form, currentUser!);
      setForm({ code: "", name: "", description: "" });
      await queryClient.invalidateQueries({ queryKey: ["permit-types"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat jenis izin");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Jenis Perizinan</h1>

      <section className="panel">
        <h2 className="section-title mb-3">Tambah Jenis Izin</h2>
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[10rem_1fr_1fr_auto] lg:items-end"
        >
          <div>
            <label htmlFor="permitTypeCode" className="field-label">
              Kode <span className="text-danger">*</span>
            </label>
            <input
              id="permitTypeCode"
              className="field-input data-code w-full"
              placeholder="mis. PBG"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              required
            />
          </div>

          <div>
            <label htmlFor="permitTypeName" className="field-label">
              Nama Jenis Izin <span className="text-danger">*</span>
            </label>
            <input
              id="permitTypeName"
              className="field-input w-full"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>

          <div>
            <label htmlFor="permitTypeDescription" className="field-label">
              Deskripsi
            </label>
            <input
              id="permitTypeDescription"
              className="field-input w-full"
              placeholder="Opsional"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <button type="submit" disabled={submitting} className="btn-primary sm:col-span-2 lg:col-span-1">
            {submitting ? "Menambahkan..." : "Tambah"}
          </button>
        </form>

        {error && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {error}
          </p>
        )}
      </section>

      <section className="panel">
        <h2 className="section-title mb-3">Daftar Jenis Izin</h2>

        {loading ? (
          <p className="text-sm text-ink-muted">Memuat...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-ink-muted">
            Belum ada jenis izin. Tambahkan lewat form di atas.
          </p>
        ) : (
          <>
            {/* Layar lebar: tabel */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-ink-muted">
                    <th className="px-3 py-2 font-medium">Kode</th>
                    <th className="px-3 py-2 font-medium">Nama</th>
                    <th className="px-3 py-2 font-medium">Deskripsi</th>
                    <th className="px-3 py-2">
                      <span className="sr-only">Aksi</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-line last:border-0 hover:bg-accent-soft/40"
                    >
                      <td className="data-code px-3 py-3">{item.code}</td>
                      <td className="px-3 py-3">{item.name}</td>
                      <td className="px-3 py-3 text-ink-muted">{item.description ?? "-"}</td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end">
                          <Link to={`/jenis-izin/${item.id}`} className="btn-secondary btn-sm">
                            Kelola Field
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Layar sempit: kartu per jenis izin */}
            <ul className="space-y-3 md:hidden">
              {items.map((item) => (
                <li key={item.id} className="item-row">
                  <p className="data-code">{item.code}</p>
                  <p className="font-medium">{item.name}</p>
                  {item.description && (
                    <p className="text-sm text-ink-muted">{item.description}</p>
                  )}
                  <div className="mt-3">
                    <Link to={`/jenis-izin/${item.id}`} className="btn-secondary btn-sm">
                      Kelola Field
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}