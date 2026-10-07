import type { ArchiveHealthCounts } from "./types";

export interface HealthItem {
  key: "documentsNotFound" | "withoutFolder" | "withoutDocuments" | "documentsUnchecked";
  label: string;
  value: number;
  /** Pembanding "dari N" (total izin atau total dokumen, sesuai item). */
  of: number;
  /** "problem" = perlu ditindak (merah); "info" = kelengkapan yang bisa menyusul. */
  severity: "problem" | "info";
  note?: string;
}

/**
 * Murni: mengubah hitungan mentah menjadi baris-baris panel Kesehatan Arsip.
 * Hanya item bernilai > 0 yang dikembalikan; hasil kosong berarti arsip lengkap.
 * Urutan: masalah dulu (file hilang, belum ada folder), lalu kelengkapan.
 */
export function buildArchiveHealthItems(counts: ArchiveHealthCounts): HealthItem[] {
  const items: HealthItem[] = [
    {
      key: "documentsNotFound",
      label: "Dokumen berstatus file tidak ditemukan",
      value: counts.documentsNotFound,
      of: counts.totalDocuments,
      severity: "problem",
      note: `${counts.recordsWithMissingDocuments} izin terdampak`,
    },
    {
      key: "withoutFolder",
      label: "Izin belum punya folder arsip",
      value: counts.withoutFolder,
      of: counts.totalRecords,
      severity: "problem",
    },
    {
      key: "withoutDocuments",
      label: "Izin belum punya dokumen",
      value: counts.withoutDocuments,
      of: counts.totalRecords,
      severity: "info",
    },
    {
      key: "documentsUnchecked",
      label: "Dokumen belum pernah dicek statusnya",
      value: counts.documentsUnchecked,
      of: counts.totalDocuments,
      severity: "info",
    },
  ];

  return items.filter((item) => item.value > 0);
}