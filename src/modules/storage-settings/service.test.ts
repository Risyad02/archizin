import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./repository", () => ({
  getStorageSettings: vi.fn(),
  getDefaultFolderTemplate: vi.fn(),
  getFolderTemplateById: vi.fn(),
  upsertStorageSettings: vi.fn(),
}));

import { needsStorageSetup, setupStorage, getActiveFolderTemplate } from "./service";
import * as repo from "./repository";

const mockRepo = vi.mocked(repo);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("needsStorageSetup", () => {
  it("true kalau belum ada baris storage_settings", async () => {
    mockRepo.getStorageSettings.mockResolvedValue(null);
    expect(await needsStorageSetup()).toBe(true);
  });

  it("true kalau storageRoot kosong", async () => {
    mockRepo.getStorageSettings.mockResolvedValue({
      id: 1,
      storageRoot: "",
      backupRoot: null,
      activeFolderTemplateId: null,
    });
    expect(await needsStorageSetup()).toBe(true);
  });

  it("false kalau storageRoot sudah terisi", async () => {
    mockRepo.getStorageSettings.mockResolvedValue({
      id: 1,
      storageRoot: "C:\\Arsip",
      backupRoot: null,
      activeFolderTemplateId: 1,
    });
    expect(await needsStorageSetup()).toBe(false);
  });
});

describe("setupStorage", () => {
  it("menolak storageRoot kosong/spasi", async () => {
    await expect(setupStorage({ storageRoot: "   " })).rejects.toThrow("wajib diisi");
  });

  it("menolak kalau template default belum ada", async () => {
    mockRepo.getDefaultFolderTemplate.mockResolvedValue(null);
    await expect(setupStorage({ storageRoot: "C:\\Arsip" })).rejects.toThrow("Template folder default");
  });

  it("menyimpan storageRoot yang di-trim dan activeFolderTemplateId dari template default", async () => {
    mockRepo.getDefaultFolderTemplate.mockResolvedValue({
      id: 1,
      name: "Default",
      pattern: "x",
      isDefault: true,
      isActive: true,
    });
    mockRepo.upsertStorageSettings.mockResolvedValue({
      id: 1,
      storageRoot: "C:\\Arsip",
      backupRoot: null,
      activeFolderTemplateId: 1,
    });

    await setupStorage({ storageRoot: "  C:\\Arsip  " });

    expect(mockRepo.upsertStorageSettings).toHaveBeenCalledWith({
      storageRoot: "C:\\Arsip",
      backupRoot: null,
      activeFolderTemplateId: 1,
    });
  });
});

describe("getActiveFolderTemplate", () => {
  it("pakai template default kalau activeFolderTemplateId belum diset", async () => {
    mockRepo.getStorageSettings.mockResolvedValue({
      id: 1,
      storageRoot: "C:\\Arsip",
      backupRoot: null,
      activeFolderTemplateId: null,
    });
    mockRepo.getDefaultFolderTemplate.mockResolvedValue({
      id: 1,
      name: "Default",
      pattern: "x",
      isDefault: true,
      isActive: true,
    });

    const result = await getActiveFolderTemplate();
    expect(result?.id).toBe(1);
    expect(mockRepo.getFolderTemplateById).not.toHaveBeenCalled();
  });

  it("pakai getFolderTemplateById kalau activeFolderTemplateId sudah diset", async () => {
    mockRepo.getStorageSettings.mockResolvedValue({
      id: 1,
      storageRoot: "C:\\Arsip",
      backupRoot: null,
      activeFolderTemplateId: 2,
    });
    mockRepo.getFolderTemplateById.mockResolvedValue({
      id: 2,
      name: "Custom",
      pattern: "y",
      isDefault: false,
      isActive: true,
    });

    const result = await getActiveFolderTemplate();
    expect(result?.id).toBe(2);
    expect(mockRepo.getDefaultFolderTemplate).not.toHaveBeenCalled();
  });
});