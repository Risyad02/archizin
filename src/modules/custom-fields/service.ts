import * as repo from "./repository";
import type { CustomFieldDefinition, CustomFieldOption, CustomFieldType } from "./types";
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
    isSearchable: boolean;
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

  const definitionId = await repo.createDefinition({
    permitTypeId: params.permitTypeId,
    fieldKey: params.fieldKey,
    label: params.label.trim(),
    fieldType: params.fieldType,
    isRequired: params.isRequired,
    isSearchable: params.isSearchable,
    sortOrder: existing.length,
  });

  await logAudit({
    userId: actor.id,
    action: "CREATE",
    entity: "custom_field_definitions",
    recordId: definitionId,
    oldValue: null,
    newValue: params,
  });
}

export async function getOptionsForField(definitionId: number): Promise<CustomFieldOption[]> {
  return repo.listActiveOptions(definitionId);
}

export async function getAllOptionsForField(definitionId: number): Promise<CustomFieldOption[]> {
  return repo.listAllOptions(definitionId);
}

export async function addFieldOption(
  params: { definitionId: number; value: string; label: string },
  actor: AuthUser
): Promise<void> {
  assertCan(actor.role, "custom_field:manage");

  const value = params.value.trim();
  const label = params.label.trim();
  if (!value) throw new Error("Nilai opsi wajib diisi");
  if (!label) throw new Error("Label opsi wajib diisi");

  const existing = await repo.listActiveOptions(params.definitionId);
  if (existing.some((o) => o.value === value)) {
    throw new Error(`Nilai "${value}" sudah dipakai di field ini`);
  }

  const optionId = await repo.addOption({
    definitionId: params.definitionId,
    value,
    label,
    sortOrder: existing.length,
  });

  await logAudit({
    userId: actor.id,
    action: "CREATE",
    entity: "custom_field_options",
    recordId: optionId,
    oldValue: null,
    newValue: { definitionId: params.definitionId, value, label },
  });
}

export async function deactivateFieldOption(id: number, actor: AuthUser): Promise<void> {
  assertCan(actor.role, "custom_field:manage");

  const before = await repo.getOptionById(id);
  await repo.setOptionActive(id, false);

  await logAudit({
    userId: actor.id,
    action: "UPDATE",
    entity: "custom_field_options",
    recordId: id,
    oldValue: before,
    newValue: before ? { ...before, is_active: 0 } : null,
  });
}

export async function getAllOptionsForDefinitions(
  definitionIds: number[]
): Promise<CustomFieldOption[]> {
  return repo.listAllOptionsForDefinitions(definitionIds);
}

export { FIELD_TYPES };