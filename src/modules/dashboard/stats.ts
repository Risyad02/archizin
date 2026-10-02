/**
 * Fungsi murni untuk statistik dashboard (Fase 7, Checkpoint 7.1).
 * TIDAK memanggil DB, filesystem, maupun Date.now() — semua masukan datang lewat
 * parameter, supaya bisa dites tanpa mock. Query SQL-nya menyusul di 7.2.
 */

// ---------- Bucket masa berlaku ----------

/** Satu baris hasil agregasi: berapa izin yang jatuh pada selisih hari tertentu. */
export interface DaysCount {
  /** Hasil daysUntil(tanggal_berakhir); null kalau izin tidak punya tanggal berakhir. */
  days: number | null;
  total: number;
}

export interface ExpiryBucket {
  /** "overdue" | "d<batas>" | "safe" | "no_date" — stabil, dipakai UI untuk warna/link. */
  key: string;
  label: string;
  /** Batas bawah selisih hari (inklusif); null = tidak berlaku. */
  minDays: number | null;
  /** Batas atas selisih hari (inklusif); null = terbuka / tidak berlaku. */
  maxDays: number | null;
  total: number;
}

function rangeLabel(min: number, max: number): string {
  return min === max ? `${max} hari` : `${min}–${max} hari`;
}

/**
 * Mengelompokkan izin ke bucket masa berlaku berdasarkan ambang batas (biasanya
 * threshold_days dari status_rules: 7/14/30/60/90). Urutan hasil selalu:
 * kedaluwarsa → tiap ambang menaik → masih aman → tanpa tanggal berakhir.
 * Ambang boleh tidak terurut/duplikat/negatif; semuanya dirapikan di sini.
 */
export function bucketExpiry(items: DaysCount[], thresholds: number[]): ExpiryBucket[] {
  const sorted = [...new Set(thresholds)].filter((t) => t >= 0).sort((a, b) => a - b);

  const overdue: ExpiryBucket = {
    key: "overdue",
    label: "Kedaluwarsa",
    minDays: null,
    maxDays: -1,
    total: 0,
  };

  const ranges: ExpiryBucket[] = [];
  let previous = -1;
  for (const threshold of sorted) {
    const min = previous + 1;
    ranges.push({
      key: `d${threshold}`,
      label: rangeLabel(min, threshold),
      minDays: min,
      maxDays: threshold,
      total: 0,
    });
    previous = threshold;
  }

  const safe: ExpiryBucket = {
    key: "safe",
    label: sorted.length > 0 ? `Lebih dari ${previous} hari` : "Masih berlaku",
    minDays: previous + 1,
    maxDays: null,
    total: 0,
  };

  const noDate: ExpiryBucket = {
    key: "no_date",
    label: "Tanpa tanggal berakhir",
    minDays: null,
    maxDays: null,
    total: 0,
  };

  for (const item of items) {
    if (item.days === null) {
      noDate.total += item.total;
    } else if (item.days < 0) {
      overdue.total += item.total;
    } else {
      const days = item.days;
      const target = ranges.find(
        (bucket) =>
          bucket.minDays !== null &&
          bucket.maxDays !== null &&
          days >= bucket.minDays &&
          days <= bucket.maxDays
      );
      (target ?? safe).total += item.total;
    }
  }

  return [overdue, ...ranges, safe, noDate];
}

// ---------- Tren bulanan ----------

/** Satu baris hasil agregasi per (tahun, bulan); tahun/bulan null bila izin tanpa tanggal terbit. */
export interface MonthCount {
  tahun: number | null;
  bulan: number | null;
  total: number;
}

export interface MonthlyPoint {
  tahun: number;
  bulan: number; // 1–12
  label: string;
  total: number;
}

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

/**
 * Menghasilkan deret bulanan berurutan (lama → baru) sepanjang `months` bulan yang
 * berakhir di (endYear, endMonth). Bulan tanpa data diisi 0 supaya grafik tidak
 * "melompat". Baris dengan tahun/bulan null atau di luar rentang diabaikan; baris
 * ganda pada bulan yang sama dijumlahkan.
 */
export function buildMonthlySeries(
  rows: MonthCount[],
  endYear: number,
  endMonth: number,
  months = 12
): MonthlyPoint[] {
  if (months < 1) return [];

  const endIndex = endYear * 12 + (endMonth - 1);
  const startIndex = endIndex - (months - 1);

  const totals = new Map<number, number>();
  for (const row of rows) {
    if (row.tahun === null || row.bulan === null) continue;
    if (row.bulan < 1 || row.bulan > 12) continue;
    const index = row.tahun * 12 + (row.bulan - 1);
    if (index < startIndex || index > endIndex) continue;
    totals.set(index, (totals.get(index) ?? 0) + row.total);
  }

  const series: MonthlyPoint[] = [];
  for (let index = startIndex; index <= endIndex; index++) {
    const bulan = (index % 12) + 1;
    series.push({
      tahun: Math.floor(index / 12),
      bulan,
      label: MONTH_LABELS[bulan - 1] ?? "",
      total: totals.get(index) ?? 0,
    });
  }
  return series;
}