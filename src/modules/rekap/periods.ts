/**
 * Murni (tanpa React, DB, atau Tauri): pembagian satu tahun menjadi periode rekap.
 * Semua tanggal berupa teks YYYY-MM-DD (tanggal kalender, bukan waktu), jadi tidak ada
 * urusan zona waktu. Rentang selalu inklusif: [from, to].
 */

export type PeriodKind = "month" | "quarter" | "semester" | "year";

/** Dasar tanggal rekap: tanggal terbit atau tanggal berakhir izin. */
export type DateBasis = "terbit" | "berakhir";

export interface Period {
  /** Kunci unik dalam satu tahun, mis. "2026-03", "2026-Q1", "2026-S2", "2026". */
  key: string;
  label: string;
  from: string;
  to: string;
}

export const PERIOD_KIND_LABELS: Record<PeriodKind, string> = {
  month: "Bulanan",
  quarter: "Triwulanan",
  semester: "Semester",
  year: "Tahunan",
};

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const ROMAN = ["I", "II", "III", "IV"];

/** Rentang tahun yang diterima; di luar itu dianggap salah input. */
export const MIN_YEAR = 1900;
export const MAX_YEAR = 2999;

export function isValidYear(year: number): boolean {
  return Number.isInteger(year) && year >= MIN_YEAR && year <= MAX_YEAR;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function lastDayOfMonth(year: number, month: number): number {
  // Hari ke-0 bulan berikutnya = hari terakhir bulan ini.
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function iso(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${pad2(month)}-${pad2(day)}`;
}

/** Periode yang mencakup bulan startMonth..endMonth (1-12) pada tahun tersebut. */
function span(year: number, startMonth: number, endMonth: number): Pick<Period, "from" | "to"> {
  return {
    from: iso(year, startMonth, 1),
    to: iso(year, endMonth, lastDayOfMonth(year, endMonth)),
  };
}

/** Daftar periode untuk satu tahun, berurutan. Melempar error bila tahun tidak valid. */
export function periodsForYear(year: number, kind: PeriodKind): Period[] {
  if (!isValidYear(year)) {
    throw new Error(`Tahun tidak valid: ${year}`);
  }

  switch (kind) {
    case "month":
      return MONTH_NAMES.map((name, i) => ({
        key: `${year}-${pad2(i + 1)}`,
        label: name,
        ...span(year, i + 1, i + 1),
      }));
    case "quarter":
      return ROMAN.map((roman, i) => ({
        key: `${year}-Q${i + 1}`,
        label: `Triwulan ${roman}`,
        ...span(year, i * 3 + 1, i * 3 + 3),
      }));
    case "semester":
      return [
        { key: `${year}-S1`, label: "Semester I", ...span(year, 1, 6) },
        { key: `${year}-S2`, label: "Semester II", ...span(year, 7, 12) },
      ];
    case "year":
      return [{ key: String(year), label: `Tahun ${year}`, ...span(year, 1, 12) }];
  }
}

/**
 * Kunci periode tempat sebuah tanggal jatuh, atau null bila tanggal kosong/tidak valid
 * atau tahunnya bukan `year`. Kunci sama dengan Period.key dari periodsForYear.
 */
export function periodKeyOf(date: string | null, year: number, kind: PeriodKind): string | null {
  if (!date) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (y !== year || m < 1 || m > 12 || d < 1 || d > lastDayOfMonth(y, m)) return null;

  switch (kind) {
    case "month":
      return `${y}-${pad2(m)}`;
    case "quarter":
      return `${y}-Q${Math.ceil(m / 3)}`;
    case "semester":
      return `${y}-S${m <= 6 ? 1 : 2}`;
    case "year":
      return String(y);
  }
}