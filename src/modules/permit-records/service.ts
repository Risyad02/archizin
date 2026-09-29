import * as repo from "./repository";
import { logAudit } from "../../lib/audit";
import { deriveTahunBulan, daysUntil } from "../../lib/dateHelpers";
import { getFieldsForPermitType } from "../custom-fields/service";
import { ensurePermitFolder, checkFolderRenameNeeded, applyFolderRename } from "./folderSync";
import type { FolderRenamePlan } from "./folderSync";
import type { PermitRecordFormInput, PermitRecord, CustomFieldValueRow } from "./types";
import { assertCan } from "../../lib/permissions";
import type { AuthUser } from "../auth/types";
import { openInDefaultApp, assertPathWithinRoot } from "../../lib/filesystem";

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
  actor: AuthUser
): Promise<number> {
  assertCan(actor.role, "record:create");

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
    createdBy: actor.id,
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

  const createdRecord = await repo.getPermitRecordById(recordId);
  if (createdRecord) {
    const folderPath = await ensurePermitFolder({
      permitTypeCode: createdRecord.permit_type_code,
      nomorIzin: createdRecord.nomor_izin ?? input.nomorIzin.trim(),
      namaPemohon: createdRecord.nama_pemohon ?? input.namaPemohon.trim(),
      tanggalTerbit: createdRecord.tanggal_terbit,
    });
    if (folderPath) {
      await repo.updatePermitRecordFolder(recordId, folderPath);
    }
  }

  await logAudit({
    userId: actor.id,
    action: "CREATE",
    entity: "permit_records",
    recordId,
    oldValue: null,
    newValue: input,
  });

  return recordId;
}

/**
 * BARU: dipanggil UI SEBELUM submit form edit, untuk tahu apakah perlu menampilkan
 * dialog konfirmasi rename folder. Tidak mengubah apa pun di DB/filesystem.
 */
export async function checkPermitRecordFolderRename(
  id: number,
  input: PermitRecordFormInput
): Promise<FolderRenamePlan | null> {
  const before = await repo.getPermitRecordById(id);
  if (!before) return null;

  return checkFolderRenameNeeded(before.lokasi_folder, {
    permitTypeCode: before.permit_type_code,
    nomorIzin: input.nomorIzin.trim(),
    namaPemohon: input.namaPemohon.trim(),
    tanggalTerbit: input.tanggalTerbit,
  });
}

export async function updatePermitRecord(
  id: number,
  input: PermitRecordFormInput,
  actor: AuthUser,
  confirmedFolderRename?: FolderRenamePlan | null
): Promise<void> {
  assertCan(actor.role, "record:update");

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
    updatedBy: actor.id,
  });

  if (confirmedFolderRename) {
    await applyFolderRename(confirmedFolderRename);
    await repo.updatePermitRecordFolder(id, confirmedFolderRename.newFolderPath);

    await logAudit({
      userId: actor.id,
      action: "UPDATE",
      entity: "permit_record_folder",
      recordId: id,
      oldValue: { lokasi_folder: confirmedFolderRename.oldFolderPath },
      newValue: { lokasi_folder: confirmedFolderRename.newFolderPath },
    });
  }

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
    userId: actor.id,
    action: "UPDATE",
    entity: "permit_records",
    recordId: id,
    oldValue: before,
    newValue: input,
  });
}

export async function deletePermitRecord(id: number, actor: AuthUser): Promise<void> {
  assertCan(actor.role, "record:delete");

  const before = await repo.getPermitRecordById(id);
  await repo.softDeletePermitRecord(id);
  await logAudit({
    userId: actor.id,
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

export async function openRecordFolder(
  folderPath: string,
  storageRoot: string,
  actor: AuthUser
): Promise<void> {
  assertCan(actor.role, "document:open");
  assertPathWithinRoot(folderPath, storageRoot);
  await openInDefaultApp(folderPath);
}