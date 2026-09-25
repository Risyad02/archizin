// src/modules/permit-records/pages/PermitRecordDetailPage.tsx
import { useNavigate, useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getPermitRecordDetail, deletePermitRecord } from "../service";
import { useAuthStore } from "../../../store/authStore";

function formatCustomValue(cv: {
  field_type: string;
  value_text: string | null;
  value_integer: number | null;
  value_decimal: number | null;
  value_date: string | null;
  value_boolean: number | null;
}): string {
  switch (cv.field_type) {
    case "boolean":
      return cv.value_boolean ? "Ya" : "Tidak";
    case "integer":
      return cv.value_integer !== null ? String(cv.value_integer) : "-";
    case "decimal":
      return cv.value_decimal !== null ? String(cv.value_decimal) : "-";
    case "date":
    case "datetime":
      return cv.value_date ?? "-";
    default:
      return cv.value_text ?? "-";
  }
}

function PermitRecordDetailPage() {
  const { id } = useParams<{ id: string }>();
  const recordId = Number(id);
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.currentUser);

  const { data: detail, isLoading } = useQuery({
    queryKey: ["permit-record", recordId],
    queryFn: () => getPermitRecordDetail(recordId),
    enabled: !Number.isNaN(recordId),
  });

  async function handleDelete() {
    if (!currentUser) return;
    if (!confirm("Hapus data izin ini?")) return;
    await deletePermitRecord(recordId, currentUser.id);
    navigate("/permit-records");
  }

  if (isLoading) {
    return <div className="panel">Memuat...</div>;
  }

  if (!detail?.record) {
    return (
      <div className="panel">
        <p>Data izin tidak ditemukan.</p>
        <Link to="/permit-records">Kembali</Link>
      </div>
    );
  }

  const { record, customValues } = detail;

  return (
    <div className="panel">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Detail Data Izin</h1>
        <div className="flex gap-2">
          <Link to={`/permit-records/${record.id}/edit`} className="btn-primary">
            Edit
          </Link>
          <button onClick={handleDelete}>Hapus</button>
        </div>
      </div>

      <dl className="space-y-2">
        <div>
          <dt className="font-medium">Jenis Izin</dt>
          <dd>{record.permit_type_name}</dd>
        </div>
        <div>
          <dt className="font-medium">Nomor Izin</dt>
          <dd className="data-code">{record.nomor_izin}</dd>
        </div>
        <div>
          <dt className="font-medium">Nama Pemohon</dt>
          <dd>{record.nama_pemohon}</dd>
        </div>
        <div>
          <dt className="font-medium">Nama Usaha</dt>
          <dd>{record.nama_usaha ?? "-"}</dd>
        </div>
        <div>
          <dt className="font-medium">Status</dt>
          <dd style={{ color: record.status_color ?? undefined }}>{record.status_label}</dd>
        </div>
        <div>
          <dt className="font-medium">Tanggal Dokumen</dt>
          <dd>{record.tanggal_dokumen ?? "-"}</dd>
        </div>
        <div>
          <dt className="font-medium">Tanggal Terbit</dt>
          <dd>{record.tanggal_terbit ?? "-"}</dd>
        </div>
        <div>
          <dt className="font-medium">Tanggal Mulai Berlaku</dt>
          <dd>{record.tanggal_mulai_berlaku ?? "-"}</dd>
        </div>
        <div>
          <dt className="font-medium">Tanggal Berakhir</dt>
          <dd>{record.tanggal_berakhir ?? "-"}</dd>
        </div>
        <div>
          <dt className="font-medium">Keterangan</dt>
          <dd>{record.keterangan ?? "-"}</dd>
        </div>
      </dl>

      {customValues.length > 0 && (
        <div className="mt-4">
          <h2 className="font-medium mb-2">Field Tambahan</h2>
          <dl className="space-y-2">
            {customValues.map((cv) => (
              <div key={cv.custom_field_definition_id}>
                <dt className="font-medium">{cv.label}</dt>
                <dd>{formatCustomValue(cv)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <div className="mt-4">
        <Link to="/permit-records">← Kembali ke daftar</Link>
      </div>
    </div>
  );
}

export default PermitRecordDetailPage;