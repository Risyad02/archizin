// src/modules/permit-records/pages/PermitRecordsPage.tsx
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { getPermitRecords, deletePermitRecord } from "../service";
import { getActivePermitTypes } from "../../permit-types/service";
import { useAuthStore } from "../../../store/authStore";
import type { PermitRecord } from "../types";

type PermitTypeOption = Awaited<ReturnType<typeof getActivePermitTypes>>[number];

export function PermitRecordsPage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const [permitTypeFilter, setPermitTypeFilter] = useState<number | "all">("all");

  const { data: records = [], refetch } = useQuery({
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

  async function handleDelete(id: number) {
    if (!currentUser) return;
    if (!confirm("Hapus data izin ini?")) return;
    await deletePermitRecord(id, currentUser.id);
    refetch();
  }

  return (
    <div className="panel">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Data Perizinan</h1>
        <Link to="/permit-records/new" className="btn-primary">
          + Tambah Data
        </Link>
      </div>

      <select
        className="field-input mb-4"
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

      <table className="w-full">
        <thead>
          <tr>
            <th>Nomor Izin</th>
            <th>Pemohon</th>
            <th>Jenis Izin</th>
            <th>Status</th>
            <th>Berlaku s.d.</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((r: PermitRecord) => (
            <tr key={r.id}>
              <td className="data-code">{r.nomor_izin}</td>
              <td>{r.nama_pemohon}</td>
              <td>{r.permit_type_name}</td>
              <td style={{ color: r.status_color ?? undefined }}>{r.status_label}</td>
              <td>{r.tanggal_berakhir}</td>
              <td>
                <Link to={`/permit-records/${r.id}`}>Detail</Link>{" "}
                <button onClick={() => handleDelete(r.id)}>Hapus</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// di akhir PermitRecordsPage.tsx
export default PermitRecordsPage;