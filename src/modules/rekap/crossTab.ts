/**
 * Murni: menyusun tabel silang rekap (baris = kelompok, kolom = periode) dari baris data
 * mentah, dan menurunkan filter daftar izin untuk tiap sel agar bisa jadi tautan.
 */

import type { ListFilters } from "../permit-records/listFilters";
import { periodKeyOf, periodsForYear, type DateBasis, type Period, type PeriodKind } from "./periods";

/** Satu baris hasil agregasi: `count` izin pada kelompok dan tanggal tertentu. */
export interface RekapSourceRow {
  /** Identitas kelompok (id jenis izin / id status), atau null untuk mode "total saja". */
  groupId: number | null;
  groupLabel: string;
  /** Tanggal dasar rekap (YYYY-MM-DD), atau null bila izin tidak punya tanggal itu. */
  date: string | null;
  count: number;
}

export interface RekapRow {
  groupId: number | null;
  label: string;
  /** Jumlah per periode, urutannya sama dengan RekapTable.periods. */
  cells: number[];
  /** Izin kelompok ini yang tidak punya tanggal dasar. */
  noDate: number;
  /** Jumlah semua sel periode (tidak termasuk noDate). */
  total: number;
}

export interface RekapTable {
  year: number;
  kind: PeriodKind;
  periods: Period[];
  rows: RekapRow[];
  columnTotals: number[];
  noDateTotal: number;
  /** Jumlah semua sel periode (tidak termasuk noDate). */
  grandTotal: number;
}

/**
 * Menyusun tabel. Aturan:
 * - Baris dengan tanggal di luar `year` diabaikan (query sudah membatasi, ini pengaman).
 * - Tanggal null masuk kolom "Tanpa tanggal" dan TIDAK ikut total periode.
 * - Hitungan bukan bilangan bulat tak negatif diabaikan.
 * - Urutan baris: urutan kemunculan kelompok pertama kali dalam data masukan.
 */
export function buildRekapTable(source: RekapSourceRow[], year: number, kind: PeriodKind): RekapTable {
  const periods = periodsForYear(year, kind);
  const indexByKey = new Map(periods.map((p, i) => [p.key, i]));
  const rowsByGroup = new Map<string, RekapRow>();

  for (const item of source) {
    if (!Number.isInteger(item.count) || item.count < 0) continue;

    const key = item.date === null ? null : periodKeyOf(item.date, year, kind);
    if (item.date !== null && key === null) continue; // di luar tahun / tanggal rusak

    const groupKey = item.groupId === null ? "__total__" : String(item.groupId);
    let row = rowsByGroup.get(groupKey);
    if (!row) {
      row = {
        groupId: item.groupId,
        label: item.groupLabel,
        cells: periods.map(() => 0),
        noDate: 0,
        total: 0,
      };
      rowsByGroup.set(groupKey, row);
    }

    if (key === null) {
      row.noDate += item.count;
    } else {
      const index = indexByKey.get(key);
      if (index === undefined) continue;
      row.cells[index] = (row.cells[index] ?? 0) + item.count;
      row.total += item.count;
    }
  }

  const rows = [...rowsByGroup.values()];
  const columnTotals = periods.map((_, i) => rows.reduce((sum, r) => sum + (r.cells[i] ?? 0), 0));
  return {
    year,
    kind,
    periods,
    rows,
    columnTotals,
    noDateTotal: rows.reduce((sum, r) => sum + r.noDate, 0),
    grandTotal: columnTotals.reduce((sum, n) => sum + n, 0),
  };
}

/** Filter tanggal untuk satu periode sesuai dasar rekap (terbit atau berakhir). */
export function periodDateFilters(
  basis: DateBasis,
  period: Pick<Period, "from" | "to">
): Partial<ListFilters> {
  return basis === "terbit"
    ? { terbitFrom: period.from, terbitTo: period.to }
    : { berakhirFrom: period.from, berakhirTo: period.to };
}

export type RekapGrouping = "permitType" | "status" | "total";

/** Filter kelompok (jenis izin / status) untuk satu baris; kosong untuk mode total. */
export function groupFilters(grouping: RekapGrouping, groupId: number | null): Partial<ListFilters> {
  if (grouping === "status") return { statusId: groupId === null ? "none" : groupId };
  if (groupId === null) return {};
  if (grouping === "permitType") return { permitTypeId: groupId };
  return {};
}

/**
 * Filter lengkap untuk sebuah sel: kelompok + periode. Untuk "total satu baris" kirim
 * rentang seluruh tahun (periodsForYear(year, "year")[0]).
 */
export function cellFilters(
  grouping: RekapGrouping,
  groupId: number | null,
  basis: DateBasis,
  period: Pick<Period, "from" | "to">
): Partial<ListFilters> {
  return { ...groupFilters(grouping, groupId), ...periodDateFilters(basis, period) };
}