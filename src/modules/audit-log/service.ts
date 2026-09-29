import * as repo from "./repository";
import { assertCan } from "../../lib/permissions";
import type { AuthUser } from "../auth/types";
import type { AuditLogEntry } from "./types";

export async function getRecentAuditLogs(actor: AuthUser): Promise<AuditLogEntry[]> {
  assertCan(actor.role, "audit:view");
  return repo.listRecentAuditLogs();
}