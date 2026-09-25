import * as repo from "./repository";
import { logAudit } from "../../lib/audit";
import { deriveTahunBulan, daysUntil } from "../../lib/dateHelpers";
import { getFieldsForPermitType } from "../custom-fields/service";
import type { PermitRecordFormInput, PermitRecord, CustomFieldValueRow } from "./types";

export function validateCoreFields(input: PermitRecordFormInput): string | null {
  if (!input.nomorIzin.trim()) return "Nomor izin wajib diisi";
  if (!input.namaPemohon.trim()) return "Nama pemohon/instansi wajib diisi";
  if (!input.permitTypeId) return "Jenis izin wajib dipilih";
  if (!input.statusId) return "Status wajib dipilih";
  if (
    input.tanggalTerbit &&
    input.tanggalBerakhir &&
    input.tanggalBerakhir < input.tanggalTerbit
  ) {
    return "Tanggal berakhir tidak boleh sebelum tanggal terbit";
  }
  return null;
}

export async function validateCustomFieldValues(
  permitTypeId: number,
  values: Record<number, string | boolean | null>
): Promise<string | null> {
  const definitions = await getFieldsForPermitType(permitTypeId);
  for (const def of definitions) {
    const raw = values[def.id];
    if (def.is_required && (raw === undefined || raw === null || raw === "")) {
      return `"${def.label}" wajib diisi`;
    }
    if (raw !== undefined && raw !== null && raw !== "") {
      if (def.field_type === "integer" && !Number.isInteger(Number(raw))) {
        return `"${def.label}" harus berupa angka bulat`;
      }
      if (def.field_type === "decimal" && Number.isNaN(Number(raw))) {
        return `"${def.label}" harus berupa angka`;
      }
    }
  }
  return null;
}

export async function getPermitRecords(): Promise<PermitRecord[]> {
  return repo.listPermitRecords();
}

export async function getPermitRecordDetail(
  id: number
): Promise<{ record: PermitRecord | null; customValues: CustomFieldValueRow[] }> {
  const record = await repo.getPermitRecordById(id);
  const customValues = record ? await repo.getCustomFieldValues(id) : [];
  return { record, customValues };
}

export async function createPermitRecord(
  input: PermitRecordFormInput,
  currentUserId: number
): Promise<number> {
  const coreError = validateCoreFields(input);
  if (coreError) throw new Error(coreError);
  const customError = await validateCustomFieldValues(input.permitTypeId, input.customFieldValues);
  if (customError) throw new Error(customError);

  const { tahun, bulan } = deriveTahunBulan(input.tanggalTerbit);

  const recordId = await repo.createPermitRecordCore({
    permitTypeId: input.permitTypeId,
    nomorIzin: input.nomorIzin.trim(),
    namaPemohon: input.namaPemohon.trim(),
    namaUsaha: input.namaUsaha.trim() || null,
    tanggalDokumen: input.tanggalDokumen,
    tanggalTerbit: input.tanggalTerbit,
    tanggalMulaiBerlaku: input.tanggalMulaiBerlaku,
    tanggalBerakhir: input.tanggalBerakhir,
    statusId: input.statusId,
    tahun,
    bulan,
    keterangan: input.keterangan.trim() || null,
    createdBy: currentUserId,
  });

  const definitions = await getFieldsForPermitType(input.permitTypeId);
  await repo.replaceCustomFieldValues(
    recordId,
    definitions.map((def) => ({
      definitionId: def.id,
      fieldType: def.field_type,
      rawValue: input.customFieldValues[def.id] ?? null,
    }))
  );

  await logAudit({
    userId: currentUserId,
    action: "CREATE",
    entity: "permit_records",
    recordId,
    oldValue: null,
    newValue: input,
  });

  return recordId;
}

export async function updatePermitRecord(
  id: number,
  input: PermitRecordFormInput,
  currentUserId: number
): Promise<void> {
  const coreError = validateCoreFields(input);
  if (coreError) throw new Error(coreError);
  const customError = await validateCustomFieldValues(input.permitTypeId, input.customFieldValues);
  if (customError) throw new Error(customError);

  const before = await repo.getPermitRecordById(id);
  const { tahun, bulan } = deriveTahunBulan(input.tanggalTerbit);

  await repo.updatePermitRecordCore(id, {
    nomorIzin: input.nomorIzin.trim(),
    namaPemohon: input.namaPemohon.trim(),
    namaUsaha: input.namaUsaha.trim() || null,
    tanggalDokumen: input.tanggalDokumen,
    tanggalTerbit: input.tanggalTerbit,
    tanggalMulaiBerlaku: input.tanggalMulaiBerlaku,
    tanggalBerakhir: input.tanggalBerakhir,
    statusId: input.statusId,
    tahun,
    bulan,
    keterangan: input.keterangan.trim() || null,
    updatedBy: currentUserId,
  });

  const definitions = await getFieldsForPermitType(input.permitTypeId);
  await repo.replaceCustomFieldValues(
    id,
    definitions.map((def) => ({
      definitionId: def.id,
      fieldType: def.field_type,
      rawValue: input.customFieldValues[def.id] ?? null,
    }))
  );

  await logAudit({
    userId: currentUserId,
    action: "UPDATE",
    entity: "permit_records",
    recordId: id,
    oldValue: before,
    newValue: input,
  });
}

export async function deletePermitRecord(id: number, currentUserId: number): Promise<void> {
  const before = await repo.getPermitRecordById(id);
  await repo.softDeletePermitRecord(id);
  await logAudit({
    userId: currentUserId,
    action: "DELETE",
    entity: "permit_records",
    recordId: id,
    oldValue: before,
    newValue: null,
  });
}

export function getExpiryWarningDays(tanggalBerakhir: string | null): number | null {
  return daysUntil(tanggalBerakhir);
}