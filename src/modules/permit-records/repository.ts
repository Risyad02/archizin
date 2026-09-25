import { getDb } from "../../database/db";
import type { PermitRecord, CustomFieldValueRow } from "./types";

export async function listPermitRecords(): Promise<PermitRecord[]> {
  const db = await getDb();
  return db.select<PermitRecord[]>(
    `SELECT
       pr.id, pr.permit_type_id, pt.name as permit_type_name,
       pr.nomor_izin, pr.nama_pemohon, pr.nama_usaha,
       pr.tanggal_dokumen, pr.tanggal_terbit, pr.tanggal_mulai_berlaku, pr.tanggal_berakhir,
       pr.status_id, ps.code as status_code, ps.label as status_label, ps.color as status_color,
       pr.tahun, pr.bulan, pr.keterangan, pr.sumber_data, pr.lokasi_folder
     FROM permit_records pr
     JOIN permit_types pt ON pt.id = pr.permit_type_id
     LEFT JOIN permit_status ps ON ps.id = pr.status_id
     WHERE pr.deleted_at IS NULL
     ORDER BY pr.created_at DESC`
  );
}

export async function getPermitRecordById(id: number): Promise<PermitRecord | null> {
  const db = await getDb();
  const rows = await db.select<PermitRecord[]>(
    `SELECT
       pr.id, pr.permit_type_id, pt.name as permit_type_name,
       pr.nomor_izin, pr.nama_pemohon, pr.nama_usaha,
       pr.tanggal_dokumen, pr.tanggal_terbit, pr.tanggal_mulai_berlaku, pr.tanggal_berakhir,
       pr.status_id, ps.code as status_code, ps.label as status_label, ps.color as status_color,
       pr.tahun, pr.bulan, pr.keterangan, pr.sumber_data, pr.lokasi_folder
     FROM permit_records pr
     JOIN permit_types pt ON pt.id = pr.permit_type_id
     LEFT JOIN permit_status ps ON ps.id = pr.status_id
     WHERE pr.id = $1 AND pr.deleted_at IS NULL`,
    [id]
  );
  return rows[0] ?? null;
}

export async function getCustomFieldValues(recordId: number): Promise<CustomFieldValueRow[]> {
  const db = await getDb();
  return db.select<CustomFieldValueRow[]>(
    `SELECT
       cfv.custom_field_definition_id, cfd.field_key, cfd.label, cfd.field_type,
       cfv.value_text, cfv.value_integer, cfv.value_decimal, cfv.value_date, cfv.value_boolean
     FROM custom_field_values cfv
     JOIN custom_field_definitions cfd ON cfd.id = cfv.custom_field_definition_id
     WHERE cfv.permit_record_id = $1
     ORDER BY cfd.sort_order`,
    [recordId]
  );
}

export async function createPermitRecordCore(params: {
  permitTypeId: number;
  nomorIzin: string;
  namaPemohon: string;
  namaUsaha: string | null;
  tanggalDokumen: string | null;
  tanggalTerbit: string | null;
  tanggalMulaiBerlaku: string | null;
  tanggalBerakhir: string | null;
  statusId: number;
  tahun: number | null;
  bulan: number | null;
  keterangan: string | null;
  createdBy: number;
}): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO permit_records
       (permit_type_id, nomor_izin, nama_pemohon, nama_usaha, tanggal_dokumen, tanggal_terbit,
        tanggal_mulai_berlaku, tanggal_berakhir, status_id, tahun, bulan, keterangan,
        created_at, updated_at, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
             datetime('now'), datetime('now'), $13, $13)`,
    [
      params.permitTypeId, params.nomorIzin, params.namaPemohon, params.namaUsaha,
      params.tanggalDokumen, params.tanggalTerbit, params.tanggalMulaiBerlaku, params.tanggalBerakhir,
      params.statusId, params.tahun, params.bulan, params.keterangan, params.createdBy,
    ]
  );
  return result.lastInsertId as number;
}

export async function updatePermitRecordCore(
  id: number,
  params: {
    nomorIzin: string;
    namaPemohon: string;
    namaUsaha: string | null;
    tanggalDokumen: string | null;
    tanggalTerbit: string | null;
    tanggalMulaiBerlaku: string | null;
    tanggalBerakhir: string | null;
    statusId: number;
    tahun: number | null;
    bulan: number | null;
    keterangan: string | null;
    updatedBy: number;
  }
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE permit_records SET
       nomor_izin = $1, nama_pemohon = $2, nama_usaha = $3, tanggal_dokumen = $4,
       tanggal_terbit = $5, tanggal_mulai_berlaku = $6, tanggal_berakhir = $7, status_id = $8,
       tahun = $9, bulan = $10, keterangan = $11, updated_at = datetime('now'), updated_by = $12
     WHERE id = $13`,
    [
      params.nomorIzin, params.namaPemohon, params.namaUsaha, params.tanggalDokumen,
      params.tanggalTerbit, params.tanggalMulaiBerlaku, params.tanggalBerakhir, params.statusId,
      params.tahun, params.bulan, params.keterangan, params.updatedBy, id,
    ]
  );
}

export async function softDeletePermitRecord(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE permit_records SET deleted_at = datetime('now') WHERE id = $1", [id]);
}

export async function replaceCustomFieldValues(
  recordId: number,
  values: { definitionId: number; fieldType: string; rawValue: string | boolean | null }[]
): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM custom_field_values WHERE permit_record_id = $1", [recordId]);

  for (const v of values) {
    if (v.rawValue === null || v.rawValue === "") continue; // field boleh kosong, sesuai brief

    let valueText: string | null = null;
    let valueInteger: number | null = null;
    let valueDecimal: number | null = null;
    let valueDate: string | null = null;
    let valueBoolean: number | null = null;

    switch (v.fieldType) {
      case "integer":
        valueInteger = Number(v.rawValue);
        break;
      case "decimal":
        valueDecimal = Number(v.rawValue);
        break;
      case "date":
      case "datetime":
        valueDate = String(v.rawValue);
        break;
      case "boolean":
        valueBoolean = v.rawValue ? 1 : 0;
        break;
      default:
        // text, textarea, select, url, email, phone, file_link, reference
        // multiselect: disimpan sebagai JSON array string — keterbatasan MVP, cukup untuk fase ini
        valueText = String(v.rawValue);
    }

    await db.execute(
      `INSERT INTO custom_field_values
         (permit_record_id, custom_field_definition_id, value_text, value_integer, value_decimal, value_date, value_boolean)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [recordId, v.definitionId, valueText, valueInteger, valueDecimal, valueDate, valueBoolean]
    );
  }
}