/**
 * Murni (tanpa getDb): pembangun SQL untuk query masa berlaku dashboard. Dipisah dari
 * repository.ts supaya bisa dites tanpa menyentuh plugin Tauri.
 *
 * Izin dengan status_id NULL TETAP dihitung (tidak ada status = tidak dikecualikan);
 * itu sebabnya klausanya "ps.code IS NULL OR ...", bukan "NOT IN" saja — NOT IN
 * terhadap NULL menghasilkan NULL dan akan diam-diam membuang barisnya.
 */

function buildExcludeClause(codes: readonly string[], startIndex: number): string {
  if (codes.length === 0) return "";
  const placeholders = codes.map((_, index) => `$${startIndex + index}`).join(", ");
  return `AND (ps.code IS NULL OR ps.code NOT IN (${placeholders}))`;
}

/** Jumlah izin per tanggal berakhir, tanpa izin berstatus yang dikecualikan. */
export function buildExpiryDateCountsQuery(excludedStatusCodes: readonly string[]): {
  sql: string;
  params: string[];
} {
  const codes = [...new Set(excludedStatusCodes)];
  const excludeClause = buildExcludeClause(codes, 1);

  const sql = `SELECT pr.tanggal_berakhir AS tanggal_berakhir, COUNT(*) AS total
     FROM permit_records pr
     LEFT JOIN permit_status ps ON ps.id = pr.status_id
     WHERE pr.deleted_at IS NULL ${excludeClause}
     GROUP BY pr.tanggal_berakhir`;

  return { sql, params: codes };
}

export interface ExpiringRecordsQueryOptions {
  /** "overdue": berakhir sebelum today (terbaru lewat dulu). "upcoming": today s/d upTo (terdekat dulu). */
  kind: "overdue" | "upcoming";
  /** Tanggal lokal hari ini, format YYYY-MM-DD (dihitung di JS agar sejalan dengan daysUntil). */
  today: string;
  /** Batas atas inklusif, wajib untuk kind "upcoming". */
  upTo?: string;
  excludedStatusCodes: readonly string[];
  limit: number;
}

/** Daftar izin yang perlu perhatian (kedaluwarsa / segera berakhir) untuk dashboard. */
export function buildExpiringRecordsQuery(options: ExpiringRecordsQueryOptions): {
  sql: string;
  params: (string | number)[];
} {
  const codes = [...new Set(options.excludedStatusCodes)];
  const params: (string | number)[] = [options.today];

  let dateClause: string;
  let orderClause: string;
  if (options.kind === "overdue") {
    dateClause = "pr.tanggal_berakhir < $1";
    orderClause = "pr.tanggal_berakhir DESC, pr.id";
  } else {
    if (!options.upTo) throw new Error("upTo wajib diisi untuk kind 'upcoming'");
    params.push(options.upTo);
    dateClause = "pr.tanggal_berakhir >= $1 AND pr.tanggal_berakhir <= $2";
    orderClause = "pr.tanggal_berakhir ASC, pr.id";
  }

  const excludeClause = buildExcludeClause(codes, params.length + 1);
  params.push(...codes);
  params.push(options.limit);
  const limitPlaceholder = `$${params.length}`;

  const sql = `SELECT
       pr.id, pr.nomor_izin, pr.nama_pemohon, pr.nama_usaha,
       pt.name AS permit_type_name, pr.tanggal_berakhir,
       ps.code AS status_code, ps.label AS status_label, ps.color AS status_color
     FROM permit_records pr
     JOIN permit_types pt ON pt.id = pr.permit_type_id
     LEFT JOIN permit_status ps ON ps.id = pr.status_id
     WHERE pr.deleted_at IS NULL
       AND pr.tanggal_berakhir IS NOT NULL AND pr.tanggal_berakhir <> ''
       AND ${dateClause} ${excludeClause}
     ORDER BY ${orderClause}
     LIMIT ${limitPlaceholder}`;

  return { sql, params };
}