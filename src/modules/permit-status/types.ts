export interface PermitStatus {
  id: number;
  code: string;
  label: string;
  color: string | null;
  sort_order: number;
}

export interface StatusRule {
  id: number;
  based_on: string;
  threshold_days: number;
  resulting_status_id: number;
  resulting_code: string;
  resulting_label: string;
  resulting_color: string | null;
}