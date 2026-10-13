import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type Database from "@tauri-apps/plugin-sql";

vi.mock("@tauri-apps/plugin-sql", () => ({ default: class {} }));

import { runMigrations } from "./migrate";

let logSpy: { mockRestore: () => void };

beforeEach(() => {
  // runMigrations menulis satu baris log per migration; tidak perlu memenuhi keluaran tes.
  logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  logSpy.mockRestore();
});

/** Database tiruan: select("PRAGMA user_version") mengembalikan versi yang diberikan. */
function fakeDb(userVersion: number | null) {
  const executed: string[] = [];
  const select = vi.fn();
  select.mockResolvedValue(userVersion === null ? [] : [{ user_version: userVersion }]);
  const execute = vi.fn();
  execute.mockImplementation(async (sql: string) => {
    executed.push(sql);
    return { rowsAffected: 0 };
  });
  return { db: { select, execute } as unknown as Database, executed, execute };
}

function appliedVersions(executed: string[]): number[] {
  return executed
    .map((sql) => /^PRAGMA user_version = (\d+)$/.exec(sql)?.[1])
    .filter((v): v is string => v !== undefined)
    .map(Number);
}

describe("runMigrations", () => {
  it("database baru (versi 0) menerapkan semua migration berurutan tanpa loncat", async () => {
    const { db, executed } = fakeDb(0);
    await runMigrations(db);
    const versions = appliedVersions(executed);
    expect(versions.length).toBeGreaterThanOrEqual(6);
    expect(versions).toEqual(versions.map((_, index) => index + 1));
  });

  it("versi kosong dari PRAGMA dianggap 0", async () => {
    const { db, executed } = fakeDb(null);
    await runMigrations(db);
    expect(appliedVersions(executed)[0]).toBe(1);
  });

  it("database di versi 4 menerapkan 0005 dan 0006: indeks dibuat, versi naik ke 6", async () => {
    const { db, executed } = fakeDb(4);
    await runMigrations(db);
    const indeks =
      "CREATE INDEX IF NOT EXISTS idx_document_links_permit_record ON document_links(permit_record_id)";
    expect(executed).toEqual([indeks, "PRAGMA user_version = 5", indeks, "PRAGMA user_version = 6"]);
  });

  it("database di versi 5 (0005 tercatat tetapi indeks hilang) hanya menerapkan 0006", async () => {
    const { db, executed } = fakeDb(5);
    await runMigrations(db);
    expect(executed).toEqual([
      "CREATE INDEX IF NOT EXISTS idx_document_links_permit_record ON document_links(permit_record_id)",
      "PRAGMA user_version = 6",
    ]);
  });

  it("setiap migration benar-benar menjalankan minimal satu pernyataan sebelum menaikkan versi", async () => {
    const { db, executed } = fakeDb(0);
    await runMigrations(db);
    let jumlah = 0;
    for (const sql of executed) {
      if (/^PRAGMA user_version = \d+$/.test(sql)) {
        expect(jumlah).toBeGreaterThan(0);
        jumlah = 0;
      } else {
        jumlah += 1;
      }
    }
  });

  it("database yang sudah di versi terbaru tidak menjalankan apa pun", async () => {
    const baru = fakeDb(0);
    await runMigrations(baru.db);
    const latest = appliedVersions(baru.executed).pop() ?? 0;

    const { db, execute } = fakeDb(latest);
    await runMigrations(db);
    expect(execute).not.toHaveBeenCalled();
  });

  it("komentar tidak ikut dieksekusi dan tidak ada pernyataan kosong", async () => {
    const { db, executed } = fakeDb(0);
    await runMigrations(db);
    for (const statement of executed) {
      expect(statement.length > 0).toBe(true);
      expect(statement.startsWith("--")).toBe(false);
      expect(statement.endsWith(";")).toBe(false);
    }
  });
});