import { describe, it, expect } from "vitest";
import { toLocalISODate, buildExpiryWindow } from "./expiryWindow";

describe("toLocalISODate", () => {
  it("memakai tanggal lokal dengan nol di depan, termasuk menjelang tengah malam", () => {
    expect(toLocalISODate(new Date(2026, 0, 5, 23, 59, 59))).toBe("2026-01-05");
    expect(toLocalISODate(new Date(2026, 11, 31, 0, 0, 1))).toBe("2026-12-31");
  });
});

describe("buildExpiryWindow", () => {
  it("menambah hari melewati akhir bulan", () => {
    expect(buildExpiryWindow(new Date(2026, 9, 2, 12), 90)).toEqual({
      today: "2026-10-02",
      upTo: "2026-12-31",
    });
  });

  it("melintasi pergantian tahun dan maxDays 0 berarti hari ini saja", () => {
    expect(buildExpiryWindow(new Date(2026, 11, 20, 8), 30).upTo).toBe("2027-01-19");
    expect(buildExpiryWindow(new Date(2026, 5, 15), 0)).toEqual({
      today: "2026-06-15",
      upTo: "2026-06-15",
    });
  });
});