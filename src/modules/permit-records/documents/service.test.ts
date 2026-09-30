import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./repository", () => ({
  listDocumentLinks: vi.fn(),
  createDocumentLink: vi.fn(),
  deleteDocumentLink: vi.fn(),
  getDocumentLinkById: vi.fn(),
  updateDocumentLinkStatus: vi.fn(),
}));

vi.mock("../../../lib/filesystem", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../lib/filesystem")>();
  return {
    ...actual,
    copyFileWithDedup: vi.fn(),
    grantFileScope: vi.fn(),
    openInDefaultApp: vi.fn(),
    pathExists: vi.fn(),
  };
});

vi.mock("../../../lib/audit", () => ({
  logAudit: vi.fn(),
}));

import { addDocumentFromFile, removeDocumentLink, openDocumentFile, validateDocumentStatus } from "./service";
import { PermissionError } from "../../../lib/permissions";
import * as repo from "./repository";
import { copyFileWithDedup, grantFileScope, openInDefaultApp, pathExists } from "../../../lib/filesystem";
import { logAudit } from "../../../lib/audit";
import type { AuthUser } from "../../auth/types";
import type { DocumentLink } from "./types";

const mockRepo = vi.mocked(repo);
const mockCopyFileWithDedup = vi.mocked(copyFileWithDedup);
const mockGrantFileScope = vi.mocked(grantFileScope);
const mockOpenInDefaultApp = vi.mocked(openInDefaultApp);
const mockLogAudit = vi.mocked(logAudit);

const viewer: AuthUser = { id: 1, username: "v", full_name: "Viewer", role: "VIEWER" };
const operator: AuthUser = { id: 2, username: "o", full_name: "Operator", role: "OPERATOR" };

const sampleDoc: DocumentLink = {
  id: 42,
  permit_record_id: 1,
  url: "C:\\Arsip\\PBG\\2026\\001\\scan.pdf",
  link_type: "local",
  last_checked_at: null,
  status: "valid",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("documents — permission", () => {
  it("addDocumentFromFile menolak VIEWER", async () => {
    await expect(
      addDocumentFromFile(1, "C:\\folder", "C:\\sumber.pdf", viewer)
    ).rejects.toBeInstanceOf(PermissionError);
  });

  it("removeDocumentLink menolak VIEWER", async () => {
    await expect(removeDocumentLink(1, viewer)).rejects.toBeInstanceOf(PermissionError);
  });
});

describe("addDocumentFromFile", () => {
  it("operator: menyalin file, mencatat document_link, dan audit log", async () => {
    mockGrantFileScope.mockResolvedValue(undefined);
    mockCopyFileWithDedup.mockResolvedValue({
      finalFileName: "scan.pdf",
      finalPath: sampleDoc.url,
    });
    mockRepo.createDocumentLink.mockResolvedValue(undefined);
    mockRepo.listDocumentLinks.mockResolvedValue([sampleDoc]);

    await addDocumentFromFile(1, "C:\\Arsip\\PBG\\2026\\001", "C:\\Unggah\\scan.pdf", operator);

    expect(mockGrantFileScope).toHaveBeenCalledWith("C:\\Unggah\\scan.pdf");
    expect(mockCopyFileWithDedup).toHaveBeenCalledWith(
      "C:\\Unggah\\scan.pdf",
      "C:\\Arsip\\PBG\\2026\\001",
      "scan.pdf"
    );
    expect(mockRepo.createDocumentLink).toHaveBeenCalledWith({
      permitRecordId: 1,
      url: sampleDoc.url,
      linkType: "local",
      status: "valid",
    });
    expect(mockLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: operator.id,
        action: "CREATE",
        entity: "document_links",
        recordId: 42,
      })
    );
  });
});

describe("removeDocumentLink", () => {
  it("operator: menghapus tautan dan mencatat old_value di audit log", async () => {
    mockRepo.getDocumentLinkById.mockResolvedValue(sampleDoc);
    mockRepo.deleteDocumentLink.mockResolvedValue(undefined);

    await removeDocumentLink(42, operator);

    expect(mockRepo.deleteDocumentLink).toHaveBeenCalledWith(42);
    expect(mockLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "DELETE",
        entity: "document_links",
        recordId: 42,
        oldValue: sampleDoc,
      })
    );
  });
});

describe("openDocumentFile", () => {
  it("VIEWER boleh membuka dokumen (document:open diizinkan semua role)", async () => {
    mockOpenInDefaultApp.mockResolvedValue(undefined);

    await expect(openDocumentFile(sampleDoc, "C:\\Arsip", viewer)).resolves.toBeUndefined();
    expect(mockOpenInDefaultApp).toHaveBeenCalledWith(sampleDoc.url);
  });

  it("menolak dokumen bertipe selain local", async () => {
    const gdriveDoc: DocumentLink = { ...sampleDoc, link_type: "gdrive" };
    await expect(openDocumentFile(gdriveDoc, "C:\\Arsip", viewer)).rejects.toThrow("belum didukung");
    expect(mockOpenInDefaultApp).not.toHaveBeenCalled();
  });

  it("menolak path di luar storage root", async () => {
    const outsideDoc: DocumentLink = { ...sampleDoc, url: "C:\\Windows\\System32\\cmd.exe" };
    await expect(openDocumentFile(outsideDoc, "C:\\Arsip", viewer)).rejects.toThrow("di luar folder");
    expect(mockOpenInDefaultApp).not.toHaveBeenCalled();
  });
});

describe("validateDocumentStatus", () => {
  it("menandai valid kalau file masih ada", async () => {
    // pathExists tidak di-mock terpisah di sini — sudah termasuk dalam mock lib/filesystem
    // yang sama, jadi pastikan pathExists: vi.fn() ditambahkan ke blok vi.mock("../../../lib/filesystem", ...)
    vi.mocked(pathExists).mockResolvedValue(true);
    const status = await validateDocumentStatus(sampleDoc, operator);
    expect(status).toBe("valid");
    expect(mockRepo.updateDocumentLinkStatus).toHaveBeenCalledWith(sampleDoc.id, "valid");
  });

  it("menandai not_found kalau file sudah tidak ada", async () => {
    vi.mocked(pathExists).mockResolvedValue(false);
    const status = await validateDocumentStatus(sampleDoc, operator);
    expect(status).toBe("not_found");
  });

  it("tidak melakukan apa pun untuk link_type selain local", async () => {
    const gdriveDoc: DocumentLink = { ...sampleDoc, link_type: "gdrive" };
    const status = await validateDocumentStatus(gdriveDoc, operator);
    expect(status).toBe(gdriveDoc.status);
    expect(mockRepo.updateDocumentLinkStatus).not.toHaveBeenCalled();
  });

  it("menolak VIEWER", async () => {
    await expect(validateDocumentStatus(sampleDoc, viewer)).rejects.toBeInstanceOf(PermissionError);
  });
});