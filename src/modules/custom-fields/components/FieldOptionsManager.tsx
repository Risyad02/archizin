import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAllOptionsForField, addFieldOption, deactivateFieldOption } from "../service";
import { useAuthStore } from "../../../store/authStore";
import type { CustomFieldDefinition } from "../types";

export function FieldOptionsManager({ definition }: { definition: CustomFieldDefinition }) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const queryClient = useQueryClient();
  const [value, setValue] = useState("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const optionsKey = ["custom-field-options-all", definition.id];

  const { data: options = [], isLoading } = useQuery({
    queryKey: optionsKey,
    queryFn: () => getAllOptionsForField(definition.id),
  });

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser) return;
    setError(null);
    setSubmitting(true);
    try {
      await addFieldOption({ definitionId: definition.id, value, label }, currentUser);
      setValue("");
      setLabel("");
      await queryClient.invalidateQueries({ queryKey: optionsKey });
      await queryClient.invalidateQueries({ queryKey: ["custom-field-options", definition.id] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambah opsi");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeactivate(id: number) {
    if (!currentUser) return;
    await deactivateFieldOption(id, currentUser);
    await queryClient.invalidateQueries({ queryKey: optionsKey });
    await queryClient.invalidateQueries({ queryKey: ["custom-field-options", definition.id] });
  }

  return (
    <div className="mt-2 rounded-md border border-line p-3">
      <p className="section-title mb-2">Opsi untuk &quot;{definition.label}&quot;</p>

      {isLoading ? (
        <p className="text-sm text-ink-muted">Memuat...</p>
      ) : options.length === 0 ? (
        <p className="mb-2 text-sm text-ink-muted">Belum ada opsi.</p>
      ) : (
        <ul className="mb-3 space-y-1">
          {options.map((opt) => (
            <li key={opt.id} className="flex items-center justify-between gap-2 text-sm">
              <span className={`min-w-0 truncate ${opt.is_active ? "" : "text-ink-muted line-through"}`}>
                {opt.label} <span className="data-code text-ink-muted">({opt.value})</span>
                {!opt.is_active && " — nonaktif"}
              </span>
              {opt.is_active === 1 && (
                <button
                  type="button"
                  className="btn-danger btn-sm shrink-0"
                  onClick={() => handleDeactivate(opt.id)}
                >
                  Nonaktifkan
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2">
        <div>
          <label htmlFor={`opt-value-${definition.id}`} className="field-label">
            Nilai
          </label>
          <input
            id={`opt-value-${definition.id}`}
            className="field-input data-code"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor={`opt-label-${definition.id}`} className="field-label">
            Label
          </label>
          <input
            id={`opt-label-${definition.id}`}
            className="field-input"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn-secondary btn-sm" disabled={submitting}>
          {submitting ? "Menambah..." : "Tambah Opsi"}
        </button>
      </form>

      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}