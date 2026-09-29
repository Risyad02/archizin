// src/modules/permit-records/pages/PermitRecordsPage.tsx
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { getPermitRecords, deletePermitRecord } from "../service";
import { getActivePermitTypes } from "../../permit-types/service";
import { useAuthStore } from "../../../store/authStore";
import type { PermitRecord } from "../types";
import { confirm } from "@tauri-apps/plugin-dialog";
import { can } from "../../../lib/permissions";

type PermitTypeOption = Awaited<ReturnType<typeof getActivePermitTypes>>[number];

export function PermitRecordsPage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const [permitTypeFilter, setPermitTypeFilter] = useState<number | "all">("all");

  const { data: records = [], isLoading, refetch } = useQuery({
    queryKey: ["permit-records"],
    queryFn: getPermitRecords,
  });

  const { data: permitTypes = [] } = useQuery({
    queryKey: ["permit-types", "active"],
    queryFn: getActivePermitTypes,
  });

  const filtered =
    permitTypeFilter === "all"
      ? records
      : records.filter((r: PermitRecord) => r.permit_type_id === permitTypeFilter);

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

      <div className="mb-4">
        <label htmlFor="permitTypeFilter" className="field-label">
          Jenis Izin
        </label>
        <select
          id="permitTypeFilter"
          className="field-input w-full sm:w-auto sm:min-w-64"
          value={permitTypeFilter}
          onChange={(e) =>
            setPermitTypeFilter(e.target.value === "all" ? "all" : Number(e.target.value))
          }
        >
          <option value="all">Semua Jenis Izin</option>
          {permitTypes.map((pt: PermitTypeOption) => (
            <option key={pt.id} value={pt.id}>
              {pt.name}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <p className="text-sm text-ink-muted">Memuat...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-ink-muted">Belum ada data izin.</p>
      ) : (
        <>
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
                {filtered.map((r: PermitRecord) => (
                  <tr key={r.id} className="border-b border-line last:border-0 hover:bg-accent-soft/40">
                    <td className="data-code px-3 py-3">{r.nomor_izin}</td>
                    <td className="px-3 py-3">{r.nama_pemohon}</td>
                    <td className="px-3 py-3">{r.permit_type_name}</td>
                    <td className="px-3 py-3 font-medium" style={{ color: r.status_color ?? undefined }}>
                      {r.status_label}
                    </td>
                    <td className="px-3 py-3">{r.tanggal_berakhir ?? "-"}</td>
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

          {/* Layar sempit: kartu per data */}
          <ul className="space-y-3 md:hidden">
            {filtered.map((r: PermitRecord) => (
              <li key={r.id} className="item-row">
                <p className="data-code">{r.nomor_izin}</p>
                <p className="font-medium">{r.nama_pemohon}</p>
                <p className="text-sm text-ink-muted">{r.permit_type_name}</p>
                <p className="mt-1 text-sm">
                  <span className="font-medium" style={{ color: r.status_color ?? undefined }}>
                    {r.status_label}
                  </span>
                  <span className="text-ink-muted"> · s.d. {r.tanggal_berakhir ?? "-"}</span>
                </p>
                <div className="mt-3 flex gap-2">
                  <Link to={`/permit-records/${r.id}`} className="btn-secondary btn-sm">
                    Detail
                  </Link>
                  <button type="button" className="btn-danger btn-sm" onClick={() => handleDelete(r)}>
                    Hapus
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default PermitRecordsPage;