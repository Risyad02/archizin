import type { ActivityItem, ActivityRow } from "./types";

const ACTION_VERBS: Record<string, string> = {
  CREATE: "Menambah",
  UPDATE: "Mengubah",
  DELETE: "Menghapus",
  IMPORT: "Mengimpor",
  EXPORT: "Mengekspor",
  RESTORE: "Memulihkan",
  BACKUP: "Mencadangkan",
};

/**
 * Nama entity di audit_logs -> istilah yang dibaca user. Entity yang belum terdaftar tampil
 * apa adanya (garis bawah jadi spasi), jadi menambah entity baru tidak pernah merusak panel.
 */
const ENTITY_LABELS: Record<string, string> = {
  permit_records: "data izin",
  permit_record_folder: "folder data izin",
  permit_types: "jenis izin",
  custom_field_definitions: "field kustom",
  custom_field_options: "opsi field kustom",
  document_links: "dokumen",
  users: "pengguna",
};

/** Entity yang punya halaman detail di /permit-records/:id. */
const LINKABLE_ENTITIES = new Set(["permit_records", "permit_record_folder"]);

export function describeActivity(row: ActivityRow): { description: string; recordId: number | null } {
  const action = row.action.toUpperCase();

  let description: string;
  if (action === "LOGIN") {
    description = "Masuk ke aplikasi";
  } else if (action === "LOGOUT") {
    description = "Keluar dari aplikasi";
  } else {
    const verb = ACTION_VERBS[action] ?? row.action;
    const entity = ENTITY_LABELS[row.entity] ?? row.entity.replace(/_/g, " ");
    description = `${verb} ${entity}`;
  }

  // Izin yang sudah dihapus (soft delete) tidak bisa dibuka lagi di halaman detail.
  const linkable =
    LINKABLE_ENTITIES.has(row.entity) && row.record_id !== null && action !== "DELETE";

  return { description, recordId: linkable ? row.record_id : null };
}

export function toActivityItem(row: ActivityRow): ActivityItem {
  const { description, recordId } = describeActivity(row);
  return {
    id: row.id,
    description,
    actorName: row.actor_name ?? "Sistem",
    timestamp: row.timestamp,
    recordId,
  };
}

const SQLITE_UTC = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/;

/**
 * datetime('now') SQLite menyimpan UTC TANPA penanda zona. new Date("2026-10-07 01:02:03")
 * akan membacanya sebagai waktu lokal dan meleset sebesar selisih zona (7 jam di WIB),
 * jadi dibaca manual sebagai UTC.
 */
export function parseSqliteUtc(timestamp: string): Date | null {
  const match = SQLITE_UTC.exec(timestamp);
  if (!match) return null;
  const [, year, month, day, hour, minute, second] = match.map(Number);
  if (
    year === undefined || month === undefined || day === undefined ||
    hour === undefined || minute === undefined || second === undefined
  ) {
    return null;
  }
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  if (Number.isNaN(date.getTime())) return null;

  // Date.UTC menormalkan nilai di luar rentang tanpa error (bulan 13 jadi Januari tahun depan,
  // jam 99 jadi hari berikutnya), sehingga string ngawur lolos jadi tanggal "valid". Cocokkan
  // ulang tiap komponen: kalau berubah, string aslinya tidak valid.
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day ||
    date.getUTCHours() !== hour ||
    date.getUTCMinutes() !== minute ||
    date.getUTCSeconds() !== second
  ) {
    return null;
  }
  return date;
}

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

/** Waktu relatif untuk daftar aktivitas; lebih dari seminggu ditulis sebagai tanggal lokal. */
export function formatActivityTime(timestamp: string, now: Date): string {
  const date = parseSqliteUtc(timestamp);
  if (!date) return "-";

  // Selisih negatif (jam komputer tidak sinkron / entri lebih baru dari halaman dibuka) = baru saja.
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "Baru saja";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} menit lalu`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} hari lalu`;

  return `${date.getDate()} ${MONTH_LABELS[date.getMonth()] ?? ""} ${date.getFullYear()}`;
}