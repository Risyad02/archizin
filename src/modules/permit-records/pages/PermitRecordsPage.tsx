// src/modules/permit-records/pages/PermitRecordsPage.tsx
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { confirm } from "@tauri-apps/plugin-dialog";
import { getPermitRecordsPage, deletePermitRecord } from "../service";
import { getActivePermitTypes } from "../../permit-types/service";
import { getStatusOptions } from "../../permit-status/service";
import { getActiveStatusRules } from "../../permit-status/service";
import { computeExpiryBadge } from "../../permit-status/expiry";
import { ExpiryIndicator } from "../../permit-status/components/ExpiryIndicator";
import { useAuthStore } from "../../../store/authStore";
import { can } from "../../../lib/permissions";
import { useDebouncedValue } from "../../../lib/useDebouncedValue";
import { Pagination } from "../../../components/Pagination";
import {
  PAGE_SIZE_OPTIONS,
  PAGE_SIZE_DEFAULT,
  getDefaultSortDirection,
  type PermitRecordSortBy,
  type SortDirection,
  type PermitRecordQuery,
} from "../searchQuery";
import type { PermitRecord } from "../types";

const SORT_OPTIONS: { value: PermitRecordSortBy; label: string }[] = [
  { value: "created_at", label: "Terbaru Dibuat" },
  { value: "tanggal_berakhir", label: "Tanggal Berakhir" },
  { value: "nomor_izin", label: "Nomor Izin" },
  { value: "nama_pemohon", label: "Nama Pemohon" },
  { value: "tahun", label: "Tahun" },
];

