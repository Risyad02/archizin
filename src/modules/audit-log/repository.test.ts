import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../database/db", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "../../database/db";
import { listRecentAuditLogs } from "./repository";

// Tes berbasis mock (bukan SQLite sungguhan; itu utang #20): memastikan bentuk query yang
// dikirim ke database tetap sesuai janji modul ini.
let captured: { sql: string; params: unknown[] } | null = null;
const rows = [{ id: 5, action: "LOGIN" }];

beforeEach(() => {
  captured = null;
  const select = vi.fn();
  select.mockImplementation(async (sql: string, params: unknown[]) => {
    captured = { sql: sql.replace(/\s+/g, " ").trim(), params };
    return rows;
  });
  vi.mocked(getDb).mockResolvedValue({ select } as never);
});

afterEach(() => {
  vi.resetAllMocks();
});

describe("listRecentAuditLogs", () => {
  it("batas 200 baris dikirim sebagai parameter ($1), bukan disusun ke teks SQL", async () => {
    await listRecentAuditLogs();
    expect(captured?.params).toEqual([200]);
    expect(captured?.sql).toContain("LIMIT $1");
  });

  it("urutan terbaru dulu, dengan id sebagai penentu bila waktunya sama", async () => {
    await listRecentAuditLogs();
    expect(captured?.sql).toContain("ORDER BY al.timestamp DESC, al.id DESC");
  });

  it("memakai LEFT JOIN ke users supaya log tetap tampil walau pengguna sudah tidak ada", async () => {
    await listRecentAuditLogs();
    expect(captured?.sql).toContain("LEFT JOIN users u ON u.id = al.user_id");
  });

  it("mengambil kolom yang dibutuhkan halaman Log Aktivitas dan mengembalikan hasilnya apa adanya", async () => {
    const result = await listRecentAuditLogs();
    for (const column of ["al.old_value", "al.new_value", "al.timestamp", "u.username", "u.full_name"]) {
      expect(captured?.sql).toContain(column);
    }
    expect(result).toEqual(rows);
  });
});