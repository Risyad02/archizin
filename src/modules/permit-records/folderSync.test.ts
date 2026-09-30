import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../storage-settings/service", () => ({
  getStorageSettings: vi.fn(),
  getActiveFolderTemplate: vi.fn(),
}));

vi.mock("../../lib/filesystem", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/filesystem")>();
  return {
    ...actual,
    ensureFolderExists: vi.fn(),
    renameFolder: vi.fn(),
  };
});

import {
  ensurePermitFolder,
  checkFolderRenameNeeded,
  applyFolderRename,
  type PermitFolderIdentity,
  createFolderNow,
} from "./folderSync";
import { getStorageSettings, getActiveFolderTemplate } from "../storage-settings/service";
import { ensureFolderExists, renameFolder } from "../../lib/filesystem";

const mockGetStorageSettings = vi.mocked(getStorageSettings);
const mockGetActiveFolderTemplate = vi.mocked(getActiveFolderTemplate);
const mockEnsureFolderExists = vi.mocked(ensureFolderExists);
const mockRenameFolder = vi.mocked(renameFolder);

const settings = { id: 1, storageRoot: "C:\\Arsip", backupRoot: null, activeFolderTemplateId: 1 };
const template = {
  id: 1,
  name: "Default",
  pattern: "{kode_jenis_izin}/{tahun}/{nomor_izin}_{nama_pemohon}",
  isDefault: true,
  isActive: true,
};
const identity: PermitFolderIdentity = {
  permitTypeCode: "PBG",
  nomorIzin: "001/2026",
  namaPemohon: "Budi Santoso",
  tanggalTerbit: "2026-03-10",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ensurePermitFolder", () => {
  it("membuat folder dan mengembalikan path saat storage & template tersedia", async () => {
    mockGetStorageSettings.mockResolvedValue(settings);
    mockGetActiveFolderTemplate.mockResolvedValue(template);
    mockEnsureFolderExists.mockResolvedValue(undefined);

    const result = await ensurePermitFolder(identity);

    expect(result).toBe("C:\\Arsip\\PBG\\2026\\001_2026_Budi Santoso");
    expect(mockEnsureFolderExists).toHaveBeenCalledWith("C:\\Arsip\\PBG\\2026\\001_2026_Budi Santoso");
  });

  it("return null tanpa throw kalau storage_root belum diset", async () => {
    mockGetStorageSettings.mockResolvedValue(null);
    mockGetActiveFolderTemplate.mockResolvedValue(template);

    expect(await ensurePermitFolder(identity)).toBeNull();
    expect(mockEnsureFolderExists).not.toHaveBeenCalled();
  });

  it("return null tanpa throw kalau template belum tersedia", async () => {
    mockGetStorageSettings.mockResolvedValue(settings);
    mockGetActiveFolderTemplate.mockResolvedValue(null);

    expect(await ensurePermitFolder(identity)).toBeNull();
  });

  it("return null (bukan throw) dan log error kalau pembuatan folder fisik gagal — desain non-blocking", async () => {
    mockGetStorageSettings.mockResolvedValue(settings);
    mockGetActiveFolderTemplate.mockResolvedValue(template);
    mockEnsureFolderExists.mockRejectedValue(new Error("disk penuh"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await ensurePermitFolder(identity);

    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("pakai tahun dari tanggalTerbit kalau ada", async () => {
    mockGetStorageSettings.mockResolvedValue(settings);
    mockGetActiveFolderTemplate.mockResolvedValue(template);
    mockEnsureFolderExists.mockResolvedValue(undefined);

    const result = await ensurePermitFolder({ ...identity, tanggalTerbit: "2024-01-01" });
    expect(result).toContain("\\2024\\");
  });

  it("pakai tahun berjalan sebagai fallback kalau tanggalTerbit kosong", async () => {
    mockGetStorageSettings.mockResolvedValue(settings);
    mockGetActiveFolderTemplate.mockResolvedValue(template);
    mockEnsureFolderExists.mockResolvedValue(undefined);

    const result = await ensurePermitFolder({ ...identity, tanggalTerbit: null });
    expect(result).toContain(`\\${new Date().getFullYear()}\\`);
  });
});

describe("checkFolderRenameNeeded", () => {
  it("return null kalau belum ada folder lama", async () => {
    const result = await checkFolderRenameNeeded(null, identity);
    expect(result).toBeNull();
    expect(mockGetStorageSettings).not.toHaveBeenCalled();
  });

  it("return null kalau path baru sama dengan path lama", async () => {
    mockGetStorageSettings.mockResolvedValue(settings);
    mockGetActiveFolderTemplate.mockResolvedValue(template);
    const current = "C:\\Arsip\\PBG\\2026\\001_2026_Budi Santoso";

    expect(await checkFolderRenameNeeded(current, identity)).toBeNull();
  });

  it("mengembalikan plan rename kalau nama pemohon berubah", async () => {
    mockGetStorageSettings.mockResolvedValue(settings);
    mockGetActiveFolderTemplate.mockResolvedValue(template);
    const current = "C:\\Arsip\\PBG\\2026\\001_2026_Nama Lama";

    const result = await checkFolderRenameNeeded(current, identity);
    expect(result).toEqual({
      oldFolderPath: current,
      newFolderPath: "C:\\Arsip\\PBG\\2026\\001_2026_Budi Santoso",
    });
  });
});

describe("applyFolderRename", () => {
  it("memanggil renameFolder dengan path lama dan baru dari plan", async () => {
    mockRenameFolder.mockResolvedValue(undefined);
    await applyFolderRename({ oldFolderPath: "C:\\A", newFolderPath: "C:\\B" });
    expect(mockRenameFolder).toHaveBeenCalledWith("C:\\A", "C:\\B");
  });
});

describe("createFolderNow", () => {
  it("melempar pesan spesifik kalau storage_root belum diset (beda dari ensurePermitFolder yang diam)", async () => {
    mockGetStorageSettings.mockResolvedValue(null);
    await expect(createFolderNow(identity)).rejects.toThrow("Lokasi penyimpanan arsip belum diset");
  });

  it("melempar pesan spesifik kalau template belum tersedia", async () => {
    mockGetStorageSettings.mockResolvedValue(settings);
    mockGetActiveFolderTemplate.mockResolvedValue(null);
    await expect(createFolderNow(identity)).rejects.toThrow("Template folder belum tersedia");
  });

  it("membuat folder dan mengembalikan path saat semua siap", async () => {
    mockGetStorageSettings.mockResolvedValue(settings);
    mockGetActiveFolderTemplate.mockResolvedValue(template);
    mockEnsureFolderExists.mockResolvedValue(undefined);

    const result = await createFolderNow(identity);
    expect(result).toBe("C:\\Arsip\\PBG\\2026\\001_2026_Budi Santoso");
  });

  it("membiarkan error fs asli menyebar (tidak ditangkap seperti ensurePermitFolder)", async () => {
    mockGetStorageSettings.mockResolvedValue(settings);
    mockGetActiveFolderTemplate.mockResolvedValue(template);
    mockEnsureFolderExists.mockRejectedValue(new Error("disk penuh"));

    await expect(createFolderNow(identity)).rejects.toThrow("disk penuh");
  });
});