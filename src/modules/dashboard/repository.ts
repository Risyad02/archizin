import { getDb } from "../../database/db";
import type { MonthCount } from "./stats";
import type {
  TotalsRow,
  StatusCount,
  PermitTypeCount,
  ExpiryDateCount,
  ExpiringRecord,
  ArchiveHealthCounts,
  ActivityRow,
} from "./types";
import {
  buildExpiryDateCountsQuery,
  buildExpiringRecordsQuery,
  type ExpiringRecordsQueryOptions,
} from "./expiryQuery";

// Semua query di sini hanya membaca, dan selalu mengecualikan data yang sudah di-soft-delete.

export async function getTotals(): Promise<TotalsRow> {
  const db = await getDb();
  const rows = await db.select<TotalsRow[]>(
    `SELECT
       COUNT(*) AS total,
       COALESCE(SUM(CASE WHEN tahun IS NULL OR bulan IS NULL THEN 1 ELSE 0 END), 0) AS without_issue_date
     FROM permit_records
     WHERE deleted_at IS NULL`
  );
  return rows[0] ?? { total: 0, without_issue_date: 0 };
}

/** Semua status (termasuk yang jumlahnya 0), berurutan sesuai sort_order. */
export async function countByStatus(): Promise<StatusCount[]> {
  const db = await getDb();
  return db.select<StatusCount[]>(
    `SELECT ps.id AS status_id, ps.code, ps.label, ps.color, COUNT(pr.id) AS total
     FROM permit_status ps
     LEFT JOIN permit_records pr ON pr.status_id = ps.id AND pr.deleted_at IS NULL
     GROUP BY ps.id
     ORDER BY ps.sort_order`
  );
}

/** Jenis izin aktif, plus jenis nonaktif yang masih punya data. Terbanyak lebih dulu. */
export async function countByPermitType(): Promise<PermitTypeCount[]> {
  const db = await getDb();
  return db.select<PermitTypeCount[]>(
    `SELECT pt.id AS permit_type_id, pt.code, pt.name, COUNT(pr.id) AS total
     FROM permit_types pt
     LEFT JOIN permit_records pr ON pr.permit_type_id = pt.id AND pr.deleted_at IS NULL
     GROUP BY pt.id, pt.is_active
     HAVING pt.is_active = 1 OR COUNT(pr.id) > 0
     ORDER BY total DESC, pt.name`
  );
}

/**
 * Jumlah izin per tanggal berakhir, tanpa izin berstatus yang dikecualikan dari pemantauan
 * masa berlaku. Pengelompokan ke bucket dilakukan di fungsi murni (stats.ts); SQL-nya
 * dibangun di expiryQuery.ts supaya bisa dites.
 */
export async function listExpiryDateCounts(
  excludedStatusCodes: readonly string[]
): Promise<ExpiryDateCount[]> {
  const db = await getDb();
  const { sql, params } = buildExpiryDateCountsQuery(excludedStatusCodes);
  return db.select<ExpiryDateCount[]>(sql, params);
}

/** Jumlah izin per (tahun, bulan) penerbitan. Pengisian bulan kosong dilakukan di stats.ts. */
export async function listMonthlyCounts(): Promise<MonthCount[]> {
  const db = await getDb();
  return db.select<MonthCount[]>(
    `SELECT tahun, bulan, COUNT(*) AS total
     FROM permit_records
     WHERE deleted_at IS NULL AND tahun IS NOT NULL AND bulan IS NOT NULL
     GROUP BY tahun, bulan
     ORDER BY tahun, bulan`
  );
}

/** Daftar izin kedaluwarsa / segera berakhir (terbatas), tanpa izin berstatus yang dikecualikan. */
export async function listExpiringRecords(
  options: ExpiringRecordsQueryOptions
): Promise<ExpiringRecord[]> {
  const db = await getDb();
  const { sql, params } = buildExpiringRecordsQuery(options);
  return db.select<ExpiringRecord[]>(sql, params);
}

interface RecordHealthRow {
  total_records: number;
  without_documents: number;
  without_folder: number;
}

interface DocumentHealthRow {
  total_documents: number;
  not_found: number;
  unchecked: number;
  records_with_missing: number;
}

/**
 * Hitungan kesehatan arsip. Sengaja TIDAK memakai pengecualian status masa berlaku:
 * folder dan dokumen perlu lengkap untuk semua izin, termasuk yang dicabut atau tidak aktif.
 */
export async function getArchiveHealthCounts(): Promise<ArchiveHealthCounts> {
  const db = await getDb();

  const recordRows = await db.select<RecordHealthRow[]>(
    `SELECT
       COUNT(*) AS total_records,
       COALESCE(SUM(CASE
         WHEN NOT EXISTS (SELECT 1 FROM document_links dl WHERE dl.permit_record_id = pr.id)
         THEN 1 ELSE 0 END), 0) AS without_documents,
       COALESCE(SUM(CASE
         WHEN pr.lokasi_folder IS NULL OR pr.lokasi_folder = ''
         THEN 1 ELSE 0 END), 0) AS without_folder
     FROM permit_records pr
     WHERE pr.deleted_at IS NULL`
  );

  const documentRows = await db.select<DocumentHealthRow[]>(
    `SELECT
       COUNT(*) AS total_documents,
       COALESCE(SUM(CASE WHEN dl.status = 'not_found' THEN 1 ELSE 0 END), 0) AS not_found,
       COALESCE(SUM(CASE WHEN dl.status = 'unchecked' THEN 1 ELSE 0 END), 0) AS unchecked,
       COUNT(DISTINCT CASE WHEN dl.status = 'not_found' THEN dl.permit_record_id END) AS records_with_missing
     FROM document_links dl
     JOIN permit_records pr ON pr.id = dl.permit_record_id AND pr.deleted_at IS NULL`
  );

  const records = recordRows[0];
  const documents = documentRows[0];

  return {
    totalRecords: records?.total_records ?? 0,
    withoutDocuments: records?.without_documents ?? 0,
    withoutFolder: records?.without_folder ?? 0,
    totalDocuments: documents?.total_documents ?? 0,
    documentsNotFound: documents?.not_found ?? 0,
    recordsWithMissingDocuments: documents?.records_with_missing ?? 0,
    documentsUnchecked: documents?.unchecked ?? 0,
  };
}

/**
 * Aktivitas terbaru dari audit_logs. Tanpa old_value/new_value (bisa besar; dashboard tidak
 * memerlukannya). Pemanggil (service) wajib sudah memeriksa izin audit:view.
 */
export async function listRecentActivity(limit: number): Promise<ActivityRow[]> {
  const db = await getDb();
  return db.select<ActivityRow[]>(
    `SELECT al.id, al.action, al.entity, al.record_id, al.timestamp,
            COALESCE(u.full_name, u.username) AS actor_name
     FROM audit_logs al
     LEFT JOIN users u ON u.id = al.user_id
     ORDER BY al.timestamp DESC, al.id DESC
     LIMIT $1`,
    [limit]
  );
}