/**
 * Murni (tanpa getDb): pembangun SQL agregasi rekap, plus pemetaan baris hasilnya ke
 * RekapSourceRow. Dipisah dari repository.ts supaya bisa dites tanpa plugin Tauri.
 *
 * Aturan yang dipegang query ini:
 * - Semua izin yang belum dihapus dihitung, APA PUN statusnya (rekap bukan pemantauan masa
 *   berlaku, jadi tidak ada pengecualian Dicabut/Tidak Aktif seperti di dashboard).
 * - Hanya izin bertanggal di dalam tahun terpilih, ditambah izin tanpa tanggal dasar
 *   (NULL atau teks kosong) yang dilaporkan terpisah sebagai "Tanpa tanggal".
 * - Nama kolom tanggal dan bentuk pengelompokan berasal dari peta tetap di bawah, tidak
 *   pernah dari teks masukan; tahun masuk sebagai parameter ($1, $2).
 */

import type { DateBasis } from "./periods";
import { isValidYear } from "./periods";
import type { RekapGrouping, RekapSourceRow } from "./crossTab";
import type { RekapDbRow, RekapQueryOptions } from "./types";

const DATE_COLUMNS: Record<DateBasis, string> = {
  terbit: "pr.tanggal_terbit",
  berakhir: "pr.tanggal_berakhir",
};

interface GroupingSql {
  select: string;
  join: string;
  groupBy: string[];
  orderBy: string[];
}

const GROUPING_SQL: Record<RekapGrouping, GroupingSql> = {
  permitType: {
    select: "pt.id AS group_id, pt.name AS group_label",
    join: "JOIN permit_types pt ON pt.id = pr.permit_type_id",
    groupBy: ["pt.id", "pt.name"],
    orderBy: ["pt.name", "pt.id"],
  },
  status: {
    // LEFT JOIN: izin tanpa status tetap terhitung, dalam satu baris "Tanpa status" (id NULL).
    select: "ps.id AS group_id, COALESCE(ps.label, 'Tanpa status') AS group_label",
    join: "LEFT JOIN permit_status ps ON ps.id = pr.status_id",
    groupBy: ["ps.id", "ps.label", "ps.sort_order"],
    orderBy: ["(ps.id IS NULL)", "ps.sort_order", "ps.id"],
  },
  total: {
    select: "NULL AS group_id, 'Semua izin' AS group_label",
    join: "",
    groupBy: [],
    orderBy: [],
  },
};

export const TOTAL_GROUP_LABEL = "Semua izin";
const FALLBACK_GROUP_LABEL = "(tanpa nama)";

export function buildRekapQuery(options: RekapQueryOptions): { sql: string; params: string[] } {
  const dateColumn = DATE_COLUMNS[options.basis];
  const grouping = GROUPING_SQL[options.grouping];
  // Defensif: tipe TypeScript tidak melindungi dari nilai liar saat runtime.
  if (!dateColumn || !grouping) {
    throw new Error("Pilihan rekap tidak dikenal");
  }
  if (!isValidYear(options.year)) {
    throw new Error(`Tahun tidak valid: ${options.year}`);
  }

  const dateExpr = `NULLIF(${dateColumn}, '')`;
  const year = String(options.year).padStart(4, "0");
  const params = [`${year}-01-01`, `${year}-12-31`];

  const groupBy = [...grouping.groupBy, dateExpr].join(", ");
  const orderBy = [...grouping.orderBy, dateExpr].join(", ");
  const joinLine = grouping.join ? `\n     ${grouping.join}` : "";

  const sql = `SELECT ${grouping.select}, ${dateExpr} AS tanggal, COUNT(*) AS total
     FROM permit_records pr${joinLine}
     WHERE pr.deleted_at IS NULL
       AND (${dateExpr} IS NULL OR (${dateExpr} >= $1 AND ${dateExpr} <= $2))
     GROUP BY ${groupBy}
     ORDER BY ${orderBy}`;

  return { sql, params };
}

/**
 * Baris SQL -> RekapSourceRow. Teks kosong dianggap tanpa tanggal, label kosong diberi
 * nama cadangan, dan jumlah dipaksa jadi angka (plugin SQL bisa mengembalikan string).
 */
export function toRekapSourceRows(rows: RekapDbRow[]): RekapSourceRow[] {
  return rows.map((row) => {
    const label = row.group_label?.trim();
    const date = row.tanggal === null || row.tanggal === "" ? null : row.tanggal;
    return {
      groupId: row.group_id,
      groupLabel: label ? label : FALLBACK_GROUP_LABEL,
      date,
      count: Number(row.total),
    };
  });
}