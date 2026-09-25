import type { CustomFieldDefinition } from "../../custom-fields/types";

interface Props {
  definition: CustomFieldDefinition;
  value: string | boolean | null;
  onChange: (value: string | boolean | null) => void;
}

export function DynamicFieldInput({ definition, value, onChange }: Props) {
  const commonProps = {
    className: "field-input w-full",
    id: `field-${definition.id}`,
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
          type="checkbox"
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
    case "decimal":
      return (
        <input
          {...commonProps}
          type="number"
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