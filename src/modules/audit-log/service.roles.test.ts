import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("./repository", () => ({
  listRecentAuditLogs: vi.fn(),
}));

import * as repo from "./repository";
import { getRecentAuditLogs } from "./service";
import type { AuthUser } from "../auth/types";
import type { AuditLogEntry } from "./types";

// Hanya `role` yang dibaca service; sisa isi pengguna tidak penting untuk tes ini.
function actorWithRole(role: string): AuthUser {
  return { id: 1, username: "uji", full_name: "Pengguna Uji", role } as unknown as AuthUser;
}

const entries = [
  { id: 2, action: "UPDATE", entity: "permit_records" },
  { id: 1, action: "CREATE", entity: "permit_types" },
] as unknown as AuditLogEntry[];

beforeEach(() => {
  vi.mocked(repo.listRecentAuditLogs).mockResolvedValue(entries);
});

afterEach(() => {
  vi.resetAllMocks();
});

describe("getRecentAuditLogs: penjagaan role (audit:view)", () => {
  for (const role of ["ADMIN", "OPERATOR"]) {
    it(`${role} boleh melihat log dan menerima hasil repository apa adanya`, async () => {
      const result = await getRecentAuditLogs(actorWithRole(role));
      expect(repo.listRecentAuditLogs).toHaveBeenCalledTimes(1);
      expect(result).toEqual(entries);
    });
  }

  it("VIEWER ditolak dan repository tidak pernah dipanggil", async () => {
    await expect(getRecentAuditLogs(actorWithRole("VIEWER"))).rejects.toThrow();
    expect(repo.listRecentAuditLogs).not.toHaveBeenCalled();
  });

  it("role yang tidak dikenal atau kosong ditolak sebelum menyentuh database", async () => {
    await expect(getRecentAuditLogs(actorWithRole("TAMU"))).rejects.toThrow();
    await expect(getRecentAuditLogs(actorWithRole(""))).rejects.toThrow();
    expect(repo.listRecentAuditLogs).not.toHaveBeenCalled();
  });

  it("kegagalan repository diteruskan apa adanya", async () => {
    vi.mocked(repo.listRecentAuditLogs).mockRejectedValue(new Error("db error"));
    await expect(getRecentAuditLogs(actorWithRole("ADMIN"))).rejects.toThrow("db error");
  });
});