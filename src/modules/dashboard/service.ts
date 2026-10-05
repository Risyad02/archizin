import * as repo from "./repository";
import { daysUntil } from "../../lib/dateHelpers";
import { getActiveStatusRules } from "../permit-status/service";
import { STATUS_CODES_EXCLUDED_FROM_EXPIRY } from "../permit-status/expiry";
import { bucketExpiry, buildMonthlySeries } from "./stats";
import { buildExpiryWindow } from "./expiryWindow";
import type { AttentionRecord, DashboardSummary, ExpiringRecord } from "./types";

const TREND_MONTHS = 12;
/** Jumlah baris maksimum per daftar "perlu perhatian" di dashboard. */
export const ATTENTION_LIMIT = 8;

function withDays(rows: ExpiringRecord[]): AttentionRecord[] {
  return rows.map((row) => ({ ...row, days: daysUntil(row.tanggal_berakhir) }));
}

/**
 * Merakit seluruh angka dashboard dalam satu panggilan.
 * Tanpa assertCan: dashboard hanya membaca dan boleh dilihat semua role (sama seperti
 * record:read pada getPermitRecordsPage). Panel yang sensitif (aktivitas terbaru,
 * audit:view) dibuat terpisah di checkpoint 7.6, bukan di sini.
 */
export async function getDashboardSummary(): Promise<DashboardSummary> {
  // Rules dibutuhkan lebih dulu: ambang terbesar menentukan rentang "segera berakhir".
  const rules = await getActiveStatusRules();
  const thresholds = rules.map((rule) => rule.threshold_days);
  const maxDays = thresholds.length > 0 ? Math.max(...thresholds) : null;

  const now = new Date();
  const window = maxDays === null ? null : buildExpiryWindow(now, maxDays);

  const [totals, byStatus, byPermitType, expiryRows, monthlyRows, overdueRows, upcomingRows] =
    await Promise.all([
      repo.getTotals(),
      repo.countByStatus(),
      repo.countByPermitType(),
      repo.listExpiryDateCounts(STATUS_CODES_EXCLUDED_FROM_EXPIRY),
      repo.listMonthlyCounts(),
      repo.listExpiringRecords({
        kind: "overdue",
        today: buildExpiryWindow(now, 0).today,
        excludedStatusCodes: STATUS_CODES_EXCLUDED_FROM_EXPIRY,
        limit: ATTENTION_LIMIT,
      }),
      window
        ? repo.listExpiringRecords({
            kind: "upcoming",
            today: window.today,
            upTo: window.upTo,
            excludedStatusCodes: STATUS_CODES_EXCLUDED_FROM_EXPIRY,
            limit: ATTENTION_LIMIT,
          })
        : Promise.resolve([] as ExpiringRecord[]),
    ]);

  const expiry = bucketExpiry(
    expiryRows.map((row) => ({ days: daysUntil(row.tanggal_berakhir), total: row.total })),
    thresholds
  );

  const monthly = buildMonthlySeries(
    monthlyRows,
    now.getFullYear(),
    now.getMonth() + 1,
    TREND_MONTHS
  );

  const statusTotal = byStatus.reduce((sum, item) => sum + item.total, 0);
  // Semua izin yang tidak masuk bucket manapun = izin berstatus yang dikecualikan.
  const expiryTracked = expiry.reduce((sum, bucket) => sum + bucket.total, 0);

  return {
    total: totals.total,
    withoutIssueDate: totals.without_issue_date,
    withoutStatus: Math.max(0, totals.total - statusTotal),
    expiryExcluded: Math.max(0, totals.total - expiryTracked),
    byStatus,
    byPermitType,
    expiry,
    monthly,
    attention: {
      overdue: withDays(overdueRows),
      upcoming: withDays(upcomingRows),
    },
  };
}