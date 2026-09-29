import { getDb } from "../../database/db";
import type { AuditLogEntry } from "./types";

const MAX_ROWS = 200;

export async function listRecentAuditLogs(): Promise<AuditLogEntry[]> {
  const db = await getDb();
  return db.select<AuditLogEntry[]>(
    `SELECT
       al.id, al.user_id, u.username, u.full_name,
       al.action, al.entity, al.record_id, al.old_value, al.new_value, al.timestamp
     FROM audit_logs al
     LEFT JOIN users u ON u.id = al.user_id
     ORDER BY al.timestamp DESC, al.id DESC
     LIMIT $1`,
    [MAX_ROWS]
  );
}