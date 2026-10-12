import { Link } from "react-router-dom";
import type { RekapTable } from "../crossTab";
import type { RekapCellTarget } from "../cellLinks";
import { shortPeriodLabel } from "../periodLabels";

const numberFormat = new Intl.NumberFormat("id-ID");

/**
 * Angka nol ditulis tanda strip redup (tidak ada daftar yang bisa dibuka). Angka lain
 * menjadi tautan ke daftar izin yang sudah terfilter bila `href` diberikan.
 */
function Count({ value, href, strong = false }: { value: number; href?: string; strong?: boolean }) {
  if (value === 0) return <span className="text-ink-muted">–</span>;
  const text = numberFormat.format(value);
  if (!href) return <span className={strong ? "font-medium" : ""}>{text}</span>;
  return (
    <Link
      to={href}
      title="Buka daftar izin"
      className={`-mx-1 rounded px-1 underline decoration-ink-muted/50 underline-offset-2 hover:bg-accent-soft/60 ${
        strong ? "font-medium" : ""
      }`}
    >
      {text}
    </Link>
  );
}

/**
 * Tabel silang rekap: baris = kelompok, kolom = periode, lalu Total dan Tanpa tanggal.
 * Hanya menggambar; semua hitungan selesai di buildRekapTable dan alamat tautan dibuat
 * oleh `hrefFor` (lihat cellLinks.ts).
 */
export function RekapTableView({
  table,
  groupHeading,
  caption,
  hrefFor,
}: {
  table: RekapTable;
  groupHeading: string;
  caption: string;
  hrefFor: (target: RekapCellTarget) => string;
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
          {table.rows.map((row) => {
            const group = { id: row.groupId };
            return (
              <tr key={row.groupId ?? "total"}>
                <th scope="row" className="px-3 py-2 text-left font-normal">
                  {row.label}
                </th>
                {row.cells.map((value, index) => {
                  const period = table.periods[index];
                  return (
                    <td key={period?.key ?? index} className={numCell}>
                      <Count
                        value={value}
                        href={period ? hrefFor({ group, column: { type: "period", period } }) : undefined}
                      />
                    </td>
                  );
                })}
                <td className={`${numCell} border-l border-line`}>
                  <Count value={row.total} strong href={hrefFor({ group, column: { type: "year" } })} />
                </td>
                <td className={numCell}>
                  <Count value={row.noDate} href={hrefFor({ group, column: { type: "noDate" } })} />
                </td>
              </tr>
            );
          })}
        </tbody>
        {showFooter && (
          <tfoot className="border-t border-line">
            <tr>
              <th scope="row" className="px-3 py-2 text-left font-medium">
                Jumlah
              </th>
              {table.columnTotals.map((value, index) => {
                const period = table.periods[index];
                return (
                  <td key={period?.key ?? index} className={numCell}>
                    <Count
                      value={value}
                      strong
                      href={period ? hrefFor({ group: "all", column: { type: "period", period } }) : undefined}
                    />
                  </td>
                );
              })}
              <td className={`${numCell} border-l border-line`}>
                <Count
                  value={table.grandTotal}
                  strong
                  href={hrefFor({ group: "all", column: { type: "year" } })}
                />
              </td>
              <td className={numCell}>
                <Count
                  value={table.noDateTotal}
                  strong
                  href={hrefFor({ group: "all", column: { type: "noDate" } })}
                />
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}