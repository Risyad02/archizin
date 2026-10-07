// src/modules/dashboard/pages/DashboardPage.tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getDashboardSummary } from "../service";
import { deriveHeadlineStats } from "../headline";
import { formatDaysLabel } from "../daysLabel";
import { buildArchiveHealthItems } from "../archiveHealth";
import type { AttentionRecord } from "../types";
import { MonthlyTrendChart } from "../components/MonthlyTrendChart";
import { DistributionBars } from "../components/DistributionBars";
import { RecentActivity } from "../components/RecentActivity";
import { useAuthStore } from "../../../store/authStore";
import { can } from "../../../lib/permissions";

const numberFormat = new Intl.NumberFormat("id-ID");
const dateFormat = new Intl.DateTimeFormat("id-ID", { dateStyle: "long" });

function StatCell({
  label,
  value,
  note,
  danger = false,
}: {
  label: string;
  value: number;
  note: string;
  danger?: boolean;
}) {
  return (
    <div className="bg-paper-raised p-4 sm:p-5">
      <dt className="section-title">{label}</dt>
      <dd
        className={`mt-2 font-mono text-3xl font-medium tabular-nums ${
          danger && value > 0 ? "text-danger" : "text-ink"
        }`}
      >
        {numberFormat.format(value)}
      </dd>
      <p className="mt-1 text-xs text-ink-muted">{note}</p>
    </div>
  );
}

