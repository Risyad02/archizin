import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./repository", () => ({
  listDocumentLinks: vi.fn(),
  createDocumentLink: vi.fn(),
  deleteDocumentLink: vi.fn(),
  getDocumentLinkById: vi.fn(),
}));

vi.mock("../../../lib/filesystem", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../lib/filesystem")>();
  return {
    ...actual,
    copyFileWithDedup: vi.fn(),
    grantFileScope: vi.fn(),
    openInDefaultApp: vi.fn(),
  };
});

vi.mock("../../../lib/audit", () => ({
  logAudit: vi.fn(),
}));

import { addDocumentFromFile, removeDocumentLink, openDocumentFile } from "./service";
import { PermissionError } from "../../../lib/permissions";
import * as repo from "./repository";
import { copyFileWithDedup, grantFileScope, openInDefaultApp } from "../../../lib/filesystem";
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