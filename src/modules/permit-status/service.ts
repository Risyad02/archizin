import * as repo from "./repository";
import type { PermitStatus } from "./types";

export async function getStatusOptions(): Promise<PermitStatus[]> {
  return repo.listPermitStatuses();
}