import type { DashboardSummary } from "./types";

/**
 * Angka-angka utama yang ditampilkan di kartu ringkasan dashboard (Checkpoint 7.3).
 * Dipisah dari komponen supaya aturan "angka mana dari mana" bisa dites tanpa render React.
 */
export interface HeadlineStats {
  total: number;
  /** Izin berstatus "aktif" (berdasarkan status_id, bukan tanggal). */
  active: number;
  /** Izin yang akan berakhir dalam rentang ambang status_rules (0 s/d ambang terbesar). */
  expiringSoon: number;
  /** Ambang terbesar yang dipakai (mis. 90); null kalau tidak ada status_rules aktif. */
  expiringSoonMaxDays: number | null;
  /** Izin yang tanggal berakhirnya sudah lewat (berdasarkan tanggal, bukan status_id). */
  overdue: number;
  noExpiryDate: number;
  withoutStatus: number;
  withoutIssueDate: number;
  /** Izin berstatus Dicabut/Tidak Aktif yang tidak dihitung dalam masa berlaku. */
  expiryExcluded: number;
}

// Bucket rentang dibuat bucketExpiry dengan key "d<ambang>" (d7, d14, ...).
const RANGE_KEY = /^d\d+$/;

export function deriveHeadlineStats(summary: DashboardSummary): HeadlineStats {
  const ranges = summary.expiry.filter((bucket) => RANGE_KEY.test(bucket.key));
  const upperBounds = ranges
    .map((bucket) => bucket.maxDays)
    .filter((days): days is number => days !== null);

  return {
    total: summary.total,
    active: summary.byStatus.find((status) => status.code === "aktif")?.total ?? 0,
    expiringSoon: ranges.reduce((sum, bucket) => sum + bucket.total, 0),
    expiringSoonMaxDays: upperBounds.length > 0 ? Math.max(...upperBounds) : null,
    overdue: summary.expiry.find((bucket) => bucket.key === "overdue")?.total ?? 0,
    noExpiryDate: summary.expiry.find((bucket) => bucket.key === "no_date")?.total ?? 0,
    withoutStatus: summary.withoutStatus,
    withoutIssueDate: summary.withoutIssueDate,
    expiryExcluded: summary.expiryExcluded,
  };
}