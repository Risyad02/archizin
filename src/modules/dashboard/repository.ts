import { getDb } from "../../database/db";
import type { MonthCount } from "./stats";
import type { TotalsRow, StatusCount, PermitTypeCount, ExpiryDateCount } from "./types";

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

/** Jumlah izin per tanggal berakhir; pengelompokan ke bucket dilakukan di fungsi murni (stats.ts). */
export async function listExpiryDateCounts(): Promise<ExpiryDateCount[]> {
  const db = await getDb();
  return db.select<ExpiryDateCount[]>(
    `SELECT tanggal_berakhir, COUNT(*) AS total
     FROM permit_records
     WHERE deleted_at IS NULL
     GROUP BY tanggal_berakhir`
  );
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