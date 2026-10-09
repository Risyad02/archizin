import * as repo from "./repository";
import { buildRekapTable, type RekapTable } from "./crossTab";
import { isValidYear } from "./periods";
import { toRekapSourceRows } from "./rekapQuery";
import type { RekapRequest } from "./types";

/**
 * Rekapitulasi izin per periode. Tanpa assertCan: hanya membaca dan boleh dilihat semua
 * role, sama seperti dashboard dan record:read pada daftar izin.
 * Tahun divalidasi di sini supaya masukan rusak berhenti sebelum menyentuh database.
 */
export async function getRekap(request: RekapRequest): Promise<RekapTable> {
  if (!isValidYear(request.year)) {
    throw new Error("Tahun rekap tidak valid.");
  }
  const rows = await repo.listRekapRows({
    year: request.year,
    basis: request.basis,
    grouping: request.grouping,
  });
  return buildRekapTable(toRekapSourceRows(rows), request.year, request.kind);
}