export function PermitRecordsPage() {
  const currentUser = useAuthStore((s) => s.currentUser);

  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput, 300);

  const [filterOpen, setFilterOpen] = useState(false);
  const [permitTypeFilter, setPermitTypeFilter] = useState<number | "all">("all");
  const [statusFilter, setStatusFilter] = useState<number | "all">("all");
  const [tahunFilter, setTahunFilter] = useState("");
  const [tanggalBerakhirFrom, setTanggalBerakhirFrom] = useState("");
  const [tanggalBerakhirTo, setTanggalBerakhirTo] = useState("");

  const [sortBy, setSortBy] = useState<PermitRecordSortBy>("created_at");
  const [sortDir, setSortDir] = useState<SortDirection>(getDefaultSortDirection("created_at"));

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT);

  const { data: permitTypes = [] } = useQuery({
    queryKey: ["permit-types", "active"],
    queryFn: getActivePermitTypes,
  });

  const { data: statuses = [] } = useQuery({
    queryKey: ["permit-status"],
    queryFn: getStatusOptions,
  });

  const { data: statusRules = [] } = useQuery({
    queryKey: ["status-rules"],
    queryFn: getActiveStatusRules,
  });

  const query: PermitRecordQuery = {
    search: search || undefined,
    permitTypeId: permitTypeFilter === "all" ? undefined : permitTypeFilter,
    statusId: statusFilter === "all" ? undefined : statusFilter,
    tahun: tahunFilter ? Number(tahunFilter) : undefined,
    tanggalBerakhirFrom: tanggalBerakhirFrom || undefined,
    tanggalBerakhirTo: tanggalBerakhirTo || undefined,
    sortBy,
    sortDir,
    page,
    pageSize,
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["permit-records", query],
    queryFn: () => getPermitRecordsPage(query),
  });

  const records = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const activeFilterCount = [
    permitTypeFilter !== "all",
    statusFilter !== "all",
    tahunFilter !== "",
    tanggalBerakhirFrom !== "",
    tanggalBerakhirTo !== "",
  ].filter(Boolean).length;

  function updateSortBy(value: PermitRecordSortBy) {
    setSortBy(value);
    setSortDir(getDefaultSortDirection(value));
    setPage(1);
  }

  function toggleSortDir() {
    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    setPage(1);
  }

  function resetFilters() {
    setPermitTypeFilter("all");
    setStatusFilter("all");
    setTahunFilter("");
    setTanggalBerakhirFrom("");
    setTanggalBerakhirTo("");
    setPage(1);
  }

  async function handleDelete(record: PermitRecord) {
    if (!currentUser) return;
    const confirmed = await confirm(`Hapus data izin "${record.nomor_izin ?? record.id}"?`, {
      title: "Konfirmasi Hapus",
      kind: "warning",
    });
    if (!confirmed) return;
    await deletePermitRecord(record.id, currentUser);
    refetch();
  }

  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  return (
    <div className="panel">
      <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold">Data Perizinan</h1>
        {can(currentUser?.role, "record:create") && (
          <Link to="/permit-records/new" className="btn-primary">
            + Tambah Data
          </Link>
        )}
      </header>

      {/* Kotak pencarian: selalu terlihat */}
      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <div className="flex-1">
          <label htmlFor="search" className="field-label">
            Cari
          </label>
          <input
            id="search"
            className="field-input w-full"
            placeholder="Nomor izin, nama pemohon, nama usaha, jenis izin, keterangan..."
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="flex items-end">
          <button
            type="button"
            className="btn-secondary w-full sm:w-auto"
            aria-expanded={filterOpen}
            aria-controls="filter-panel"
            onClick={() => setFilterOpen((open) => !open)}
          >
            Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </button>
        </div>
      </div>

      {/* Panel filter: disembunyikan di balik tombol Filter */}
      {filterOpen && (
        <div id="filter-panel" className="item-row mb-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label htmlFor="filterPermitType" className="field-label">
                Jenis Izin
              </label>
              <select
                id="filterPermitType"
                className="field-input w-full"
                value={permitTypeFilter}
                onChange={(e) => {
                  setPermitTypeFilter(e.target.value === "all" ? "all" : Number(e.target.value));
                  setPage(1);
                }}
              >
                <option value="all">Semua Jenis Izin</option>
                {permitTypes.map((pt) => (
                  <option key={pt.id} value={pt.id}>
                    {pt.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="filterStatus" className="field-label">
                Status
              </label>
              <select
                id="filterStatus"
                className="field-input w-full"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value === "all" ? "all" : Number(e.target.value));
                  setPage(1);
                }}
              >
                <option value="all">Semua Status</option>
                {statuses.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="filterTahun" className="field-label">
                Tahun
              </label>
              <input
                id="filterTahun"
                type="number"
                className="field-input w-full"
                placeholder="mis. 2026"
                value={tahunFilter}
                onChange={(e) => {
                  setTahunFilter(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <div>
              <label htmlFor="filterBerakhirFrom" className="field-label">
                Berakhir Dari
              </label>
              <input
                id="filterBerakhirFrom"
                type="date"
                className="field-input w-full"
                value={tanggalBerakhirFrom}
                onChange={(e) => {
                  setTanggalBerakhirFrom(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <div>
              <label htmlFor="filterBerakhirTo" className="field-label">
                Berakhir Sampai
              </label>
              <input
                id="filterBerakhirTo"
                type="date"
                className="field-input w-full"
                value={tanggalBerakhirTo}
                onChange={(e) => {
                  setTanggalBerakhirTo(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>

          {activeFilterCount > 0 && (
            <button type="button" className="btn-text mt-3 text-sm" onClick={resetFilters}>
              Reset Filter
            </button>
          )}
        </div>
      )}

      {/* Kontrol sort dan ukuran halaman */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label htmlFor="sortBy" className="field-label">
              Urutkan
            </label>
            <select
              id="sortBy"
              className="field-input"
              value={sortBy}
              onChange={(e) => updateSortBy(e.target.value as PermitRecordSortBy)}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <button type="button" className="btn-secondary btn-sm" onClick={toggleSortDir}>
            {sortDir === "asc" ? "Naik ↑" : "Turun ↓"}
          </button>
        </div>

        <div>
          <label htmlFor="pageSize" className="field-label">
            Baris per Halaman
          </label>
          <select
            id="pageSize"
            className="field-input"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-ink-muted">Memuat...</p>
      ) : records.length === 0 ? (
        <p className="text-sm text-ink-muted">
          {total === 0 && !search && activeFilterCount === 0
            ? "Belum ada data izin."
            : "Tidak ada data izin yang cocok dengan pencarian/filter."}
        </p>
      ) : (
        <>
          <p className="mb-2 text-sm text-ink-muted">
            Menampilkan {rangeStart}-{rangeEnd} dari {total} data
          </p>

          {/* Layar lebar: tabel */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-ink-muted">
                  <th className="px-3 py-2 font-medium">Nomor Izin</th>
                  <th className="px-3 py-2 font-medium">Pemohon</th>
                  <th className="px-3 py-2 font-medium">Jenis Izin</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Berlaku s.d.</th>
                  <th className="px-3 py-2">
                    <span className="sr-only">Aksi</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className="border-b border-line last:border-0 hover:bg-accent-soft/40">
                    <td className="data-code px-3 py-3">{r.nomor_izin}</td>
                    <td className="px-3 py-3">{r.nama_pemohon}</td>
                    <td className="px-3 py-3">{r.permit_type_name}</td>
                    <td className="px-3 py-3 font-medium" style={{ color: r.status_color ?? undefined }}>
                      {r.status_label}
                    </td>
                    <td className="px-3 py-3">
                      {r.tanggal_berakhir ?? "-"}
                      <ExpiryIndicator badge={computeExpiryBadge(r.tanggal_berakhir, statusRules, r.status_code)} />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-2">
                        <Link to={`/permit-records/${r.id}`} className="btn-secondary btn-sm">
                          Detail
                        </Link>
                        {can(currentUser?.role, "record:delete") && (
                          <button type="button" className="btn-danger btn-sm" onClick={() => handleDelete(r)}>
                            Hapus
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Layar sempit: kartu */}
          <ul className="space-y-3 md:hidden">
            {records.map((r) => (
              <li key={r.id} className="item-row">
                <p className="data-code">{r.nomor_izin}</p>
                <p className="font-medium">{r.nama_pemohon}</p>
                <p className="text-sm text-ink-muted">{r.permit_type_name}</p>
                <p className="mt-1 text-sm">
                  <span className="font-medium" style={{ color: r.status_color ?? undefined }}>
                    {r.status_label}
                  </span>
                  <span className="text-ink-muted"> · s.d. {r.tanggal_berakhir ?? "-"}</span>
                  <ExpiryIndicator badge={computeExpiryBadge(r.tanggal_berakhir, statusRules, r.status_code)} />
                </p>
                <div className="mt-3 flex gap-2">
                  <Link to={`/permit-records/${r.id}`} className="btn-secondary btn-sm">
                    Detail
                  </Link>
                  {can(currentUser?.role, "record:delete") && (
                    <button type="button" className="btn-danger btn-sm" onClick={() => handleDelete(r)}>
                      Hapus
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

export default PermitRecordsPage;