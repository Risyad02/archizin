import { useQuery } from "@tanstack/react-query";
import { getOptionsForField } from "../../custom-fields/service";
import type { CustomFieldDefinition } from "../../custom-fields/types";

interface Props {
  definition: CustomFieldDefinition;
  value: string | boolean | null;
  onChange: (value: string | boolean | null) => void;
}

function parseMultiselect(raw: string | boolean | null): string[] {
  if (typeof raw !== "string" || !raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export function DynamicFieldInput({ definition, value, onChange }: Props) {
  const id = `field-${definition.id}`;
  const commonProps = {
    className: "field-input w-full",
    id,
  };

  const needsOptions = definition.field_type === "select" || definition.field_type === "multiselect";
  const { data: options = [] } = useQuery({
    queryKey: ["custom-field-options", definition.id],
    queryFn: () => getOptionsForField(definition.id),
    enabled: needsOptions,
  });

  switch (definition.field_type) {
    case "textarea":
      return (
        <textarea
          {...commonProps}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
        />
      );
    case "boolean":
      return (
        <input
          id={id}
          type="checkbox"
          className="h-5 w-5 accent-accent"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
        />
      );
    case "date":
    case "datetime":
      return (
        <input
          {...commonProps}
          type="date"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "integer":
      return (
        <input
          {...commonProps}
          type="number"
          step={1}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "decimal":
      return (
        <input
          {...commonProps}
          type="number"
          step="any"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "select":
      return (
        <select
          {...commonProps}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
        >
          <option value="">Pilih...</option>
          {options.map((opt) => (
            <option key={opt.id} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    case "multiselect": {
      const selected = parseMultiselect(value);

      function toggle(optValue: string) {
        const next = selected.includes(optValue)
          ? selected.filter((v) => v !== optValue)
          : [...selected, optValue];
        onChange(next.length > 0 ? JSON.stringify(next) : null);
      }

      return (
        <div className="space-y-2">
          {options.length === 0 ? (
            <p className="text-sm text-ink-muted">Belum ada opsi untuk field ini.</p>
          ) : (
            options.map((opt) => (
              <label key={opt.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-accent"
                  checked={selected.includes(opt.value)}
                  onChange={() => toggle(opt.value)}
                />
                {opt.label}
              </label>
            ))
          )}
        </div>
      );
    }
    default:
      // text, url, email, phone, file_link, reference
      return (
        <input
          {...commonProps}
          type="text"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}