export interface AuditLogEntry {
  id: number;
  user_id: number | null;
  username: string | null;
  full_name: string | null;
  action: string;
  entity: string;
  record_id: number | null;
  old_value: string | null;
  new_value: string | null;
  timestamp: string;
}