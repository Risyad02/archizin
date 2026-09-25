import { getDb } from "../../database/db";
import type { PermitStatus } from "./types";

export async function listPermitStatuses(): Promise<PermitStatus[]> {
  const db = await getDb();
  return db.select<PermitStatus[]>(
    "SELECT id, code, label, color, sort_order FROM permit_status ORDER BY sort_order"
  );
}