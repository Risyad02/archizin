import { getDb } from "../../database/db";
import type { CustomFieldDefinition, CustomFieldOption } from "./types";

export async function listByPermitType(permitTypeId: number): Promise<CustomFieldDefinition[]> {
  const db = await getDb();
  return db.select<CustomFieldDefinition[]>(
    `SELECT id, permit_type_id, field_key, label, field_type, is_required, sort_order
     FROM custom_field_definitions
     WHERE permit_type_id = $1
     ORDER BY sort_order, id`,
    [permitTypeId]
  );
}

export async function createDefinition(params: {
  permitTypeId: number;
  fieldKey: string;
  label: string;
  fieldType: string;
  isRequired: boolean;
  sortOrder: number;
}): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO custom_field_definitions
       (permit_type_id, field_key, label, field_type, is_required, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      params.permitTypeId,
      params.fieldKey,
      params.label,
      params.fieldType,
      params.isRequired ? 1 : 0,
      params.sortOrder,
    ]
  );
  return result.lastInsertId as number;
}

export async function deleteDefinition(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM custom_field_options WHERE custom_field_definition_id = $1", [id]);
  await db.execute("DELETE FROM custom_field_definitions WHERE id = $1", [id]);
}

export async function listOptions(definitionId: number): Promise<CustomFieldOption[]> {
  const db = await getDb();
  return db.select<CustomFieldOption[]>(
    "SELECT id, custom_field_definition_id, value, label, sort_order FROM custom_field_options WHERE custom_field_definition_id = $1 ORDER BY sort_order",
    [definitionId]
  );
}

export async function addOption(params: {
  definitionId: number;
  value: string;
  label: string;
  sortOrder: number;
}): Promise<void> {
  const db = await getDb();
  await db.execute(
    "INSERT INTO custom_field_options (custom_field_definition_id, value, label, sort_order) VALUES ($1, $2, $3, $4)",
    [params.definitionId, params.value, params.label, params.sortOrder]
  );
}