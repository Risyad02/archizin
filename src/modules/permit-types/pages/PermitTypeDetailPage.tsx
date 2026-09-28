import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getFieldsForPermitType, addField, FIELD_TYPES } from "../../custom-fields/service";

export function PermitTypeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const permitTypeId = Number(id);
  const queryClient = useQueryClient();

  const { data: fields = [], isLoading: loading } = useQuery({
    queryKey: ["custom-fields", permitTypeId],
    queryFn: () => getFieldsForPermitType(permitTypeId),
  });

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ fieldKey: "", label: "", fieldType: "text", isRequired: false });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await addField({ permitTypeId, ...form });
      setForm({ fieldKey: "", label: "", fieldType: "text", isRequired: false });
      await queryClient.invalidateQueries({ queryKey: ["custom-fields", permitTypeId] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambah field");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/jenis-izin" className="btn-text mb-2 inline-block text-sm">
          ← Kembali ke Jenis Perizinan
        </Link>
        <h1 className="text-xl font-semibold">Custom Field</h1>
      </div>

      <section className="panel">
        <h2 className="section-title mb-3">Tambah Field</h2>
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[12rem_1fr_11rem]"
        >
          <div>
            <label htmlFor="fieldKey" className="field-label">
              Kunci Field <span className="text-danger">*</span>
            </label>
            <input
              id="fieldKey"
              className="field-input data-code w-full"
              placeholder="mis. npsn"
              value={form.fieldKey}
              onChange={(e) => setForm((f) => ({ ...f, fieldKey: e.target.value }))}
              required
            />
          </div>

          <div>
            <label htmlFor="fieldLabel" className="field-label">
              Label <span className="text-danger">*</span>
            </label>
            <input
              id="fieldLabel"
              className="field-input w-full"
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              required
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-1">
            <label htmlFor="fieldType" className="field-label">
              Tipe
            </label>
            <select
              id="fieldType"
              className="field-input w-full"
              value={form.fieldType}
              onChange={(e) => setForm((f) => ({ ...f, fieldType: e.target.value }))}
            >
              {FIELD_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between lg:col-span-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-5 w-5 accent-accent"
                checked={form.isRequired}
                onChange={(e) => setForm((f) => ({ ...f, isRequired: e.target.checked }))}
              />
              Wajib diisi
            </label>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? "Menambahkan..." : "Tambah Field"}
            </button>
          </div>
        </form>

        {error && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {error}
          </p>
        )}
      </section>

      <section className="panel">
        <h2 className="section-title mb-3">Daftar Field</h2>

        {loading ? (
          <p className="text-sm text-ink-muted">Memuat...</p>
        ) : fields.length === 0 ? (
          <p className="text-sm text-ink-muted">Belum ada field tambahan.</p>
        ) : (
          <ul className="space-y-2">
            {fields.map((f) => (
              <li
                key={f.id}
                className="item-row flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium">{f.label}</p>
                  <p className="data-code truncate text-ink-muted">{f.field_key}</p>
                </div>
                <p className="shrink-0 text-sm text-ink-muted">
                  {f.field_type}
                  {f.is_required ? " · wajib" : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}