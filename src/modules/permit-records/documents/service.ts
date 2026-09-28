import * as repo from "./repository";
import { copyFileWithDedup, grantFileScope } from "../../../lib/filesystem";
import type { DocumentLink } from "./types";

export async function getDocumentsForRecord(recordId: number): Promise<DocumentLink[]> {
  return repo.listDocumentLinks(recordId);
}

/**
 * Menyalin file yang dipilih user ke folder izin (auto-rename kalau nama bentrok,
 * TIDAK PERNAH overwrite — lihat copyFileWithDedup), lalu mencatatnya sbg document_link.
 */
export async function addDocumentFromFile(
  recordId: number,
  folderPath: string,
  sourceFilePath: string
): Promise<void> {
  await grantFileScope(sourceFilePath);

  const originalFileName = sourceFilePath.split(/[\\/]/).pop() ?? "dokumen";
  const { finalPath } = await copyFileWithDedup(sourceFilePath, folderPath, originalFileName);

  await repo.createDocumentLink({
    permitRecordId: recordId,
    url: finalPath,
    linkType: "local",
    status: "valid",
  });
}

/**
 * Menghapus TAUTAN saja (baris document_links) — TIDAK menghapus file fisik di disk.
 * Keputusan sadar (lihat catatan di awal jawaban): file tetap ada di folder kalau
 * user perlu mengaksesnya manual, atau bisa ditambahkan lagi lewat "Tambah Dokumen".
 */
export async function removeDocumentLink(id: number): Promise<void> {
  await repo.deleteDocumentLink(id);
}