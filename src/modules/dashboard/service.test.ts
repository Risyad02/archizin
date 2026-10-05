import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as repo from "./repository";
import { getActiveStatusRules } from "../permit-status/service";
import { getDashboardSummary, ATTENTION_LIMIT } from "./service";
import { STATUS_CODES_EXCLUDED_FROM_EXPIRY } from "../permit-status/expiry";
import type { StatusRule } from "../permit-status/types";
import type { ExpiringRecord } from "./types";

// Semua fungsi yang dipanggil service WAJIB disebut di factory — nama yang tidak
// disebut tidak akan menjadi vi.fn() (lihat jebakan vi.mock di handoff).
vi.mock("./repository", () => ({
  getTotals: vi.fn(),
  countByStatus: vi.fn(),
  countByPermitType: vi.fn(),
  listExpiryDateCounts: vi.fn(),
  listMonthlyCounts: vi.fn(),
  listExpiringRecords: vi.fn(),
}));

vi.mock("../permit-status/service", () => ({
  getActiveStatusRules: vi.fn(),
}));

function rule(threshold: number): StatusRule {
  return {
    id: threshold,
    based_on: "tanggal_berakhir",
    threshold_days: threshold,
    resulting_status_id: 4,
    resulting_code: "akan_berakhir",
    resulting_label: "Akan Berakhir",
    resulting_color: "#eab308",
  };
}

function expiring(overrides: Partial<ExpiringRecord> = {}): ExpiringRecord {
  return {
    id: 1,
    nomor_izin: "UJI/001",
    nama_pemohon: "PT Contoh",
    nama_usaha: null,
    permit_type_name: "PBG",
    tanggal_berakhir: "2026-10-09",
    status_code: "aktif",
    status_label: "Aktif",
    status_color: "#22c55e",
    ...overrides,
  };
}

function totalsByKey(summary: Awaited<ReturnType<typeof getDashboardSummary>>) {
  return Object.fromEntries(summary.expiry.map((b) => [b.key, b.total]));
}

beforeEach(() => {
  // Hanya Date yang dipalsukan; "hari ini" = 2 Okt 2026 siang (waktu lokal).
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 2, 12, 0, 0));
  // Default: tidak ada izin di daftar perhatian (afterEach me-reset semua mock).
  vi.mocked(repo.listExpiringRecords).mockResolvedValue([]);
});

afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
});

