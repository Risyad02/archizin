import { describe, it, expect } from "vitest";
import {
  buildRekapTable,
  cellFilters,
  groupFilters,
  periodDateFilters,
  type RekapSourceRow,
} from "./crossTab";
import { periodsForYear } from "./periods";
import { buildListUrl } from "../permit-records/listFilters";

const row = (groupId: number | null, groupLabel: string, date: string | null, count: number): RekapSourceRow => ({
  groupId,
  groupLabel,
  date,
  count,
});

describe("buildRekapTable", () => {
  it("tanpa data: baris kosong, semua total nol, kolom sesuai periode", () => {
    const table = buildRekapTable([], 2026, "quarter");
    expect(table.rows).toEqual([]);
    expect(table.periods).toHaveLength(4);
    expect(table.columnTotals).toEqual([0, 0, 0, 0]);
    expect(table.grandTotal).toBe(0);
    expect(table.noDateTotal).toBe(0);
  });

  it("menjumlahkan per kelompok dan periode (triwulan), total baris dan kolom konsisten", () => {
    const table = buildRekapTable(
      [
        row(1, "IMB", "2026-01-15", 2),
        row(1, "IMB", "2026-02-10", 3),
        row(1, "IMB", "2026-04-01", 1),
        row(2, "SIUP", "2026-03-31", 4),
        row(2, "SIUP", "2026-12-31", 5),
      ],
      2026,
      "quarter"
    );
    expect(table.rows.map((r) => [r.label, r.cells, r.total])).toEqual([
      ["IMB", [5, 1, 0, 0], 6],
      ["SIUP", [4, 0, 0, 5], 9],
    ]);
    expect(table.columnTotals).toEqual([9, 1, 0, 5]);
    expect(table.grandTotal).toBe(15);
    const jumlahBaris = table.rows.reduce((s, r) => s + r.total, 0);
    expect(jumlahBaris).toBe(table.grandTotal);
  });

  it("tanggal null masuk 'tanpa tanggal' dan tidak ikut total periode", () => {
    const table = buildRekapTable(
      [row(1, "IMB", null, 7), row(1, "IMB", "2026-05-05", 2), row(2, "SIUP", null, 1)],
      2026,
      "month"
    );
    expect(table.rows[0]?.noDate).toBe(7);
    expect(table.rows[0]?.total).toBe(2);
    expect(table.noDateTotal).toBe(8);
    expect(table.grandTotal).toBe(2);
  });

  it("mengabaikan tahun lain, tanggal rusak, dan hitungan tidak valid", () => {
    const table = buildRekapTable(
      [
        row(1, "IMB", "2025-12-31", 10),
        row(1, "IMB", "2026-02-30", 10),
        row(1, "IMB", "kemarin", 10),
        row(1, "IMB", "2026-01-01", -3),
        row(1, "IMB", "2026-01-01", 1.5),
        row(1, "IMB", "2026-01-01", Number.NaN),
        row(1, "IMB", "2026-01-01", 2),
      ],
      2026,
      "month"
    );
    expect(table.grandTotal).toBe(2);
    expect(table.rows).toHaveLength(1);
    expect(table.rows[0]?.cells[0]).toBe(2);
  });

  it("mode total saja: satu baris tanpa groupId", () => {
    const table = buildRekapTable(
      [row(null, "Semua izin", "2026-01-01", 2), row(null, "Semua izin", "2026-07-01", 3)],
      2026,
      "semester"
    );
    expect(table.rows).toHaveLength(1);
    expect(table.rows[0]?.groupId).toBeNull();
    expect(table.rows[0]?.cells).toEqual([2, 3]);
  });

  it("urutan baris mengikuti kemunculan pertama dan grup berbeda dengan id sama label tidak tercampur", () => {
    const table = buildRekapTable(
      [row(5, "B", "2026-01-01", 1), row(2, "A", "2026-01-01", 1), row(5, "B", "2026-02-01", 1)],
      2026,
      "year"
    );
    expect(table.rows.map((r) => r.groupId)).toEqual([5, 2]);
    expect(table.rows[0]?.cells).toEqual([2]);
  });
});

describe("filter sel untuk tautan", () => {
  const q1 = { from: "2026-01-01", to: "2026-03-31" };

  it("periodDateFilters memilih pasangan field sesuai dasar tanggal", () => {
    expect(periodDateFilters("terbit", q1)).toEqual({ terbitFrom: "2026-01-01", terbitTo: "2026-03-31" });
    expect(periodDateFilters("berakhir", q1)).toEqual({ berakhirFrom: "2026-01-01", berakhirTo: "2026-03-31" });
  });

  it("groupFilters: jenis izin, status, total, dan grup null", () => {
    expect(groupFilters("permitType", 3)).toEqual({ permitTypeId: 3 });
    expect(groupFilters("status", 2)).toEqual({ statusId: 2 });
    expect(groupFilters("total", null)).toEqual({});
    expect(groupFilters("permitType", null)).toEqual({});
    expect(groupFilters("total", 9)).toEqual({});
  });

  it("cellFilters digabung ke URL daftar izin yang valid", () => {
    expect(buildListUrl(cellFilters("permitType", 3, "terbit", q1))).toBe(
      "/permit-records?jenis=3&terbitDari=2026-01-01&terbitSampai=2026-03-31"
    );
    expect(buildListUrl(cellFilters("status", 2, "berakhir", q1))).toBe(
      "/permit-records?status=2&berakhirDari=2026-01-01&berakhirSampai=2026-03-31"
    );
    const tahun = periodsForYear(2026, "year")[0];
    expect(tahun).toBeDefined();
    if (tahun) {
      expect(buildListUrl(cellFilters("total", null, "terbit", tahun))).toBe(
        "/permit-records?terbitDari=2026-01-01&terbitSampai=2026-12-31"
      );
    }
  });
});