import type { CustomFieldDefinition } from "../../custom-fields/types";

interface Props {
  definition: CustomFieldDefinition;
  value: string | boolean | null;
  onChange: (value: string | boolean | null) => void;
}

export function DynamicFieldInput({ definition, value, onChange }: Props) {
  const id = `field-${definition.id}`;
  const commonProps = {
    className: "field-input w-full",
    id,
  };

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
    default:
      // text, url, email, phone, file_link, reference, select/multiselect (dropdown menyusul jika opsinya diisi)
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