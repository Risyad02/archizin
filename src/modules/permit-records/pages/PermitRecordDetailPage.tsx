// src/modules/permit-records/pages/PermitRecordDetailPage.tsx
import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { open } from "@tauri-apps/plugin-dialog";
import { confirm } from "@tauri-apps/plugin-dialog";
import { getPermitRecordDetail, deletePermitRecord } from "../service";
import {
  getDocumentsForRecord,
  addDocumentFromFile,
  removeDocumentLink,
  openDocumentFile
} from "../documents/service";
import type { DocumentLink } from "../documents/types";
import { useAuthStore } from "../../../store/authStore";
import { can } from "../../../lib/permissions";
import { openRecordFolder, createRecordFolderManually } from "../service"; 
import { getStorageSettings } from "../../storage-settings/service";
import { validateAllDocumentsForRecord } from "../documents/service";

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

function fileNameFromPath(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

function documentStatusLabel(status: DocumentLink["status"]): string {
  switch (status) {
    case "valid":
      return "Tersedia";
    case "not_found":
      return "File tidak ditemukan";
    case "unreachable":
      return "Tidak bisa diakses";
    case "needs_auth":
      return "Perlu autentikasi";
    default:
      return "Belum dicek";
  }
}

function PermitRecordDetailPage() {
  const { id } = useParams<{ id: string }>();
  const recordId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.currentUser);
  const [addingDocument, setAddingDocument] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [documentError, setDocumentError] = useState<string | null>(null);
  
  const { data: detail, isLoading } = useQuery({
    queryKey: ["permit-record", recordId],
    queryFn: () => getPermitRecordDetail(recordId),
    enabled: !Number.isNaN(recordId),
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["permit-record-documents", recordId],
    queryFn: () => getDocumentsForRecord(recordId),
    enabled: !Number.isNaN(recordId),
  });

  const { data: storageSettings } = useQuery({
    queryKey: ["storage-settings"],
    queryFn: getStorageSettings,
  });

  async function handleDeleteRecord() {
    if (!currentUser) return;
    const confirmed = await confirm("Hapus data izin ini?", {
      title: "Konfirmasi Hapus",
      kind: "warning",
    });
    if (!confirmed) return;
    await deletePermitRecord(recordId, currentUser);
    navigate("/permit-records");
  }

  async function handleOpenFolder(folderPath: string) {
    if (!currentUser || !storageSettings?.storageRoot) return;
    try {
      await openRecordFolder(folderPath, storageSettings.storageRoot, currentUser);
    } catch (err) {
      setDocumentError(err instanceof Error ? err.message : "Gagal membuka folder");
    }
  }

  async function handleOpenFile(doc: DocumentLink) {
    if (!currentUser || !storageSettings?.storageRoot) return;
    try {
      await openDocumentFile(doc, storageSettings.storageRoot, currentUser);
    } catch (err) {
      setDocumentError(err instanceof Error ? err.message : "Gagal membuka file");
    }
  }

  async function handleAddDocument(folderPath: string) {
    setDocumentError(null);
    const selected = await open({ directory: false, multiple: false });
    if (typeof selected !== "string") return;

    setAddingDocument(true);
    try {
      await addDocumentFromFile(recordId, folderPath, selected, currentUser!);
      await queryClient.invalidateQueries({ queryKey: ["permit-record-documents", recordId] });
    } catch (err) {
      setDocumentError(err instanceof Error ? err.message : "Gagal menambahkan dokumen");
    } finally {
      setAddingDocument(false);
    }
  }
    async function handleCreateFolderManually() {
    if (!currentUser) return;
    setDocumentError(null);
    setCreatingFolder(true);
    try {
      await createRecordFolderManually(recordId, currentUser);
      await queryClient.invalidateQueries({ queryKey: ["permit-record", recordId] });
    } catch (err) {
      setDocumentError(err instanceof Error ? err.message : "Gagal membuat folder");
    } finally {
      setCreatingFolder(false);
    }
  }

  async function handleValidateDocuments() {
    if (!currentUser) return;
    setDocumentError(null);
    try {
      await validateAllDocumentsForRecord(recordId, currentUser);
      await queryClient.invalidateQueries({ queryKey: ["permit-record-documents", recordId] });
    } catch (err) {
      setDocumentError(err instanceof Error ? err.message : "Gagal memeriksa status dokumen");
    }
  }

  async function handleDeleteDocument(docId: number) {
    const confirmed = await confirm(
      "Hapus tautan dokumen ini? File fisik di folder TIDAK akan dihapus.",
      { title: "Konfirmasi Hapus Tautan", kind: "warning" }
    );
    if (!confirmed) return;
    await removeDocumentLink(docId, currentUser!);
    await queryClient.invalidateQueries({ queryKey: ["permit-record-documents", recordId] });
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
  const hasFolder = Boolean(record.lokasi_folder);

  return (
    <div className="panel mx-auto max-w-4xl">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold">Detail Data Izin</h1>
        <div className="flex flex-wrap gap-2">
          {can(currentUser?.role, "record:update") && (
            <Link to={`/permit-records/${record.id}/edit`} className="btn-primary">
              Edit
            </Link>
          )}
          {can(currentUser?.role, "record:delete") && (
            <button className="btn-danger" onClick={handleDeleteRecord}>
              Hapus
            </button>
          )}
        </div>
      </header>

      <section className="mb-8">
        <h2 className="section-title mb-3">
          Informasi Izin
        </h2>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
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
          <div className="sm:col-span-2">
            <dt className="font-medium">Keterangan</dt>
            <dd>{record.keterangan ?? "-"}</dd>
          </div>
        </dl>
      </section>

      {customValues.length > 0 && (
        <section className="mb-8">
          <h2 className="section-title mb-3">
            Field Tambahan
          </h2>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            {customValues.map((cv) => (
              <div key={cv.custom_field_definition_id}>
                <dt className="font-medium">{cv.label}</dt>
                <dd>{formatCustomValue(cv)}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section className="mb-8">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="section-title">Dokumen</h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-secondary"
              disabled={!hasFolder}
              onClick={() => record.lokasi_folder && handleOpenFolder(record.lokasi_folder)}
            >
              Buka Folder
            </button>
            {documents.length > 0 && can(currentUser?.role, "document:validate") && (
              <button type="button" className="btn-secondary" onClick={handleValidateDocuments}>
                Cek Status Dokumen
              </button>
            )}
            {can(currentUser?.role, "document:add") && (
              <button
                type="button"
                className="btn-primary"
                disabled={!hasFolder || addingDocument}
                onClick={() => record.lokasi_folder && handleAddDocument(record.lokasi_folder)}
              >
                {addingDocument ? "Menambahkan..." : "Tambah Dokumen"}
              </button>
            )}
          </div>
        </div>

        {!hasFolder && (
          <div className="mb-3">
            <p className="mb-2 text-sm text-ink-muted">
              Folder penyimpanan belum tersedia untuk data izin ini (kemungkinan pembuatan folder
              otomatis sempat gagal).
            </p>
            {can(currentUser?.role, "record:update") && (
              <button
                type="button"
                className="btn-secondary btn-sm"
                disabled={creatingFolder}
                onClick={handleCreateFolderManually}
              >
                {creatingFolder ? "Membuat Folder..." : "Buat Folder Sekarang"}
              </button>
            )}
          </div>
        )}

        {documentError && <p className="mb-3 text-sm text-danger">{documentError}</p>}

        {documents.length === 0 ? (
          <p className="text-sm text-ink-muted">Belum ada dokumen ditambahkan.</p>
        ) : (
          <ul className="space-y-2">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="item-row flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="data-code truncate">{fileNameFromPath(doc.url)}</p>
                  <p className={`text-xs ${doc.status === "valid" ? "text-ink-muted" : "text-danger"}`}>
                    {documentStatusLabel(doc.status)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => handleOpenFile(doc)}>
                    Buka File
                  </button>
                  {can(currentUser?.role, "document:remove") && (
                    <button type="button" className="btn-danger btn-sm" onClick={() => handleDeleteDocument(doc.id)}>
                      Hapus Tautan
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div>
        <Link to="/permit-records">← Kembali ke daftar</Link>
      </div>
    </div>
  );
}

export default PermitRecordDetailPage;