describe("getDashboardSummary", () => {
  it("merakit total, status, bucket masa berlaku, dan tren dari data repository", async () => {
    vi.mocked(repo.getTotals).mockResolvedValue({ total: 20, without_issue_date: 4 });
    vi.mocked(repo.countByStatus).mockResolvedValue([
      { status_id: 3, code: "aktif", label: "Aktif", color: "#22c55e", total: 12 },
      { status_id: 1, code: "draft", label: "Draft", color: "#9ca3af", total: 5 },
    ]);
    vi.mocked(repo.countByPermitType).mockResolvedValue([
      { permit_type_id: 1, code: "IMB", name: "Izin Mendirikan Bangunan", total: 20 },
    ]);
    vi.mocked(repo.listExpiryDateCounts).mockResolvedValue([
      { tanggal_berakhir: "2026-09-29", total: 2 }, // -3 hari
      { tanggal_berakhir: "2026-10-02", total: 1 }, // 0 hari
      { tanggal_berakhir: "2026-10-09", total: 1 }, // 7 hari
      { tanggal_berakhir: "2026-10-12", total: 3 }, // 10 hari
      { tanggal_berakhir: "2026-12-31", total: 4 }, // 90 hari
      { tanggal_berakhir: "2027-06-01", total: 5 }, // jauh
      { tanggal_berakhir: null, total: 3 },
    ]);
    // 2+1+1+3+4+5+3 = 19 dari total 20 -> 1 izin berstatus dikecualikan (dicabut/tidak_aktif)
    vi.mocked(repo.listMonthlyCounts).mockResolvedValue([
      { tahun: 2026, bulan: 10, total: 3 },
      { tahun: 2025, bulan: 11, total: 1 },
    ]);
    vi.mocked(getActiveStatusRules).mockResolvedValue([7, 14, 30, 60, 90].map(rule));

    const summary = await getDashboardSummary();

    expect(summary.total).toBe(20);
    expect(summary.withoutIssueDate).toBe(4);
    expect(summary.withoutStatus).toBe(3); // 20 - (12 + 5)
    expect(summary.expiryExcluded).toBe(1); // 20 - 19 yang masuk bucket
    expect(summary.byStatus).toHaveLength(2);
    expect(summary.byPermitType[0]?.code).toBe("IMB");

    // Service harus benar-benar meminta pengecualian status ke repository.
    expect(repo.listExpiryDateCounts).toHaveBeenCalledWith(STATUS_CODES_EXCLUDED_FROM_EXPIRY);
    expect(STATUS_CODES_EXCLUDED_FROM_EXPIRY).toEqual(["dicabut", "tidak_aktif"]);

    expect(totalsByKey(summary)).toEqual({
      overdue: 2,
      d7: 2,
      d14: 3,
      d30: 0,
      d60: 0,
      d90: 4,
      safe: 5,
      no_date: 3,
    });

    expect(summary.monthly).toHaveLength(12);
    expect(summary.monthly[0]).toEqual({ tahun: 2025, bulan: 11, label: "Nov", total: 1 });
    expect(summary.monthly[11]).toEqual({ tahun: 2026, bulan: 10, label: "Okt", total: 3 });
  });

  it("database kosong: semua angka 0 dan deret tren tetap 12 bulan", async () => {
    vi.mocked(repo.getTotals).mockResolvedValue({ total: 0, without_issue_date: 0 });
    vi.mocked(repo.countByStatus).mockResolvedValue([]);
    vi.mocked(repo.countByPermitType).mockResolvedValue([]);
    vi.mocked(repo.listExpiryDateCounts).mockResolvedValue([]);
    vi.mocked(repo.listMonthlyCounts).mockResolvedValue([]);
    vi.mocked(getActiveStatusRules).mockResolvedValue([7, 14, 30, 60, 90].map(rule));

    const summary = await getDashboardSummary();

    expect(summary.total).toBe(0);
    expect(summary.withoutStatus).toBe(0);
    expect(summary.expiry.every((b) => b.total === 0)).toBe(true);
    expect(summary.monthly).toHaveLength(12);
    expect(summary.monthly.every((p) => p.total === 0)).toBe(true);
  });

  it("tanpa status_rules aktif: bucket menyusut jadi kedaluwarsa, masih berlaku, tanpa tanggal", async () => {
    vi.mocked(repo.getTotals).mockResolvedValue({ total: 1, without_issue_date: 0 });
    vi.mocked(repo.countByStatus).mockResolvedValue([]);
    vi.mocked(repo.countByPermitType).mockResolvedValue([]);
    vi.mocked(repo.listExpiryDateCounts).mockResolvedValue([
      { tanggal_berakhir: "2026-10-05", total: 1 },
    ]);
    vi.mocked(repo.listMonthlyCounts).mockResolvedValue([]);
    vi.mocked(getActiveStatusRules).mockResolvedValue([]);

    const summary = await getDashboardSummary();

    expect(summary.expiry.map((b) => b.key)).toEqual(["overdue", "safe", "no_date"]);
    expect(totalsByKey(summary).safe).toBe(1);
  });

  it("daftar perhatian: meminta rentang tanggal lokal + pengecualian status, lalu menghitung selisih hari", async () => {
    vi.mocked(repo.getTotals).mockResolvedValue({ total: 2, without_issue_date: 0 });
    vi.mocked(repo.countByStatus).mockResolvedValue([]);
    vi.mocked(repo.countByPermitType).mockResolvedValue([]);
    vi.mocked(repo.listExpiryDateCounts).mockResolvedValue([]);
    vi.mocked(repo.listMonthlyCounts).mockResolvedValue([]);
    vi.mocked(getActiveStatusRules).mockResolvedValue([7, 14, 30, 60, 90].map(rule));
    vi.mocked(repo.listExpiringRecords).mockImplementation(async (options) =>
      options.kind === "overdue"
        ? [expiring({ id: 10, tanggal_berakhir: "2026-09-29" })]
        : [expiring({ id: 20, tanggal_berakhir: "2026-10-09" })]
    );

    const summary = await getDashboardSummary();

    expect(repo.listExpiringRecords).toHaveBeenCalledWith({
      kind: "overdue",
      today: "2026-10-02",
      excludedStatusCodes: STATUS_CODES_EXCLUDED_FROM_EXPIRY,
      limit: ATTENTION_LIMIT,
    });
    expect(repo.listExpiringRecords).toHaveBeenCalledWith({
      kind: "upcoming",
      today: "2026-10-02",
      upTo: "2026-12-31", // hari ini + ambang terbesar (90 hari)
      excludedStatusCodes: STATUS_CODES_EXCLUDED_FROM_EXPIRY,
      limit: ATTENTION_LIMIT,
    });

    expect(summary.attention.overdue.map((r) => [r.id, r.days])).toEqual([[10, -3]]);
    expect(summary.attention.upcoming.map((r) => [r.id, r.days])).toEqual([[20, 7]]);
  });

  it("tanpa status_rules: daftar 'segera berakhir' tidak diquery dan kosong; kedaluwarsa tetap jalan", async () => {
    vi.mocked(repo.getTotals).mockResolvedValue({ total: 1, without_issue_date: 0 });
    vi.mocked(repo.countByStatus).mockResolvedValue([]);
    vi.mocked(repo.countByPermitType).mockResolvedValue([]);
    vi.mocked(repo.listExpiryDateCounts).mockResolvedValue([]);
    vi.mocked(repo.listMonthlyCounts).mockResolvedValue([]);
    vi.mocked(getActiveStatusRules).mockResolvedValue([]);
    vi.mocked(repo.listExpiringRecords).mockResolvedValue([
      expiring({ id: 10, tanggal_berakhir: "2026-09-29" }),
    ]);

    const summary = await getDashboardSummary();

    expect(repo.listExpiringRecords).toHaveBeenCalledTimes(1);
    expect(vi.mocked(repo.listExpiringRecords).mock.calls[0]?.[0].kind).toBe("overdue");
    expect(summary.attention.upcoming).toEqual([]);
    expect(summary.attention.overdue).toHaveLength(1);
  });

  it("jalur gagal: error dari repository diteruskan, bukan ditelan", async () => {
    vi.mocked(repo.getTotals).mockRejectedValue(new Error("db gagal"));
    vi.mocked(repo.countByStatus).mockResolvedValue([]);
    vi.mocked(repo.countByPermitType).mockResolvedValue([]);
    vi.mocked(repo.listExpiryDateCounts).mockResolvedValue([]);
    vi.mocked(repo.listMonthlyCounts).mockResolvedValue([]);
    vi.mocked(getActiveStatusRules).mockResolvedValue([]);

    await expect(getDashboardSummary()).rejects.toThrow("db gagal");
  });
});