/** Daftar terbatas; jumlah lengkapnya (total) datang dari bucket, sisanya ditulis "dan N lainnya". */
function AttentionList({
  title,
  records,
  total,
  emptyText,
  overdue = false,
}: {
  title: string;
  records: AttentionRecord[];
  total: number;
  emptyText: string;
  overdue?: boolean;
}) {
  const remaining = total - records.length;

  return (
    <section className="panel" aria-label={title}>
      <h2 className="section-title mb-3">{title}</h2>

      {records.length === 0 ? (
        <p className="text-sm text-ink-muted">{emptyText}</p>
      ) : (
        <ul className="divide-y divide-line">
          {records.map((record) => (
            <li key={record.id}>
              <Link
                to={`/permit-records/${record.id}`}
                className="-mx-2 flex items-baseline justify-between gap-4 rounded px-2 py-3 hover:bg-accent-soft/40"
              >
                <span className="min-w-0">
                  <span className="data-code block truncate">{record.nomor_izin ?? "-"}</span>
                  <span className="block truncate text-sm">{record.nama_pemohon ?? "-"}</span>
                  <span className="block truncate text-xs text-ink-muted">
                    {record.permit_type_name}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span
                    className={`block text-sm font-medium ${overdue ? "text-danger" : "text-ink"}`}
                  >
                    {record.days === null ? "-" : formatDaysLabel(record.days)}
                  </span>
                  <span className="block text-xs text-ink-muted tabular-nums">
                    {record.tanggal_berakhir ?? "-"}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {remaining > 0 && (
        <p className="mt-3 text-xs text-ink-muted">
          dan {numberFormat.format(remaining)} izin lainnya
        </p>
      )}
    </section>
  );
}

export function DashboardPage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  // Lazy initializer: tanggal diambil sekali saat halaman dibuka, bukan tiap render.
  const [today] = useState(() => new Date());

  const {
    data: summary,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: getDashboardSummary,
  });

  const header = (
    <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <p className="text-sm text-ink-muted">Per {dateFormat.format(today)}</p>
    </header>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        {header}
        <p className="text-sm text-ink-muted">Memuat...</p>
      </div>
    );
  }

  if (isError || !summary) {
    return (
      <div className="space-y-6">
        {header}
        <div className="panel">
          <p className="text-sm text-danger">Ringkasan dashboard gagal dimuat.</p>
          <button type="button" className="btn-secondary btn-sm mt-3" onClick={() => refetch()}>
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  const stats = deriveHeadlineStats(summary);

  if (stats.total === 0) {
    return (
      <div className="space-y-6">
        {header}
        <div className="panel">
          <p className="text-sm text-ink-muted">Belum ada data izin.</p>
          {can(currentUser?.role, "record:create") && (
            <Link to="/permit-records/new" className="btn-primary mt-3">
              + Tambah Data
            </Link>
          )}
        </div>
      </div>
    );
  }

  const attention: { label: string; value: number }[] = [
    {
      label: "Izin tanpa tanggal berakhir — masa berlakunya tidak bisa dipantau",
      value: stats.noExpiryDate,
    },
    {
      label: "Izin tanpa tanggal terbit — tidak masuk grafik tren",
      value: stats.withoutIssueDate,
    },
    { label: "Izin tanpa status", value: stats.withoutStatus },
  ].filter((item) => item.value > 0);

  const healthItems = buildArchiveHealthItems(summary.archiveHealth);
  // UI hanya menyembunyikan panel; getRecentActivity di service tetap menolak role tanpa audit:view.
  const showActivity = can(currentUser?.role, "audit:view");

  return (
    <div className="space-y-6">
      {header}

      <section aria-label="Ringkasan utama">
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line lg:grid-cols-4">
          <StatCell label="Total Izin" value={stats.total} note="data tercatat" />
          <StatCell label="Aktif" value={stats.active} note="berstatus Aktif" />
          <StatCell
            label="Segera Berakhir"
            value={stats.expiringSoon}
            note={
              stats.expiringSoonMaxDays === null
                ? "aturan masa berlaku belum diatur"
                : `dalam 0–${stats.expiringSoonMaxDays} hari ke depan`
            }
          />
          <StatCell
            label="Kedaluwarsa"
            value={stats.overdue}
            note="dihitung dari tanggal berakhir"
            danger
          />
        </dl>
        {stats.expiryExcluded > 0 && (
          <p className="mt-2 text-xs text-ink-muted">
            {numberFormat.format(stats.expiryExcluded)} izin berstatus Dicabut atau Tidak Aktif
            tidak dihitung dalam masa berlaku.
          </p>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AttentionList
          title="Segera Berakhir"
          records={summary.attention.upcoming}
          total={stats.expiringSoon}
          emptyText={
            stats.expiringSoonMaxDays === null
              ? "Aturan masa berlaku belum diatur."
              : "Tidak ada izin yang akan berakhir dalam waktu dekat."
          }
        />
        <AttentionList
          title="Kedaluwarsa"
          records={summary.attention.overdue}
          total={stats.overdue}
          emptyText="Tidak ada izin yang kedaluwarsa."
          overdue
        />
      </div>

      <section className="panel" aria-label="Tren penerbitan">
        <h2 className="section-title mb-4">Izin Terbit per Bulan · 12 Bulan Terakhir</h2>
        <MonthlyTrendChart points={summary.monthly} />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="panel" aria-label="Sebaran status">
          <h2 className="section-title mb-4">Per Status</h2>
          <DistributionBars
            emptyText="Belum ada data."
            items={summary.byStatus.map((s) => ({ key: s.status_id, label: s.label, total: s.total }))}
          />
        </section>
        <section className="panel" aria-label="Sebaran jenis izin">
          <h2 className="section-title mb-4">Per Jenis Izin</h2>
          <DistributionBars
            emptyText="Belum ada data."
            items={summary.byPermitType.map((t) => ({ key: t.permit_type_id, label: t.name, total: t.total }))}
          />
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section
          className={`panel ${showActivity ? "" : "lg:col-span-2"}`}
          aria-label="Kesehatan arsip"
        >
          <h2 className="section-title mb-3">Kesehatan Arsip</h2>
          {healthItems.length === 0 ? (
            <p className="text-sm text-ink-muted">
              Semua izin sudah punya folder dan dokumen, dan tidak ada file yang hilang.
            </p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {healthItems.map((item) => (
                <li key={item.key} className="flex items-baseline justify-between gap-4 py-2">
                  <span>
                    {item.label}
                    {item.note && (
                      <span className="block text-xs text-ink-muted">{item.note}</span>
                    )}
                  </span>
                  <span className="shrink-0 font-mono tabular-nums">
                    <span className={item.severity === "problem" ? "text-danger" : ""}>
                      {numberFormat.format(item.value)}
                    </span>
                    <span className="text-ink-muted"> / {numberFormat.format(item.of)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {showActivity && <RecentActivity now={today} />}
      </div>

      {attention.length > 0 && (
        <section className="panel" aria-label="Perlu dilengkapi">
          <h2 className="section-title mb-3">Perlu Dilengkapi</h2>
          <ul className="divide-y divide-line text-sm">
            {attention.map((item) => (
              <li key={item.label} className="flex items-baseline justify-between gap-4 py-2">
                <span>{item.label}</span>
                <span className="font-mono tabular-nums">{numberFormat.format(item.value)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export default DashboardPage;