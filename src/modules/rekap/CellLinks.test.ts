import { describe, it, expect } from "vitest";
import { rekapCellFilters, rekapCellHref, type RekapLinkContext } from "./cellLinks";
import { parseListFilters } from "../permit-records/listFilters";

const q1 = { from: "2026-01-01", to: "2026-03-31" };
const ctx = (over: Partial<RekapLinkContext> = {}): RekapLinkContext => ({
  grouping: "permitType",
  basis: "terbit",
  year: 2026,
  ...over,
});

describe("rekapCellHref", () => {
  it("sel periode: filter jenis izin + rentang periode pada dasar tanggal terbit", () => {
    expect(rekapCellHref(ctx(), { group: { id: 3 }, column: { type: "period", period: q1 } })).toBe(
      "/permit-records?jenis=3&terbitDari=2026-01-01&terbitSampai=2026-03-31"
    );
  });

  it("dasar tanggal berakhir memakai parameter berakhir", () => {
    expect(
      rekapCellHref(ctx({ grouping: "status", basis: "berakhir" }), {
        group: { id: 2 },
        column: { type: "period", period: q1 },
      })
    ).toBe("/permit-records?status=2&berakhirDari=2026-01-01&berakhirSampai=2026-03-31");
  });

  it("baris 'Tanpa status' (id kosong) menyaring izin tanpa status, bukan semua izin", () => {
    expect(
      rekapCellHref(ctx({ grouping: "status" }), { group: { id: null }, column: { type: "period", period: q1 } })
    ).toBe("/permit-records?status=none&terbitDari=2026-01-01&terbitSampai=2026-03-31");
  });

  it("mode total saja: hanya rentang tanggal", () => {
    expect(
      rekapCellHref(ctx({ grouping: "total" }), { group: { id: null }, column: { type: "period", period: q1 } })
    ).toBe("/permit-records?terbitDari=2026-01-01&terbitSampai=2026-03-31");
  });

  it("baris Jumlah (group 'all') tidak menyaring kelompok", () => {
    expect(rekapCellHref(ctx(), { group: "all", column: { type: "period", period: q1 } })).toBe(
      "/permit-records?terbitDari=2026-01-01&terbitSampai=2026-03-31"
    );
  });

  it("kolom Total memakai seluruh tahun", () => {
    expect(rekapCellHref(ctx({ grouping: "status" }), { group: { id: 2 }, column: { type: "year" } })).toBe(
      "/permit-records?status=2&terbitDari=2026-01-01&terbitSampai=2026-12-31"
    );
    expect(rekapCellHref(ctx(), { group: "all", column: { type: "year" } })).toBe(
      "/permit-records?terbitDari=2026-01-01&terbitSampai=2026-12-31"
    );
  });

  it("kolom Tanpa tanggal: filter tanpaTanggal sesuai dasar, tanpa rentang tanggal", () => {
    expect(rekapCellHref(ctx(), { group: { id: 3 }, column: { type: "noDate" } })).toBe(
      "/permit-records?jenis=3&tanpaTanggal=terbit"
    );
    expect(rekapCellHref(ctx({ basis: "berakhir" }), { group: "all", column: { type: "noDate" } })).toBe(
      "/permit-records?tanpaTanggal=berakhir"
    );
  });

  it("tautan bisa dibaca balik oleh halaman daftar izin (round trip)", () => {
    const target = { group: { id: 7 }, column: { type: "period" as const, period: q1 } };
    const url = rekapCellHref(ctx(), target);
    const parsed = parseListFilters(new URLSearchParams(url.split("?")[1] ?? ""));
    expect(parsed.permitTypeId).toBe(7);
    expect(parsed.terbitFrom).toBe("2026-01-01");
    expect(parsed.terbitTo).toBe("2026-03-31");
    expect(parsed.statusId).toBe("all");
    expect(parsed.noDate).toBe("");
  });
});

describe("rekapCellFilters", () => {
  it("mengembalikan filter mentah yang sama dengan yang dipakai untuk membuat URL", () => {
    expect(rekapCellFilters(ctx(), { group: { id: 3 }, column: { type: "noDate" } })).toEqual({
      permitTypeId: 3,
      noDate: "terbit",
    });
  });
});