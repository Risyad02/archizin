import { getDb } from "../database/db";

export async function logAudit(params: {
  userId: number;
  action: "CREATE" | "UPDATE" | "DELETE" | "IMPORT" | "EXPORT" | "LOGIN" | "LOGOUT" | "RESTORE" | "BACKUP";
  entity: string;
  recordId: number | null;
  oldValue: unknown;
  newValue: unknown;
}): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO audit_logs (user_id, action, entity, record_id, old_value, new_value, timestamp)
     VALUES ($1, $2, $3, $4, $5, $6, datetime('now'))`,
    [
      params.userId,
      params.action,
      params.entity,
      params.recordId,
      params.oldValue !== null ? JSON.stringify(params.oldValue) : null,
      params.newValue !== null ? JSON.stringify(params.newValue) : null,
    ]
  );
}