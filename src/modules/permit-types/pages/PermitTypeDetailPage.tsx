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
  const [form, setForm] = useState({ fieldKey: "", label: "", fieldType: "text", isRequired: false });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await addField({ permitTypeId, ...form });
      setForm({ fieldKey: "", label: "", fieldType: "text", isRequired: false });
      await queryClient.invalidateQueries({ queryKey: ["custom-fields", permitTypeId] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambah field");
    }
  }

  return (
    <div>
      <Link to="/jenis-izin" className="mb-4 inline-block text-sm text-blue-600">
        ← Kembali ke Jenis Perizinan
      </Link>
      <h1 className="mb-4 text-xl font-semibold">Custom Field</h1>

      <form onSubmit={handleSubmit} className="mb-6 flex flex-wrap items-center gap-2 rounded border bg-white p-4">
        <input
          className="rounded border px-2 py-1"
          placeholder="field_key (mis. npsn)"
          value={form.fieldKey}
          onChange={(e) => setForm((f) => ({ ...f, fieldKey: e.target.value }))}
          required
        />
        <input
          className="flex-1 rounded border px-2 py-1"
          placeholder="Label"
          value={form.label}
          onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
          required
        />
        <select
          className="rounded border px-2 py-1"
          value={form.fieldType}
          onChange={(e) => setForm((f) => ({ ...f, fieldType: e.target.value }))}
        >
          {FIELD_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <label className="flex items-center gap-1 text-sm">
          <input
            type="checkbox"
            checked={form.isRequired}
            onChange={(e) => setForm((f) => ({ ...f, isRequired: e.target.checked }))}
          />
          Wajib
        </label>
        <button type="submit" className="rounded bg-blue-600 px-4 py-1 text-white">
          Tambah Field
        </button>
      </form>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p>Memuat...</p>
      ) : (
        <ul className="divide-y rounded border bg-white text-sm">
          {fields.map((f) => (
            <li key={f.id} className="flex justify-between px-3 py-2">
              <span>{f.label} <span className="text-slate-400">({f.field_key})</span></span>
              <span className="text-slate-500">{f.field_type}{f.is_required ? " · wajib" : ""}</span>
            </li>
          ))}
          {fields.length === 0 && <li className="px-3 py-6 text-center text-slate-400">Belum ada field tambahan.</li>}
        </ul>
      )}
    </div>
  );
}