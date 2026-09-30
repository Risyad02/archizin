// src/lib/filesystem.ts
import { mkdir, exists, copyFile, rename } from "@tauri-apps/plugin-fs";
import { invoke } from "@tauri-apps/api/core";

const ILLEGAL_WINDOWS_CHARS = /[\\/:*?"<>|]/g;
const TRAILING_DOTS_SPACES = /[. ]+$/;

/**
 * Membersihkan sebuah string agar aman dipakai sebagai nama folder/file di Windows.
 * - Mengganti karakter ilegal (\ / : * ? " < > |) dengan "_"
 * - Menghapus titik/spasi di akhir (Windows tidak mengizinkan ini)
 * - Fallback ke "tanpa_nama" kalau hasilnya kosong setelah dibersihkan
 */
export function sanitizeForFolderName(raw: string): string {
  const cleaned = raw
    .trim()
    .replace(ILLEGAL_WINDOWS_CHARS, "_")
    .replace(TRAILING_DOTS_SPACES, "");

  return cleaned.length > 0 ? cleaned : "tanpa_nama";
}

/**
 * Data sumber yang dipakai untuk mengisi placeholder pola folder.
 * Field baru bisa ditambah di sini kalau nanti pattern butuh placeholder lain.
 */
export interface FolderPatternData {
  kodeJenisIzin: string;
  tahun: string | number;
  nomorIzin: string;
  namaPemohon: string;
}

const PLACEHOLDER_MAP: Record<string, keyof FolderPatternData> = {
  kode_jenis_izin: "kodeJenisIzin",
  tahun: "tahun",
  nomor_izin: "nomorIzin",
  nama_pemohon: "namaPemohon",
};

/**
 * Mengubah pattern seperti "{kode_jenis_izin}/{tahun}/{nomor_izin}_{nama_pemohon}"
 * menjadi array segmen path yang SUDAH disanitasi, contoh:
 * ["SIUP", "2026", "001_2026_PT_Contoh_Sejahtera"]
 *
 * Setiap segmen (dipisah "/") disanitasi secara utuh SETELAH placeholder-nya
 * diganti, supaya pemisah "_" hasil gabungan tetap rapi dan karakter ilegal
 * dari data user (nomor_izin/nama_pemohon) tetap tersaring.
 */
export function resolveFolderPattern(
  pattern: string,
  data: FolderPatternData
): string[] {
  const segments = pattern.split("/").filter((segment) => segment.trim().length > 0);

  return segments.map((segment) => {
    const filled = segment.replace(/\{([a-z_]+)\}/g, (_match, key: string) => {
      const dataKey = PLACEHOLDER_MAP[key];
      if (!dataKey) {
        throw new Error(`Placeholder tidak dikenal di pola folder: {${key}}`);
      }
      return String(data[dataKey]);
    });

    return sanitizeForFolderName(filled);
  });
}

/** Gabungkan storageRoot + segments jadi satu path folder lengkap (pemisah "\" ala Windows). */
export function buildFolderPath(storageRoot: string, segments: string[]): string {
  return [storageRoot, ...segments].join("\\");
}

/** Pastikan folder ada; buat rekursif kalau belum ada. Aman dipanggil berulang. */
export async function ensureFolderExists(folderPath: string): Promise<void> {
  const already = await exists(folderPath);
  if (!already) {
    await mkdir(folderPath, { recursive: true });
  }
}

/**
 * Memisahkan nama file jadi { base, ext }, contoh "scan.pdf" -> { base: "scan", ext: ".pdf" }.
 * File tanpa ekstensi (atau nama diawali titik seperti ".gitignore") tetap aman.
 */
function splitFileName(fileName: string): { base: string; ext: string } {
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot <= 0) {
    return { base: fileName, ext: "" };
  }
  return { base: fileName.slice(0, lastDot), ext: fileName.slice(lastDot) };
}

/**
 * Copy file dari sourcePath ke folder targetFolder, mempertahankan nama file asli
 * KECUALI kalau sudah ada file dengan nama sama di folder tujuan — dalam hal itu,
 * otomatis di-rename "nama (2).ext", "nama (3).ext", dst. Tidak pernah overwrite.
 *
 * Mengembalikan nama file final (bukan path lengkap) yang sudah dipakai, untuk
 * disimpan sebagai bagian dari document_links.url.
 */
