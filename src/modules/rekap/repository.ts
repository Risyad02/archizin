import { getDb } from "../../database/db";
import { buildRekapQuery } from "./rekapQuery";
import type { RekapDbRow, RekapQueryOptions } from "./types";

// Hanya membaca, dan selalu mengecualikan data yang sudah di-soft-delete (lihat rekapQuery.ts).

/** Jumlah izin per (kelompok, tanggal dasar) untuk satu tahun, plus izin tanpa tanggal dasar. */
export async function listRekapRows(options: RekapQueryOptions): Promise<RekapDbRow[]> {
  const db = await getDb();
  const { sql, params } = buildRekapQuery(options);
  return db.select<RekapDbRow[]>(sql, params);
}