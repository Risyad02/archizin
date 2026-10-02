export type CustomFieldType =
  | "text" | "textarea" | "integer" | "decimal" | "date" | "datetime"
  | "boolean" | "select" | "multiselect" | "url" | "email" | "phone"
  | "file_link" | "reference";

export interface CustomFieldDefinition {
  id: number;
  permit_type_id: number;
  field_key: string;
  label: string;
  field_type: CustomFieldType;
  is_required: number;
  is_searchable: number; 
  sort_order: number;
}

export interface CustomFieldOption {
  id: number;
  custom_field_definition_id: number;
  value: string;
  label: string;
  sort_order: number;
  is_active: number; 
}