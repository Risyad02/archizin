import { describe, it, expect } from "vitest";
import {
  EMPTY_LIST_FILTERS,
  LIST_PATH,
  isValidISODate,
  parseListFilters,
  countActiveFilters,
  buildListUrl,
} from "./listFilters";

function parse(query: string) {
  return parseListFilters(new URLSearchParams(query));
}

const SEMUA_PARAMETER =
  "jenis=3&status=2&tahun=2026&terbitDari=2026-01-01&terbitSampai=2026-03-31" +
  "&berakhirDari=2027-01-01&berakhirSampai=2027-12-31";

describe("isValidISODate", () => {
  it("menerima tanggal kalender yang sah, termasuk 29 Februari tahun kabisat", () => {
    expect(isValidISODate("2026-10-08")).toBe(true);
    expect(isValidISODate("2024-02-29")).toBe(true);
    expect(isValidISODate("2026-12-31")).toBe(true);
  });

  it("menolak format yang salah dan tanggal yang tidak ada di kalender", () => {
    const salah = [
      "",
      "2026-1-5",
      "26-10-08",
      "2026/10/08",
      "2026-10-08T00:00",
      " 2026-10-08",
      "2026-13-01",
      "2026-00-10",
      "2026-02-29", // 2026 bukan tahun kabisat
      "2026-04-31",
      "2026-10-32",
      "0000-01-01",
    ];
    for (const nilai of salah) {
      expect(isValidISODate(nilai)).toBe(false);
    }
  });
});

describe("parseListFilters", () => {
  it("tanpa parameter: semua filter kosong", () => {
    expect(parse("")).toEqual(EMPTY_LIST_FILTERS);
  });

  it("membaca semua parameter yang valid", () => {
    expect(parse(SEMUA_PARAMETER)).toEqual({
      permitTypeId: 3,
      statusId: 2,
      tahun: "2026",
      terbitFrom: "2026-01-01",
      terbitTo: "2026-03-31",
      berakhirFrom: "2027-01-01",
      berakhirTo: "2027-12-31",
    });
  });

  it("nilai tidak valid diabaikan per parameter, yang valid tetap terbaca", () => {
    const filters = parse(
      "jenis=abc&status=0&tahun=26&terbitDari=2026-13-45&terbitSampai=2026-03-31" +
        "&berakhirDari=kemarin&berakhirSampai="
    );
    expect(filters).toEqual({ ...EMPTY_LIST_FILTERS, terbitTo: "2026-03-31" });

    const idSalah = ["jenis=-1", "jenis=1.5", "jenis=3abc", "jenis=007", "jenis=99999999999", "jenis=1;DROP%20TABLE%20x"];
    for (const query of idSalah) {
      expect(parse(query).permitTypeId).toBe("all");
    }
  });

  it("parameter yang tidak dikenal diabaikan dan parameter ganda memakai nilai pertama", () => {
    expect(parse("sembarang=1&jenis=4&jenis=5&tahun=2025&tahun=2026")).toEqual({
      ...EMPTY_LIST_FILTERS,
      permitTypeId: 4,
      tahun: "2025",
    });
  });
});

describe("countActiveFilters", () => {
  it("menghitung hanya filter yang terisi", () => {
    expect(countActiveFilters(EMPTY_LIST_FILTERS)).toBe(0);
    expect(
      countActiveFilters({ ...EMPTY_LIST_FILTERS, permitTypeId: 3, terbitFrom: "2026-01-01" })
    ).toBe(2);
    expect(countActiveFilters(parse(SEMUA_PARAMETER))).toBe(7);
  });
});

describe("buildListUrl", () => {
  it("tanpa filter: hanya path daftar", () => {
    expect(buildListUrl({})).toBe(LIST_PATH);
    expect(buildListUrl(EMPTY_LIST_FILTERS)).toBe("/permit-records");
  });

  it("menyusun query string dengan urutan tetap, apa pun urutan masukannya", () => {
    expect(
      buildListUrl({
        berakhirTo: "2027-12-31",
        tahun: "2026",
        permitTypeId: 3,
        terbitFrom: "2026-01-01",
        terbitTo: "2026-03-31",
      })
    ).toBe(
      "/permit-records?jenis=3&tahun=2026&terbitDari=2026-01-01&terbitSampai=2026-03-31&berakhirSampai=2027-12-31"
    );
  });

  it("nilai tidak valid tidak ikut ditulis, dan hasilnya bisa dibaca balik (round trip)", () => {
    expect(
      buildListUrl({ permitTypeId: 0, statusId: -2, tahun: "26", terbitFrom: "2026-02-30" })
    ).toBe(LIST_PATH);

    const filters = {
      permitTypeId: 3,
      statusId: 2,
      tahun: "2026",
      terbitFrom: "2026-01-01",
      terbitTo: "2026-03-31",
      berakhirFrom: "2027-01-01",
      berakhirTo: "2027-12-31",
    };
    const query = buildListUrl(filters).split("?")[1] ?? "";
    expect(parse(query)).toEqual(filters);
  });
});