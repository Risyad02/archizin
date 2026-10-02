import * as repo from "./repository";
import { daysUntil } from "../../lib/dateHelpers";
import { getActiveStatusRules } from "../permit-status/service";
import { bucketExpiry, buildMonthlySeries } from "./stats";
import type { DashboardSummary } from "./types";

const TREND_MONTHS = 12;

/**
 * Merakit seluruh angka dashboard dalam satu panggilan.
 * Tanpa assertCan: dashboard hanya membaca dan boleh dilihat semua role (sama seperti
 * record:read pada getPermitRecordsPage). Panel yang sensitif (aktivitas terbaru,
 * audit:view) dibuat terpisah di checkpoint 7.6, bukan di sini.
 */
export async function getDashboardSummary(): Promise<DashboardSummary> {
  const [totals, byStatus, byPermitType, expiryRows, monthlyRows, rules] = await Promise.all([
    repo.getTotals(),
    repo.countByStatus(),
    repo.countByPermitType(),
    repo.listExpiryDateCounts(),
    repo.listMonthlyCounts(),
    getActiveStatusRules(),
  ]);

  const now = new Date();

  const expiry = bucketExpiry(
    expiryRows.map((row) => ({ days: daysUntil(row.tanggal_berakhir), total: row.total })),
    rules.map((rule) => rule.threshold_days)
  );

  const monthly = buildMonthlySeries(
    monthlyRows,
    now.getFullYear(),
    now.getMonth() + 1,
    TREND_MONTHS
  );

  const statusTotal = byStatus.reduce((sum, item) => sum + item.total, 0);

  return {
    total: totals.total,
    withoutIssueDate: totals.without_issue_date,
    withoutStatus: Math.max(0, totals.total - statusTotal),
    byStatus,
    byPermitType,
    expiry,
    monthly,
  };
}