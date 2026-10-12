/**
 * Murni: tautan dari satu sel tabel rekap ke daftar izin yang sudah terfilter. Aturannya
 * sengaja sama dengan query rekap (rekapQuery.ts), sehingga angka di sel = jumlah baris
 * di daftar yang dibuka lewat tautannya.
 */

import { buildListUrl, type ListFilters } from "../permit-records/listFilters";
import { groupFilters, periodDateFilters, type RekapGrouping } from "./crossTab";
import { periodsForYear, type DateBasis, type Period } from "./periods";

export type RekapColumn =
  | { type: "period"; period: Pick<Period, "from" | "to"> }
  /** Kolom Total: seluruh tahun terpilih. */
  | { type: "year" }
  /** Kolom Tanpa tanggal: izin yang tanggal dasarnya kosong. */
  | { type: "noDate" };

export interface RekapCellTarget {
  /** "all" = baris Jumlah (tanpa filter kelompok); { id } = satu baris kelompok. */
  group: "all" | { id: number | null };
  column: RekapColumn;
}

export interface RekapLinkContext {
  grouping: RekapGrouping;
  basis: DateBasis;
  year: number;
}

export function rekapCellFilters(context: RekapLinkContext, target: RekapCellTarget): Partial<ListFilters> {
  const group = target.group === "all" ? {} : groupFilters(context.grouping, target.group.id);

  switch (target.column.type) {
    case "period":
      return { ...group, ...periodDateFilters(context.basis, target.column.period) };
    case "year": {
      const wholeYear = periodsForYear(context.year, "year")[0];
      return wholeYear ? { ...group, ...periodDateFilters(context.basis, wholeYear) } : group;
    }
    case "noDate":
      return { ...group, noDate: context.basis };
  }
}

export function rekapCellHref(context: RekapLinkContext, target: RekapCellTarget): string {
  return buildListUrl(rekapCellFilters(context, target));
}