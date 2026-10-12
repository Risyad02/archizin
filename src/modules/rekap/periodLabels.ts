/**
 * Murni: label kolom tabel rekap. Dua belas kolom bulan terlalu sempit untuk nama penuh,
 * jadi bulan disingkat tiga huruf (Jan, Feb, ..., Agu, ..., Des); jenis periode lain
 * memakai label penuh.
 */

import type { Period, PeriodKind } from "./periods";

export function shortPeriodLabel(period: Pick<Period, "label">, kind: PeriodKind): string {
  return kind === "month" ? period.label.slice(0, 3) : period.label;
}