import type { DateBasis, PeriodKind } from "./periods";
import type { RekapGrouping } from "./crossTab";

/** Pilihan halaman rekap yang menentukan query. Periode (bulan/triwulan/...) tidak memengaruhi SQL. */
export interface RekapQueryOptions {
  year: number;
  basis: DateBasis;
  grouping: RekapGrouping;
}

/** Parameter penuh untuk service: query + cara tabel dipotong menjadi kolom. */
export interface RekapRequest extends RekapQueryOptions {
  kind: PeriodKind;
}

/** Baris mentah dari SQL: jumlah izin per (kelompok, tanggal dasar). */
export interface RekapDbRow {
  group_id: number | null;
  group_label: string | null;
  /** Tanggal dasar rekap; null bila kosong. */
  tanggal: string | null;
  total: number;
}