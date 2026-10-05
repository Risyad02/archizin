import { describe, it, expect } from "vitest";
import { buildExpiryDateCountsQuery, buildExpiringRecordsQuery } from "./expiryQuery";

describe("buildExpiryDateCountsQuery", () => {
  it("mengecualikan kode status lewat parameter berurutan, bukan string yang ditempel", () => {
    const { sql, params } = buildExpiryDateCountsQuery(["dicabut", "tidak_aktif"]);

    expect(params).toEqual(["dicabut", "tidak_aktif"]);
    expect(sql).toContain("ps.code NOT IN ($1, $2)");
    expect(sql).not.toContain("dicabut"); // nilai tidak boleh ikut tertempel di SQL
    expect(sql).toContain("pr.deleted_at IS NULL");
  });

  it("izin tanpa status (status_id NULL) tetap dihitung", () => {
    const { sql } = buildExpiryDateCountsQuery(["dicabut"]);
    expect(sql).toContain("ps.code IS NULL OR ps.code NOT IN");
  });

  it("daftar kosong: tanpa klausa pengecualian dan tanpa parameter; duplikat dirapikan", () => {
    const empty = buildExpiryDateCountsQuery([]);
    expect(empty.params).toEqual([]);
    expect(empty.sql).not.toContain("NOT IN");

    const duplicated = buildExpiryDateCountsQuery(["dicabut", "dicabut"]);
    expect(duplicated.params).toEqual(["dicabut"]);
    expect(duplicated.sql).toContain("NOT IN ($1)");
  });
});

describe("buildExpiringRecordsQuery", () => {
  const EXCLUDED = ["dicabut", "tidak_aktif"];

  it("overdue: berakhir sebelum hari ini, terbaru lewat dulu, nomor placeholder berurutan", () => {
    const { sql, params } = buildExpiringRecordsQuery({
      kind: "overdue",
      today: "2026-10-02",
      excludedStatusCodes: EXCLUDED,
      limit: 8,
    });

    expect(params).toEqual(["2026-10-02", "dicabut", "tidak_aktif", 8]);
    expect(sql).toContain("pr.tanggal_berakhir < $1");
    expect(sql).toContain("NOT IN ($2, $3)");
    expect(sql).toContain("LIMIT $4");
    expect(sql).toContain("ORDER BY pr.tanggal_berakhir DESC");
    expect(sql).toContain("pr.deleted_at IS NULL");
    expect(sql).toContain("pr.tanggal_berakhir IS NOT NULL");
  });

  it("upcoming: rentang hari ini s/d batas atas inklusif, terdekat dulu", () => {
    const { sql, params } = buildExpiringRecordsQuery({
      kind: "upcoming",
      today: "2026-10-02",
      upTo: "2026-12-31",
      excludedStatusCodes: EXCLUDED,
      limit: 8,
    });

    expect(params).toEqual(["2026-10-02", "2026-12-31", "dicabut", "tidak_aktif", 8]);
    expect(sql).toContain("pr.tanggal_berakhir >= $1 AND pr.tanggal_berakhir <= $2");
    expect(sql).toContain("NOT IN ($3, $4)");
    expect(sql).toContain("LIMIT $5");
    expect(sql).toContain("ORDER BY pr.tanggal_berakhir ASC");
  });

  it("tanpa status dikecualikan: tanpa klausa NOT IN dan LIMIT bergeser; izin tanpa status tetap lolos", () => {
    const none = buildExpiringRecordsQuery({
      kind: "overdue",
      today: "2026-10-02",
      excludedStatusCodes: [],
      limit: 5,
    });
    expect(none.params).toEqual(["2026-10-02", 5]);
    expect(none.sql).not.toContain("NOT IN");
    expect(none.sql).toContain("LIMIT $2");

    const withStatus = buildExpiringRecordsQuery({
      kind: "overdue",
      today: "2026-10-02",
      excludedStatusCodes: ["dicabut"],
      limit: 5,
    });
    expect(withStatus.sql).toContain("ps.code IS NULL OR ps.code NOT IN");
  });

  it("upcoming tanpa upTo melempar error, bukan menghasilkan query yang salah", () => {
    expect(() =>
      buildExpiringRecordsQuery({
        kind: "upcoming",
        today: "2026-10-02",
        excludedStatusCodes: [],
        limit: 5,
      })
    ).toThrow("upTo wajib diisi");
  });
});