import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getRekap } from "../service";
import {
  isValidYear,
  MAX_YEAR,
  MIN_YEAR,
  PERIOD_KIND_LABELS,
  type DateBasis,
  type PeriodKind,
} from "../periods";
import type { RekapGrouping } from "../crossTab";
import { Segmented, type SegmentedOption } from "../components/segmented";
import { RekapTableView } from "../components/rekapTableView";
import { rekapCellHref, type RekapCellTarget } from "../cellLinks";

const numberFormat = new Intl.NumberFormat("id-ID");

const KIND_OPTIONS: SegmentedOption<PeriodKind>[] = (
  Object.keys(PERIOD_KIND_LABELS) as PeriodKind[]
).map((value) => ({ value, label: PERIOD_KIND_LABELS[value] }));

const BASIS_LABELS: Record<DateBasis, string> = {
  terbit: "tanggal terbit",
  berakhir: "tanggal berakhir",
};

const BASIS_OPTIONS: SegmentedOption<DateBasis>[] = [
  { value: "terbit", label: "Tanggal terbit" },
  { value: "berakhir", label: "Tanggal berakhir" },
];

const GROUPING_OPTIONS: SegmentedOption<RekapGrouping>[] = [
  { value: "permitType", label: "Jenis izin" },
  { value: "status", label: "Status" },
  { value: "total", label: "Total saja" },
];

const GROUP_HEADINGS: Record<RekapGrouping, string> = {
  permitType: "Jenis izin",
  status: "Status",
  total: "Kelompok",
};

export function RekapPage() {
  // Tahun ditulis sebagai teks supaya user bisa mengetik bebas; query hanya jalan bila valid.
  const [yearInput, setYearInput] = useState(() => String(new Date().getFullYear()));
  const [kind, setKind] = useState<PeriodKind>("month");
  const [basis, setBasis] = useState<DateBasis>("terbit");
  const [grouping, setGrouping] = useState<RekapGrouping>("permitType");

  const year = /^\d{4}$/.test(yearInput) ? Number(yearInput) : Number.NaN;
  const yearValid = isValidYear(year);

  const {
    data: table,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["rekap", year, kind, basis, grouping],
    queryFn: () => getRekap({ year, kind, basis, grouping }),
    enabled: yearValid,
  });

  const stepYear = (delta: number) => {
    if (yearValid && isValidYear(year + delta)) setYearInput(String(year + delta));
  };

  const basisLabel = BASIS_LABELS[basis];
  const hrefFor = (target: RekapCellTarget) => rekapCellHref({ grouping, basis, year }, target);

  let result;
  if (!yearValid) {
    result = (
      <p className="text-sm text-danger">
        Tahun harus 4 angka antara {MIN_YEAR} dan {MAX_YEAR}.
      </p>
    );
  } else if (isLoading) {
    result = <p className="text-sm text-ink-muted">Memuat...</p>;
  } else if (isError || !table) {
    result = (
      <div>
        <p className="text-sm text-danger">Rekapitulasi gagal dimuat.</p>
        <button type="button" className="btn-secondary btn-sm mt-3" onClick={() => refetch()}>
          Coba Lagi
        </button>
      </div>
    );
  } else if (table.rows.length === 0) {
    result = (
      <p className="text-sm text-ink-muted">
        Belum ada izin dengan {basisLabel} pada tahun {year}.
      </p>
    );
  } else {
    result = (
      <div className="space-y-3">
        <p className="text-sm text-ink-muted">
          {numberFormat.format(table.grandTotal)} izin dengan {basisLabel} pada tahun {year}
          {table.noDateTotal > 0 && (
            <>
              {" "}
              · {numberFormat.format(table.noDateTotal)} izin tidak punya {basisLabel} (tidak masuk
              kolom periode)
            </>
          )}
        </p>
        <RekapTableView
          table={table}
          groupHeading={GROUP_HEADINGS[grouping]}
          hrefFor={hrefFor}
          caption={`Rekapitulasi izin ${PERIOD_KIND_LABELS[kind].toLowerCase()} berdasarkan ${basisLabel}, tahun ${year}`}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold">Rekapitulasi</h1>
        <p className="text-sm text-ink-muted">
          Jumlah izin per periode, dihitung dari {basisLabel}. Semua status ikut dihitung. Klik angka untuk membuka daftar izinnya.
        </p>
      </header>

      <section className="panel" aria-label="Pengaturan rekap">
        <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
          <div>
            <label htmlFor="rekapYear" className="section-title mb-1.5 block">
              Tahun
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn-secondary btn-sm"
                aria-label="Tahun sebelumnya"
                disabled={!yearValid || !isValidYear(year - 1)}
                onClick={() => stepYear(-1)}
              >
                ‹
              </button>
              <input
                id="rekapYear"
                type="text"
                inputMode="numeric"
                maxLength={4}
                className="field-input w-20 text-center font-mono"
                value={yearInput}
                aria-invalid={!yearValid}
                onChange={(e) => setYearInput(e.target.value.replace(/\D/g, ""))}
              />
              <button
                type="button"
                className="btn-secondary btn-sm"
                aria-label="Tahun berikutnya"
                disabled={!yearValid || !isValidYear(year + 1)}
                onClick={() => stepYear(1)}
              >
                ›
              </button>
            </div>
          </div>

          <Segmented label="Periode" value={kind} options={KIND_OPTIONS} onChange={setKind} />
          <Segmented label="Dasar tanggal" value={basis} options={BASIS_OPTIONS} onChange={setBasis} />
          <Segmented label="Kelompokkan" value={grouping} options={GROUPING_OPTIONS} onChange={setGrouping} />
        </div>
      </section>

      <section className="panel" aria-label="Hasil rekap">
        {result}
      </section>
    </div>
  );
}

export default RekapPage;