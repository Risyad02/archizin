// src/modules/dashboard/components/DistributionBars.tsx
import { barPercents } from "../chartGeometry";

export interface DistributionItem {
  key: string | number;
  label: string;
  total: number;
}

const numberFormat = new Intl.NumberFormat("id-ID");

/**
 * Batang horizontal sederhana (div + CSS, tanpa library): label di kiri, batang tipis di
 * tengah, angka mono di kanan. Item bernilai 0 tetap tampil (redup) supaya terlihat bahwa
 * kategorinya ada tetapi kosong.
 */
export function DistributionBars({ items, emptyText }: { items: DistributionItem[]; emptyText: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-ink-muted">{emptyText}</p>;
  }

  const percents = barPercents(items.map((item) => item.total));

  return (
    <ul className="space-y-2.5">
      {items.map((item, index) => (
        <li
          key={item.key}
          className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 text-sm sm:grid-cols-[minmax(0,14rem)_1fr_auto]"
        >
          <span
            className={`line-clamp-2 leading-snug ${item.total === 0 ? "text-ink-muted" : ""}`}
            title={item.label}
          >
            {item.label}
          </span>
          <span className="h-2 rounded-sm bg-accent-soft" aria-hidden="true">
            <span
              className="block h-full rounded-sm bg-accent"
              style={{ width: `${percents[index] ?? 0}%` }}
            />
          </span>
          <span className={`font-mono tabular-nums ${item.total === 0 ? "text-ink-muted" : ""}`}>
            {numberFormat.format(item.total)}
          </span>
        </li>
      ))}
    </ul>
  );
}