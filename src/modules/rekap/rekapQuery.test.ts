import { describe, it, expect } from "vitest";
import { buildRekapQuery, toRekapSourceRows } from "./rekapQuery";
import type { RekapDbRow } from "./types";

describe("buildRekapQuery", () => {
  it("tahun masuk sebagai parameter, tidak disusun ke teks SQL", () => {
    const { sql, params } = buildRekapQuery({ year: 2026, basis: "terbit", grouping: "total" });
    expect(params).toEqual(["2026-01-01", "2026-12-31"]);
    expect(sql).toContain(">= $1");
    expect(sql).toContain("<= $2");
    expect(sql.includes("2026")).toBe(false);
  });

  it("selalu mengecualikan izin yang dihapus dan mengizinkan tanggal kosong (NULL atau '')", () => {
    const { sql } = buildRekapQuery({ year: 2026, basis: "terbit", grouping: "total" });
    expect(sql).toContain("pr.deleted_at IS NULL");
    expect(sql).toContain("NULLIF(pr.tanggal_terbit, '') IS NULL OR");
  });

  it("dasar tanggal memilih kolom yang tepat", () => {
    const terbit = buildRekapQuery({ year: 2026, basis: "terbit", grouping: "total" }).sql;
    const berakhir = buildRekapQuery({ year: 2026, basis: "berakhir", grouping: "total" }).sql;
    expect(terbit).toContain("pr.tanggal_terbit");
    expect(terbit.includes("pr.tanggal_berakhir")).toBe(false);
    expect(berakhir).toContain("pr.tanggal_berakhir");
    expect(berakhir.includes("pr.tanggal_terbit")).toBe(false);
  });

  it("per jenis izin: JOIN permit_types dan urut nama", () => {
    const { sql } = buildRekapQuery({ year: 2026, basis: "terbit", grouping: "permitType" });
    expect(sql).toContain("JOIN permit_types pt ON pt.id = pr.permit_type_id");
    expect(sql.includes("LEFT JOIN permit_types")).toBe(false);
    expect(sql).toContain("GROUP BY pt.id, pt.name,");
    expect(sql).toContain("ORDER BY pt.name, pt.id,");
  });

  it("per status: LEFT JOIN supaya izin tanpa status tetap terhitung", () => {
    const { sql } = buildRekapQuery({ year: 2026, basis: "terbit", grouping: "status" });
    expect(sql).toContain("LEFT JOIN permit_status ps ON ps.id = pr.status_id");
    expect(sql).toContain("COALESCE(ps.label, 'Tanpa status')");
    expect(sql).toContain("ORDER BY (ps.id IS NULL), ps.sort_order, ps.id,");
  });

  it("total saja: tanpa JOIN dan hanya dikelompokkan per tanggal", () => {
    const { sql } = buildRekapQuery({ year: 2026, basis: "terbit", grouping: "total" });
    expect(sql.includes("JOIN")).toBe(false);
    expect(sql).toContain("GROUP BY NULLIF(pr.tanggal_terbit, '')");
  });

  it("tidak ada pengecualian status masa berlaku", () => {
    const { sql } = buildRekapQuery({ year: 2026, basis: "terbit", grouping: "status" });
    expect(sql.includes("NOT IN")).toBe(false);
  });

  it("menolak tahun tidak valid dan pilihan liar saat runtime", () => {
    expect(() => buildRekapQuery({ year: Number.NaN, basis: "terbit", grouping: "total" })).toThrow();
    expect(() => buildRekapQuery({ year: 20260, basis: "terbit", grouping: "total" })).toThrow();
    const liar = { year: 2026, basis: "x; DROP TABLE permit_records", grouping: "total" } as never;
    expect(() => buildRekapQuery(liar)).toThrow();
    const liar2 = { year: 2026, basis: "terbit", grouping: "oops" } as never;
    expect(() => buildRekapQuery(liar2)).toThrow();
  });
});

describe("toRekapSourceRows", () => {
  it("memetakan kolom, mengubah teks kosong jadi tanpa tanggal, dan memaksa jumlah jadi angka", () => {
    const rows = [
      { group_id: 1, group_label: "IMB", tanggal: "2026-01-05", total: 2 },
      { group_id: 1, group_label: "IMB", tanggal: "", total: 1 },
      { group_id: null, group_label: "Tanpa status", tanggal: null, total: "4" },
    ] as unknown as RekapDbRow[];
    expect(toRekapSourceRows(rows)).toEqual([
      { groupId: 1, groupLabel: "IMB", date: "2026-01-05", count: 2 },
      { groupId: 1, groupLabel: "IMB", date: null, count: 1 },
      { groupId: null, groupLabel: "Tanpa status", date: null, count: 4 },
    ]);
  });

  it("label kosong atau null diberi nama cadangan", () => {
    const rows: RekapDbRow[] = [
      { group_id: 2, group_label: null, tanggal: null, total: 1 },
      { group_id: 3, group_label: "   ", tanggal: null, total: 1 },
    ];
    expect(toRekapSourceRows(rows).map((r) => r.groupLabel)).toEqual(["(tanpa nama)", "(tanpa nama)"]);
  });
});