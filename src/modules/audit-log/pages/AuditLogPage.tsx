import { useQuery } from "@tanstack/react-query";
import { getRecentAuditLogs } from "../service";
import { useAuthStore } from "../../../store/authStore";
import type { AuditLogEntry } from "../types";

const ACTION_LABELS: Record<string, string> = {
  CREATE: "Tambah",
  UPDATE: "Ubah",
  DELETE: "Hapus",
  IMPORT: "Impor",
  EXPORT: "Ekspor",
  LOGIN: "Masuk",
  LOGOUT: "Keluar",
  RESTORE: "Pulihkan",
  BACKUP: "Cadangkan",
};

const ENTITY_LABELS: Record<string, string> = {
  permit_records: "Data Izin",
  permit_types: "Jenis Izin",
  custom_field_definitions: "Field Tambahan",
  document_links: "Dokumen",
  permit_record_folder: "Folder Arsip",
  users: "Pengguna",
  auth: "Sesi Login",
};

function formatTimestamp(raw: string): string {
  // Disimpan sebagai UTC oleh SQLite (datetime('now')); dikonversi ke waktu lokal.
  const date = new Date(raw.replace(" ", "T") + "Z");
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

function ValueDetail({ label, json }: { label: string; json: string | null }) {
  if (!json) return null;
  let pretty = json;
  try {
    pretty = JSON.stringify(JSON.parse(json), null, 2);
  } catch {
    // biarkan tampil mentah kalau bukan JSON valid
  }
  return (
    <details className="mt-1">
      <summary className="cursor-pointer text-xs text-ink-muted">{label}</summary>
      <pre className="data-code mt-1 max-w-full overflow-x-auto whitespace-pre-wrap text-xs">{pretty}</pre>
    </details>
  );
}

function AuditLogRow({ entry }: { entry: AuditLogEntry }) {
  return (
    <li className="item-row">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="font-medium">{ACTION_LABELS[entry.action] ?? entry.action}</span>
          <span className="text-ink-muted"> · {ENTITY_LABELS[entry.entity] ?? entry.entity}</span>
          {entry.record_id !== null && (
            <span className="data-code text-ink-muted"> #{entry.record_id}</span>
          )}
        </div>
        <span className="text-xs text-ink-muted">{formatTimestamp(entry.timestamp)}</span>
      </div>
      <p className="mt-1 text-sm text-ink-muted">
        {entry.full_name ?? entry.username ?? "Pengguna tidak diketahui"}
      </p>
      <ValueDetail label="Nilai sebelum" json={entry.old_value} />
      <ValueDetail label="Nilai sesudah" json={entry.new_value} />
    </li>
  );
}

export function AuditLogPage() {
  const currentUser = useAuthStore((s) => s.currentUser);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["audit-log"],
    queryFn: () => getRecentAuditLogs(currentUser!),
    enabled: Boolean(currentUser),
  });

  return (
    <div className="panel">
      <h1 className="mb-1 text-xl font-semibold">Log Aktivitas</h1>
      <p className="section-title mb-4">200 aktivitas terbaru</p>

      {isLoading ? (
        <p className="text-sm text-ink-muted">Memuat...</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-ink-muted">Belum ada aktivitas tercatat.</p>
      ) : (
        <ul className="space-y-2">
          {entries.map((entry) => (
            <AuditLogRow key={entry.id} entry={entry} />
          ))}
        </ul>
      )}
    </div>
  );
}

export default AuditLogPage;