import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("./repository", () => ({
  listRekapRows: vi.fn(),
}));

import * as repo from "./repository";
import { getRekap } from "./service";

beforeEach(() => {
  vi.mocked(repo.listRekapRows).mockResolvedValue([]);
});

afterEach(() => {
  vi.resetAllMocks();
});

describe("getRekap", () => {
  it("meneruskan tahun, dasar tanggal, dan pengelompokan ke repository (periode tidak ikut)", async () => {
    await getRekap({ year: 2026, kind: "quarter", basis: "berakhir", grouping: "status" });
    expect(repo.listRekapRows).toHaveBeenCalledTimes(1);
    expect(repo.listRekapRows).toHaveBeenCalledWith({
      year: 2026,
      basis: "berakhir",
      grouping: "status",
    });
  });

  it("menyusun tabel dari baris repository, termasuk tanggal kosong dan jumlah berupa teks", async () => {
    vi.mocked(repo.listRekapRows).mockResolvedValue([
      { group_id: 1, group_label: "IMB", tanggal: "2026-01-15", total: 2 },
      { group_id: 1, group_label: "IMB", tanggal: "2026-05-02", total: "3" as unknown as number },
      { group_id: 1, group_label: "IMB", tanggal: "", total: 1 },
    ]);
    const table = await getRekap({ year: 2026, kind: "semester", basis: "terbit", grouping: "permitType" });
    expect(table.periods).toHaveLength(2);
    expect(table.rows[0]?.cells).toEqual([5, 0]);
    expect(table.rows[0]?.noDate).toBe(1);
    expect(table.grandTotal).toBe(5);
    expect(table.noDateTotal).toBe(1);
  });

  it("tahun tidak valid ditolak sebelum menyentuh database", async () => {
    await expect(
      getRekap({ year: Number.NaN, kind: "month", basis: "terbit", grouping: "total" })
    ).rejects.toThrow("Tahun rekap tidak valid.");
    expect(repo.listRekapRows).not.toHaveBeenCalled();
  });

  it("kegagalan repository diteruskan apa adanya", async () => {
    vi.mocked(repo.listRekapRows).mockRejectedValue(new Error("db error"));
    await expect(
      getRekap({ year: 2026, kind: "year", basis: "terbit", grouping: "total" })
    ).rejects.toThrow("db error");
  });
});