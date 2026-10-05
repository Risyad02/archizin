import { describe, it, expect } from "vitest";
import { deriveHeadlineStats } from "./headline";
import { bucketExpiry } from "./stats";
import type { DashboardSummary } from "./types";

function makeSummary(overrides: Partial<DashboardSummary> = {}): DashboardSummary {
  return {
    total: 0,
    withoutIssueDate: 0,
    withoutStatus: 0,
    expiryExcluded: 0,
    byStatus: [],
    byPermitType: [],
    expiry: bucketExpiry([], [7, 14, 30, 60, 90]),
    monthly: [],
    attention: { overdue: [], upcoming: [] },
    ...overrides,
  };
}

describe("deriveHeadlineStats", () => {
  it("menjumlahkan semua bucket rentang menjadi 'segera berakhir' dan membaca bucket lain apa adanya", () => {
    const summary = makeSummary({
      total: 20,
      withoutIssueDate: 2,
      withoutStatus: 1,
      expiryExcluded: 1,
      byStatus: [
        { status_id: 3, code: "aktif", label: "Aktif", color: "#22c55e", total: 12 },
        { status_id: 1, code: "draft", label: "Draft", color: "#9ca3af", total: 5 },
      ],
      expiry: bucketExpiry(
        [
          { days: -3, total: 2 },
          { days: 5, total: 1 },
          { days: 20, total: 3 },
          { days: 80, total: 4 },
          { days: 200, total: 5 },
          { days: null, total: 6 },
        ],
        [7, 14, 30, 60, 90]
      ),
    });

    expect(deriveHeadlineStats(summary)).toEqual({
      total: 20,
      active: 12,
      expiringSoon: 8, // 1 + 3 + 4; bucket "safe" (200 hari) tidak ikut
      expiringSoonMaxDays: 90,
      overdue: 2,
      noExpiryDate: 6,
      withoutStatus: 1,
      withoutIssueDate: 2,
      expiryExcluded: 1,
    });
  });

  it("tanpa status 'aktif' di daftar: active = 0", () => {
    const summary = makeSummary({
      byStatus: [{ status_id: 1, code: "draft", label: "Draft", color: null, total: 3 }],
    });
    expect(deriveHeadlineStats(summary).active).toBe(0);
  });

  it("tanpa status_rules aktif: segera berakhir 0 dan batas maksimum null", () => {
    const summary = makeSummary({
      total: 1,
      expiry: bucketExpiry([{ days: 5, total: 1 }], []),
    });
    const stats = deriveHeadlineStats(summary);
    expect(stats.expiringSoon).toBe(0);
    expect(stats.expiringSoonMaxDays).toBeNull();
  });
});