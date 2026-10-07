import type { ExpiryBucket, MonthlyPoint } from "./stats";

/** Baris mentah dari query ringkasan total. */
export interface TotalsRow {
  total: number;
  /** Izin yang tahun/bulannya NULL — tidak ikut grafik tren (tren dibangun dari tanggal terbit). */
  without_issue_date: number;
}

export interface StatusCount {
  status_id: number;
  code: string;
  label: string;
  color: string | null;
  total: number;
}

export interface PermitTypeCount {
  permit_type_id: number;
  code: string;
  name: string;
  total: number;
}

export interface ExpiryDateCount {
  tanggal_berakhir: string | null;
  total: number;
}

/** Izin yang tampil di daftar "perlu perhatian" (kedaluwarsa / segera berakhir). */
export interface ExpiringRecord {
  id: number;
  nomor_izin: string | null;
  nama_pemohon: string | null;
  nama_usaha: string | null;
  permit_type_name: string;
  tanggal_berakhir: string | null;
  status_code: string | null;
  status_label: string | null;
  status_color: string | null;
}

export interface AttentionRecord extends ExpiringRecord {
  /** Hasil daysUntil(tanggal_berakhir): negatif = sudah lewat. */
  days: number | null;
}

/** Hitungan untuk panel "Kesehatan Arsip". Berlaku untuk semua izin yang belum dihapus, apa pun statusnya. */
export interface ArchiveHealthCounts {
  totalRecords: number;
  /** Izin tanpa satu pun tautan dokumen. */
  withoutDocuments: number;
  /** Izin yang lokasi_folder-nya kosong. */
  withoutFolder: number;
  totalDocuments: number;
  /** Dokumen berstatus not_found ("File tidak ditemukan"). */
  documentsNotFound: number;
  /** Jumlah izin yang punya setidaknya satu dokumen not_found. */
  recordsWithMissingDocuments: number;
  /** Dokumen berstatus unchecked (belum pernah dicek). */
  documentsUnchecked: number;
}

/** Baris mentah aktivitas terbaru dari audit_logs (tanpa old_value/new_value). */
export interface ActivityRow {
  id: number;
  action: string;
  entity: string;
  record_id: number | null;
  /** Format SQLite datetime('now'): "YYYY-MM-DD HH:MM:SS" dalam UTC, tanpa penanda zona. */
  timestamp: string;
  actor_name: string | null;
}

export interface ActivityItem {
  id: number;
  description: string;
  actorName: string;
  timestamp: string;
  /** Diisi hanya kalau ada halaman detail yang bisa dibuka (izin yang belum dihapus). */
  recordId: number | null;
}

export interface DashboardSummary {
  total: number;
  withoutIssueDate: number;
  /** Izin yang status_id-nya NULL (mis. hasil import). Normalnya 0. */
  withoutStatus: number;
  /** Izin berstatus yang dikecualikan dari pemantauan masa berlaku (Dicabut/Tidak Aktif). */
  expiryExcluded: number;
  byStatus: StatusCount[];
  byPermitType: PermitTypeCount[];
  expiry: ExpiryBucket[];
  monthly: MonthlyPoint[];
  archiveHealth: ArchiveHealthCounts;
  /** Daftar terbatas (lihat ATTENTION_LIMIT di service); jumlah lengkapnya ada di bucket expiry. */
  attention: {
    overdue: AttentionRecord[];
    upcoming: AttentionRecord[];
  };
}