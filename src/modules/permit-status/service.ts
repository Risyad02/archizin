import * as repo from "./repository";
import type { PermitStatus, StatusRule } from "./types";

export async function getStatusOptions(): Promise<PermitStatus[]> {
  return repo.listPermitStatuses();
}

export async function getActiveStatusRules(): Promise<StatusRule[]> {
  return repo.listActiveStatusRules();
}