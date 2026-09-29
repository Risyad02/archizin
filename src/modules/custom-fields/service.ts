import * as repo from "./repository";
import type { CustomFieldDefinition, CustomFieldType } from "./types";
import { assertCan } from "../../lib/permissions";
import type { AuthUser } from "../auth/types";
import { logAudit } from "../../lib/audit";

const FIELD_TYPES: CustomFieldType[] = [
  "text", "textarea", "integer", "decimal", "date", "datetime",
  "boolean", "select", "multiselect", "url", "email", "phone",
  "file_link", "reference",
];

export function validateFieldKey(key: string): string | null {
  if (!/^[a-z][a-z0-9_]{1,49}$/.test(key)) {
    return "Field key harus huruf kecil, angka, underscore, diawali huruf (contoh: npsn, kepala_sekolah)";
  }
  return null;
}

export function isValidFieldType(type: string): type is CustomFieldType {
  return (FIELD_TYPES as string[]).includes(type);
}

export async function getFieldsForPermitType(permitTypeId: number): Promise<CustomFieldDefinition[]> {
  return repo.listByPermitType(permitTypeId);
}

export async function addField(
  params: {
    permitTypeId: number;
    fieldKey: string;
    label: string;
    fieldType: string;
    isRequired: boolean;
  },
  actor: AuthUser
): Promise<void> {
  assertCan(actor.role, "custom_field:manage");

  const keyError = validateFieldKey(params.fieldKey);
  if (keyError) throw new Error(keyError);
  if (!isValidFieldType(params.fieldType)) throw new Error(`Tipe field "${params.fieldType}" tidak dikenal`);
  if (params.label.trim().length < 2) throw new Error("Label field minimal 2 karakter");

  const existing = await repo.listByPermitType(params.permitTypeId);
  if (existing.some((f) => f.field_key === params.fieldKey)) {
    throw new Error(`Field key "${params.fieldKey}" sudah dipakai di jenis izin ini`);
  }

  await repo.createDefinition({
    permitTypeId: params.permitTypeId,
    fieldKey: params.fieldKey,
    label: params.label.trim(),
    fieldType: params.fieldType,
    isRequired: params.isRequired,
    sortOrder: existing.length,
  });

  const after = await repo.listByPermitType(params.permitTypeId);
  const created = after.find((f) => f.field_key === params.fieldKey);
  await logAudit({
    userId: actor.id,
    action: "CREATE",
    entity: "custom_field_definitions",
    recordId: created?.id ?? null,
    oldValue: null,
    newValue: params,
  });
}

export { FIELD_TYPES };