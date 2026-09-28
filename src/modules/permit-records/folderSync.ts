import { getStorageSettings, getActiveFolderTemplate } from "../storage-settings/service";
import {
  resolveFolderPattern,
  buildFolderPath,
  ensureFolderExists,
  renameFolder,
  type FolderPatternData,
} from "../../lib/filesystem";

export interface PermitFolderIdentity {
  permitTypeCode: string;
  nomorIzin: string;
  namaPemohon: string;
  tanggalTerbit: string | null;
}

/** Tahun berjalan dipakai sbg fallback kalau tanggalTerbit kosong (keputusan yang sudah dikonfirmasi). */
function resolveTahun(tanggalTerbit: string | null): number {
  if (tanggalTerbit) {
    const year = Number(tanggalTerbit.slice(0, 4));
    if (!Number.isNaN(year)) return year;
  }
  return new Date().getFullYear();
}

async function resolveTargetPath(
  identity: PermitFolderIdentity
): Promise<string | null> {
  const settings = await getStorageSettings();
  if (!settings?.storageRoot) return null;

  const template = await getActiveFolderTemplate();
  if (!template) return null;

  const data: FolderPatternData = {
    kodeJenisIzin: identity.permitTypeCode,
    tahun: resolveTahun(identity.tanggalTerbit),
    nomorIzin: identity.nomorIzin,
    namaPemohon: identity.namaPemohon,
  };

  const segments = resolveFolderPattern(template.pattern, data);
  return buildFolderPath(settings.storageRoot, segments);
}

/**
 * Dipanggil setelah createPermitRecordCore sukses. Membuat folder fisik.
 * Mengembalikan null (BUKAN melempar error) kalau storage/template belum siap
 * atau operasi filesystem gagal — supaya pembuatan data izin tidak pernah gagal
 * gara-gara masalah folder (lihat catatan di awal jawaban ini).
 */
export async function ensurePermitFolder(
  identity: PermitFolderIdentity
): Promise<string | null> {
  try {
    const folderPath = await resolveTargetPath(identity);
    if (!folderPath) return null;

    await ensureFolderExists(folderPath);
    return folderPath;
  } catch (err) {
    console.error("Gagal membuat folder izin:", err);
    return null;
  }
}

export interface FolderRenamePlan {
  oldFolderPath: string;
  newFolderPath: string;
}

/**
 * Membandingkan folder LAMA (currentFolderPath, dari kolom lokasi_folder) vs folder
 * yang SEHARUSNYA berdasarkan data baru. TIDAK melakukan rename — hanya menyiapkan
 * data untuk dialog konfirmasi di UI. Return null kalau sudah sinkron ATAU kalau
 * belum pernah ada folder lama (lihat catatan keterbatasan di awal jawaban).
 */
export async function checkFolderRenameNeeded(
  currentFolderPath: string | null,
  newIdentity: PermitFolderIdentity
): Promise<FolderRenamePlan | null> {
  if (!currentFolderPath) return null;

  const newFolderPath = await resolveTargetPath(newIdentity);
  if (!newFolderPath || newFolderPath === currentFolderPath) return null;

  return { oldFolderPath: currentFolderPath, newFolderPath };
}

/** Eksekusi rename fisik SETELAH user konfirmasi lewat dialog UI. */
export async function applyFolderRename(plan: FolderRenamePlan): Promise<void> {
  await renameFolder(plan.oldFolderPath, plan.newFolderPath);
}