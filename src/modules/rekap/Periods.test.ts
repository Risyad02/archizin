import { describe, it, expect } from "vitest";
import { isValidYear, periodKeyOf, periodsForYear, type PeriodKind } from "./periods";

describe("isValidYear", () => {
  it("menerima tahun bulat dalam rentang dan menolak sisanya", () => {
    expect(isValidYear(2026)).toBe(true);
    expect(isValidYear(1900)).toBe(true);
    expect(isValidYear(2999)).toBe(true);
    expect(isValidYear(1899)).toBe(false);
    expect(isValidYear(3000)).toBe(false);
    expect(isValidYear(2026.5)).toBe(false);
    expect(isValidYear(Number.NaN)).toBe(false);
  });
});

describe("periodsForYear", () => {
  it("jumlah periode per jenis", () => {
    expect(periodsForYear(2026, "month")).toHaveLength(12);
    expect(periodsForYear(2026, "quarter")).toHaveLength(4);
    expect(periodsForYear(2026, "semester")).toHaveLength(2);
    expect(periodsForYear(2026, "year")).toHaveLength(1);
  });

  it("bulanan: rentang tiap bulan benar, Februari kabisat vs bukan kabisat", () => {
    const biasa = periodsForYear(2026, "month");
    expect(biasa[0]).toEqual({ key: "2026-01", label: "Januari", from: "2026-01-01", to: "2026-01-31" });
    expect(biasa[1]?.to).toBe("2026-02-28");
    expect(biasa[3]?.to).toBe("2026-04-30");
    expect(biasa[11]).toEqual({ key: "2026-12", label: "Desember", from: "2026-12-01", to: "2026-12-31" });
    expect(periodsForYear(2024, "month")[1]?.to).toBe("2024-02-29");
    // 1900 bukan kabisat (habis dibagi 100, tidak habis dibagi 400); 2000 kabisat.
    expect(periodsForYear(1900, "month")[1]?.to).toBe("1900-02-28");
    expect(periodsForYear(2000, "month")[1]?.to).toBe("2000-02-29");
  });

  it("triwulan, semester, dan tahun", () => {
    expect(periodsForYear(2026, "quarter").map((p) => [p.key, p.label, p.from, p.to])).toEqual([
      ["2026-Q1", "Triwulan I", "2026-01-01", "2026-03-31"],
      ["2026-Q2", "Triwulan II", "2026-04-01", "2026-06-30"],
      ["2026-Q3", "Triwulan III", "2026-07-01", "2026-09-30"],
      ["2026-Q4", "Triwulan IV", "2026-10-01", "2026-12-31"],
    ]);
    expect(periodsForYear(2026, "semester").map((p) => [p.key, p.from, p.to])).toEqual([
      ["2026-S1", "2026-01-01", "2026-06-30"],
      ["2026-S2", "2026-07-01", "2026-12-31"],
    ]);
    expect(periodsForYear(2026, "year")[0]).toEqual({
      key: "2026",
      label: "Tahun 2026",
      from: "2026-01-01",
      to: "2026-12-31",
    });
  });

  it("periode berurutan, tanpa celah dan tanpa tumpang tindih", () => {
    const kinds: PeriodKind[] = ["month", "quarter", "semester", "year"];
    for (const kind of kinds) {
      const periods = periodsForYear(2026, kind);
      expect(periods[0]?.from).toBe("2026-01-01");
      expect(periods[periods.length - 1]?.to).toBe("2026-12-31");
      for (let i = 1; i < periods.length; i++) {
        const prevEnd = new Date(`${periods[i - 1]?.to}T00:00:00Z`).getTime();
        const start = new Date(`${periods[i]?.from}T00:00:00Z`).getTime();
        expect(start - prevEnd).toBe(24 * 60 * 60 * 1000);
      }
    }
  });

  it("melempar error untuk tahun tidak valid", () => {
    expect(() => periodsForYear(Number.NaN, "month")).toThrow();
    expect(() => periodsForYear(20260, "year")).toThrow();
  });
});

describe("periodKeyOf", () => {
  it("memetakan tanggal ke kunci periode, termasuk batas awal dan akhir", () => {
    expect(periodKeyOf("2026-03-31", 2026, "month")).toBe("2026-03");
    expect(periodKeyOf("2026-03-31", 2026, "quarter")).toBe("2026-Q1");
    expect(periodKeyOf("2026-04-01", 2026, "quarter")).toBe("2026-Q2");
    expect(periodKeyOf("2026-06-30", 2026, "semester")).toBe("2026-S1");
    expect(periodKeyOf("2026-07-01", 2026, "semester")).toBe("2026-S2");
    expect(periodKeyOf("2026-12-31", 2026, "year")).toBe("2026");
  });

  it("null untuk tanggal kosong, tahun lain, atau tanggal yang tidak ada", () => {
    expect(periodKeyOf(null, 2026, "month")).toBeNull();
    expect(periodKeyOf("", 2026, "month")).toBeNull();
    expect(periodKeyOf("2025-12-31", 2026, "month")).toBeNull();
    expect(periodKeyOf("2026-02-29", 2026, "month")).toBeNull();
    expect(periodKeyOf("2026-13-01", 2026, "month")).toBeNull();
    expect(periodKeyOf("2026-1-5", 2026, "month")).toBeNull();
  });

  it("konsisten dengan periodsForYear: setiap hari dalam tahun jatuh ke periode yang rentangnya memuat hari itu", () => {
    const kinds: PeriodKind[] = ["month", "quarter", "semester", "year"];
    for (const kind of kinds) {
      const periods = periodsForYear(2024, kind);
      for (let t = Date.UTC(2024, 0, 1); t <= Date.UTC(2024, 11, 31); t += 24 * 60 * 60 * 1000) {
        const day = new Date(t).toISOString().slice(0, 10);
        const key = periodKeyOf(day, 2024, kind);
        const period = periods.find((p) => p.key === key);
        expect(period !== undefined && day >= period.from && day <= period.to).toBe(true);
      }
    }
  });
});