import { describe, it, expect } from "vitest";
import { bucketExpiry, buildMonthlySeries } from "./stats";
import type { DaysCount, MonthCount } from "./stats";

const THRESHOLDS = [7, 14, 30, 60, 90];

function totalsByKey(buckets: ReturnType<typeof bucketExpiry>): Record<string, number> {
  return Object.fromEntries(buckets.map((b) => [b.key, b.total]));
}

describe("bucketExpiry", () => {
  const items: DaysCount[] = [
    { days: -3, total: 2 },
    { days: 0, total: 1 },
    { days: 7, total: 1 },
    { days: 8, total: 4 },
    { days: 14, total: 1 },
    { days: 30, total: 1 },
    { days: 31, total: 2 },
    { days: 90, total: 1 },
    { days: 91, total: 5 },
    { days: null, total: 3 },
  ];

  it("menaruh batas inklusif di bucket yang benar dan menjaga urutan + jumlah total", () => {
    const buckets = bucketExpiry(items, THRESHOLDS);

    expect(buckets.map((b) => b.key)).toEqual([
      "overdue", "d7", "d14", "d30", "d60", "d90", "safe", "no_date",
    ]);
    expect(totalsByKey(buckets)).toEqual({
      overdue: 2,
      d7: 2, // hari 0 dan 7
      d14: 5, // hari 8 dan 14
      d30: 1, // hari 30
      d60: 2, // hari 31
      d90: 1, // hari 90
      safe: 5, // hari 91
      no_date: 3,
    });

    const inputTotal = items.reduce((sum, i) => sum + i.total, 0);
    const outputTotal = buckets.reduce((sum, b) => sum + b.total, 0);
    expect(outputTotal).toBe(inputTotal);

    expect(buckets.find((b) => b.key === "d14")?.label).toBe("8–14 hari");
    expect(buckets.find((b) => b.key === "safe")?.label).toBe("Lebih dari 90 hari");
  });

  it("merapikan ambang yang tidak terurut, duplikat, atau negatif", () => {
    const messy = bucketExpiry(items, [30, 7, 90, 7, -5, 60, 14]);
    const clean = bucketExpiry(items, THRESHOLDS);
    expect(messy).toEqual(clean);
  });

  it("tanpa ambang: hanya kedaluwarsa, masih berlaku, dan tanpa tanggal", () => {
    const buckets = bucketExpiry(
      [
        { days: -1, total: 1 },
        { days: 0, total: 2 },
        { days: 500, total: 3 },
        { days: null, total: 4 },
      ],
      []
    );
    expect(buckets.map((b) => b.key)).toEqual(["overdue", "safe", "no_date"]);
    expect(totalsByKey(buckets)).toEqual({ overdue: 1, safe: 5, no_date: 4 });
  });
});

describe("buildMonthlySeries", () => {
  it("mengisi bulan kosong dengan 0, melewati pergantian tahun, dan mengabaikan data tak valid", () => {
    const rows: MonthCount[] = [
      { tahun: 2026, bulan: 10, total: 4 },
      { tahun: 2026, bulan: 10, total: 1 }, // ganda -> dijumlahkan
      { tahun: 2025, bulan: 11, total: 2 },
      { tahun: 2025, bulan: 10, total: 9 }, // di luar rentang (13 bulan lalu)
      { tahun: null, bulan: null, total: 7 }, // tanpa tanggal terbit
      { tahun: 2026, bulan: 3, total: 5 },
      { tahun: 2026, bulan: 13, total: 100 }, // bulan tidak valid
    ];

    const series = buildMonthlySeries(rows, 2026, 10, 12);

    expect(series).toHaveLength(12);
    expect(series[0]).toEqual({ tahun: 2025, bulan: 11, label: "Nov", total: 2 });
    expect(series[1]).toEqual({ tahun: 2025, bulan: 12, label: "Des", total: 0 });
    expect(series[2]).toEqual({ tahun: 2026, bulan: 1, label: "Jan", total: 0 });
    expect(series[11]).toEqual({ tahun: 2026, bulan: 10, label: "Okt", total: 5 });
    expect(series.reduce((sum, p) => sum + p.total, 0)).toBe(12); // 2 + 5 + 5
  });

  it("rentang pendek yang melintasi tahun tetap berurutan", () => {
    const series = buildMonthlySeries([], 2026, 1, 3);
    expect(series.map((p) => `${p.tahun}-${p.bulan}`)).toEqual(["2025-11", "2025-12", "2026-1"]);
  });

  it("months < 1 menghasilkan deret kosong", () => {
    expect(buildMonthlySeries([{ tahun: 2026, bulan: 1, total: 1 }], 2026, 1, 0)).toEqual([]);
  });
});