export async function copyFileWithDedup(
  sourcePath: string,
  targetFolder: string,
  originalFileName: string
): Promise<{ finalFileName: string; finalPath: string }> {
  await ensureFolderExists(targetFolder);

  const { base, ext } = splitFileName(originalFileName);
  let candidateName = originalFileName;
  let attempt = 1;

  while (await exists(buildFolderPath(targetFolder, [candidateName]))) {
    attempt += 1;
    candidateName = `${base} (${attempt})${ext}`;
  }

  const finalPath = buildFolderPath(targetFolder, [candidateName]);
  await copyFile(sourcePath, finalPath);

  return { finalFileName: candidateName, finalPath };
}

/**
 * Dipakai saat data izin (nomor_izin/nama_pemohon/tahun) diedit dan folder lama
 * jadi tidak sinkron dengan pola nama folder saat ini.
 *
 * Fungsi ini TIDAK melakukan rename otomatis — hanya membandingkan folder lama
 * vs folder baru yang seharusnya, dan mengembalikan info yang dibutuhkan UI untuk
 * menampilkan dialog konfirmasi ("Folder izin ini akan dipindah dari X ke Y, lanjutkan?").
 * Keputusan rename-atau-tidak ada di tangan user lewat dialog tsb (Checkpoint 3).
 */
export interface FolderSyncCheck {
  isSynced: boolean;
  oldFolderPath: string;
  newFolderPath: string;
}

export function checkFolderSync(
  storageRoot: string,
  oldSegments: string[],
  newSegments: string[]
): FolderSyncCheck {
  const oldFolderPath = buildFolderPath(storageRoot, oldSegments);
  const newFolderPath = buildFolderPath(storageRoot, newSegments);

  return {
    isSynced: oldFolderPath === newFolderPath,
    oldFolderPath,
    newFolderPath,
  };
}

/**
 * Eksekusi rename folder fisik SETELAH user mengonfirmasi lewat dialog di UI.
 * Melempar error kalau folder lama tidak ada (data tidak konsisten) atau folder
 * tujuan sudah ada isinya (mencegah menimpa folder lain secara diam-diam).
 */
export async function renameFolder(oldPath: string, newPath: string): Promise<void> {
  const oldExists = await exists(oldPath);
  if (!oldExists) {
    throw new Error(`Folder lama tidak ditemukan: ${oldPath}`);
  }

  const newExists = await exists(newPath);
  if (newExists) {
    throw new Error(`Folder tujuan sudah ada: ${newPath}. Rename dibatalkan untuk mencegah tumpang tindih data.`);
  }

  await ensureFolderExists(buildFolderPath(newPath, []).split("\\").slice(0, -1).join("\\") || newPath);
  await rename(oldPath, newPath);
}

export async function grantStorageScope(folderPath: string): Promise<void> {
  await invoke("grant_storage_scope", { folderPath });
}

export async function grantFileScope(filePath: string): Promise<void> {
  await invoke("grant_file_scope", { filePath });
}

export async function openInDefaultApp(path: string): Promise<void> {
  await invoke("open_in_default_app", { path });
}

function normalizeWindowsPath(path: string): string {
  const withBackslashes = path.replace(/\//g, "\\");
  const isUnc = /^\\\\/.test(withBackslashes);
  const driveMatch = withBackslashes.match(/^([a-zA-Z]:)\\?/);
  const prefix = driveMatch ? `${driveMatch[1]}\\` : isUnc ? "\\\\" : "\\";
  const rest = driveMatch
    ? withBackslashes.slice(driveMatch[0].length)
    : withBackslashes.replace(/^\\+/, "");

  const segments: string[] = [];
  for (const part of rest.split("\\")) {
    if (part === "" || part === ".") continue;
    if (part === "..") {
      if (segments.length > 0) segments.pop();
      continue;
    }
    segments.push(part);
  }
  return prefix + segments.join("\\");
}

export function assertPathWithinRoot(path: string, root: string): void {
  const normalizedPath = normalizeWindowsPath(path).toLowerCase();
  const normalizedRoot = normalizeWindowsPath(root).toLowerCase().replace(/\\+$/, "");

  const isRootItself = normalizedPath === normalizedRoot;
  const isInsideRoot = normalizedPath.startsWith(`${normalizedRoot}\\`);

  if (!isRootItself && !isInsideRoot) {
    throw new Error("Path berada di luar folder penyimpanan arsip, akses ditolak.");
  }
}

export async function pathExists(path: string): Promise<boolean> {
  return exists(path);
}