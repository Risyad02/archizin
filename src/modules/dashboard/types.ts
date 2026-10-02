import type { ExpiryBucket, MonthlyPoint } from "./stats";

/** Baris mentah dari query ringkasan total. */
export interface TotalsRow {
  total: number;
  /** Izin yang tahun/bulannya NULL — tidak ikut grafik tren (tren dibangun dari tanggal terbit). */
  without_issue_date: number;
}

export interface StatusCount {
  status_id: number;
  code: string;
  label: string;
  color: string | null;
  total: number;
}

export interface PermitTypeCount {
  permit_type_id: number;
  code: string;
  name: string;
  total: number;
}

export interface ExpiryDateCount {
  tanggal_berakhir: string | null;
  total: number;
}

export interface DashboardSummary {
  total: number;
  withoutIssueDate: number;
  /** Izin yang status_id-nya NULL (mis. hasil import). Normalnya 0. */
  withoutStatus: number;
  byStatus: StatusCount[];
  byPermitType: PermitTypeCount[];
  expiry: ExpiryBucket[];
  monthly: MonthlyPoint[];
}