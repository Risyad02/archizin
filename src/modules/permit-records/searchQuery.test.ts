import { describe, it, expect } from "vitest";
import {
  clampPageSize,
  clampPage,
  buildPermitRecordWhere,
  buildOrderBy,
  PAGE_SIZE_DEFAULT,
  PAGE_SIZE_MIN,
  PAGE_SIZE_MAX,
  getDefaultSortDirection,
} from "./searchQuery";

describe("clampPageSize", () => {
  it("default kalau tidak diisi", () => {
    expect(clampPageSize(undefined)).toBe(PAGE_SIZE_DEFAULT);
  });
  it("menjepit ke minimum kalau terlalu kecil", () => {
    expect(clampPageSize(1)).toBe(PAGE_SIZE_MIN);
  });
  it("menjepit ke maksimum kalau terlalu besar", () => {
    expect(clampPageSize(9999)).toBe(PAGE_SIZE_MAX);
  });
  it("menerima nilai di tengah rentang apa adanya", () => {
    expect(clampPageSize(50)).toBe(50);
  });
});

describe("clampPage", () => {
  it("default ke 1 kalau tidak diisi, nol, negatif, atau NaN", () => {
    expect(clampPage(undefined)).toBe(1);
    expect(clampPage(0)).toBe(1);
    expect(clampPage(-5)).toBe(1);
    expect(clampPage(Number.NaN)).toBe(1);
  });
  it("menerima halaman valid apa adanya", () => {
    expect(clampPage(3)).toBe(3);
  });
});

describe("buildPermitRecordWhere", () => {
  it("hanya deleted_at IS NULL kalau tidak ada filter", () => {
    const { whereSql, params } = buildPermitRecordWhere({});
    expect(whereSql).toBe("WHERE pr.deleted_at IS NULL");
    expect(params).toEqual([]);
  });

  it("pencarian bebas menghasilkan 5 placeholder dengan nilai %term% yang sama", () => {
    const { whereSql, params } = buildPermitRecordWhere({ search: "budi" });
    expect(params).toEqual(["%budi%", "%budi%", "%budi%", "%budi%", "%budi%"]);
    expect(whereSql).toContain("pr.nomor_izin LIKE $1");
    expect(whereSql).toContain("pt.name LIKE $4");
  });

  it("search di-trim dan diabaikan kalau kosong/spasi", () => {
    const { whereSql, params } = buildPermitRecordWhere({ search: "   " });
    expect(whereSql).toBe("WHERE pr.deleted_at IS NULL");
    expect(params).toEqual([]);
  });

  it("filter permitTypeId/statusId/tahun memakai penomoran $n yang berurutan", () => {
    const { whereSql, params } = buildPermitRecordWhere({
      permitTypeId: 3,
      statusId: 2,
      tahun: 2026,
    });
    expect(whereSql).toBe(
      "WHERE pr.deleted_at IS NULL AND pr.permit_type_id = $1 AND pr.status_id = $2 AND pr.tahun = $3"
    );
    expect(params).toEqual([3, 2, 2026]);
  });

  it("rentang tanggal_berakhir dari dan sampai", () => {
    const { whereSql, params } = buildPermitRecordWhere({
      tanggalBerakhirFrom: "2026-01-01",
      tanggalBerakhirTo: "2026-12-31",
    });
    expect(whereSql).toContain("pr.tanggal_berakhir >= $1");
    expect(whereSql).toContain("pr.tanggal_berakhir <= $2");
    expect(params).toEqual(["2026-01-01", "2026-12-31"]);
  });

  it("kombinasi search + filter lain tetap konsisten penomorannya", () => {
    const { whereSql, params } = buildPermitRecordWhere({ search: "x", tahun: 2025 });
    expect(whereSql).toContain("tahun = $6");
    expect(params[5]).toBe(2025);
  });
});

describe("buildOrderBy", () => {
  it("default created_at menurun (terbaru dibuat dulu)", () => {
    expect(buildOrderBy()).toBe("ORDER BY pr.created_at DESC");
  });

  it("tanggal_berakhir default menaik dengan NULL di akhir", () => {
    expect(buildOrderBy("tanggal_berakhir")).toBe(
      "ORDER BY (pr.tanggal_berakhir IS NULL), pr.tanggal_berakhir ASC"
    );
  });

  it("tanggal_berakhir arah menurun tetap menaruh NULL di akhir", () => {
    expect(buildOrderBy("tanggal_berakhir", "desc")).toBe(
      "ORDER BY (pr.tanggal_berakhir IS NULL), pr.tanggal_berakhir DESC"
    );
  });

  it("nomor_izin default A-Z", () => {
    expect(buildOrderBy("nomor_izin")).toBe("ORDER BY pr.nomor_izin ASC");
  });

  it("tahun default menurun (terbaru dulu)", () => {
    expect(buildOrderBy("tahun")).toBe("ORDER BY pr.tahun DESC");
  });

  it("arah eksplisit menimpa default", () => {
    expect(buildOrderBy("nomor_izin", "desc")).toBe("ORDER BY pr.nomor_izin DESC");
  });
});

describe("getDefaultSortDirection", () => {
  it("mengembalikan arah default yang sesuai per kolom", () => {
    expect(getDefaultSortDirection("created_at")).toBe("desc");
    expect(getDefaultSortDirection("tanggal_berakhir")).toBe("asc");
    expect(getDefaultSortDirection("nomor_izin")).toBe("asc");
    expect(getDefaultSortDirection("tahun")).toBe("desc");
  });
});