import type { RekapTable } from "../crossTab";
import { shortPeriodLabel } from "../periodLabels";

const numberFormat = new Intl.NumberFormat("id-ID");

/** Angka nol ditulis tanda strip redup supaya sel yang berisi lebih mudah dipindai. */
function Count({ value, strong = false }: { value: number; strong?: boolean }) {
  if (value === 0) return <span className="text-ink-muted">–</span>;
  return <span className={strong ? "font-medium" : ""}>{numberFormat.format(value)}</span>;
}

/**
 * Tabel silang rekap: baris = kelompok, kolom = periode, lalu Total dan Tanpa tanggal.
 * Hanya menggambar; semua hitungan sudah selesai di buildRekapTable.
 */
export function RekapTableView({
  table,
  groupHeading,
  caption,
}: {
  table: RekapTable;
  groupHeading: string;
  caption: string;
}) {
  const showFooter = table.rows.length > 1;
  const headCell = "px-3 py-2 text-right text-xs font-medium text-ink-muted whitespace-nowrap";
  const numCell = "px-3 py-2 text-right font-mono tabular-nums";

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b border-line">
          <tr>
            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-ink-muted">
              {groupHeading}
            </th>
            {table.periods.map((period) => (
              <th key={period.key} scope="col" className={headCell} title={period.label}>
                {shortPeriodLabel(period, table.kind)}
              </th>
            ))}
            <th scope="col" className={`${headCell} border-l border-line`}>
              Total
            </th>
            <th scope="col" className={headCell}>
              Tanpa tanggal
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {table.rows.map((row) => (
            <tr key={row.groupId ?? "total"}>
              <th scope="row" className="px-3 py-2 text-left font-normal">
                {row.label}
              </th>
              {row.cells.map((value, index) => (
                <td key={table.periods[index]?.key ?? index} className={numCell}>
                  <Count value={value} />
                </td>
              ))}
              <td className={`${numCell} border-l border-line`}>
                <Count value={row.total} strong />
              </td>
              <td className={numCell}>
                <Count value={row.noDate} />
              </td>
            </tr>
          ))}
        </tbody>
        {showFooter && (
          <tfoot className="border-t border-line">
            <tr>
              <th scope="row" className="px-3 py-2 text-left font-medium">
                Jumlah
              </th>
              {table.columnTotals.map((value, index) => (
                <td key={table.periods[index]?.key ?? index} className={numCell}>
                  <Count value={value} strong />
                </td>
              ))}
              <td className={`${numCell} border-l border-line`}>
                <Count value={table.grandTotal} strong />
              </td>
              <td className={numCell}>
                <Count value={table.noDateTotal} strong />
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}