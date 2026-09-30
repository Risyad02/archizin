import { getDb } from "../../database/db";
import type { PermitStatus, StatusRule } from "./types";

export async function listPermitStatuses(): Promise<PermitStatus[]> {
  const db = await getDb();
  return db.select<PermitStatus[]>(
    "SELECT id, code, label, color, sort_order FROM permit_status ORDER BY sort_order"
  );
}

export async function listActiveStatusRules(): Promise<StatusRule[]> {
  const db = await getDb();
  return db.select<StatusRule[]>(
    `SELECT sr.id, sr.based_on, sr.threshold_days, sr.resulting_status_id,
            ps.code as resulting_code, ps.label as resulting_label, ps.color as resulting_color
     FROM status_rules sr
     JOIN permit_status ps ON ps.id = sr.resulting_status_id
     WHERE sr.is_active = 1
     ORDER BY sr.threshold_days ASC`
  );
}