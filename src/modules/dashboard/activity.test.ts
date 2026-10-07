import { describe, it, expect } from "vitest";
import { describeActivity, toActivityItem, parseSqliteUtc, formatActivityTime } from "./activity";
import type { ActivityRow } from "./types";

function row(overrides: Partial<ActivityRow> = {}): ActivityRow {
  return {
    id: 1,
    action: "CREATE",
    entity: "permit_records",
    record_id: 7,
    timestamp: "2026-10-07 01:02:03",
    actor_name: "Budi",
    ...overrides,
  };
}

/** Kebalikan parseSqliteUtc: membuat string gaya datetime('now') dari sebuah instan waktu. */
function toSqliteUtc(date: Date): string {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

describe("describeActivity", () => {
  it("menyusun kalimat dari aksi + entity dan menautkan ke detail izin", () => {
    expect(describeActivity(row())).toEqual({ description: "Menambah data izin", recordId: 7 });
    expect(describeActivity(row({ action: "UPDATE", entity: "permit_record_folder" }))).toEqual({
      description: "Mengubah folder data izin",
      recordId: 7,
    });
  });

  it("izin yang dihapus tidak ditautkan (halaman detailnya sudah tidak ada)", () => {
    expect(describeActivity(row({ action: "DELETE" }))).toEqual({
      description: "Menghapus data izin",
      recordId: null,
    });
  });

  it("entity non-izin tidak ditautkan walau punya record_id, dan entity tak dikenal tampil apa adanya", () => {
    expect(describeActivity(row({ entity: "permit_types", record_id: 3 })).recordId).toBeNull();
    expect(describeActivity(row({ entity: "some_new_entity", record_id: null })).description).toBe(
      "Menambah some new entity"
    );
  });

  it("login/logout tidak menyebut entity; aksi tak dikenal tampil apa adanya", () => {
    expect(describeActivity(row({ action: "LOGIN", entity: "users", record_id: null })).description).toBe(
      "Masuk ke aplikasi"
    );
    expect(describeActivity(row({ action: "logout", entity: "users" })).description).toBe("Keluar dari aplikasi");
    expect(describeActivity(row({ action: "ARCHIVE" })).description).toBe("ARCHIVE data izin");
  });
});

describe("toActivityItem", () => {
  it("pelaku kosong dibaca 'Sistem'", () => {
    expect(toActivityItem(row({ actor_name: null })).actorName).toBe("Sistem");
    expect(toActivityItem(row()).actorName).toBe("Budi");
  });
});

describe("parseSqliteUtc", () => {
  it("membaca string SQLite sebagai UTC, bukan waktu lokal", () => {
    expect(parseSqliteUtc("2026-10-07 01:02:03")?.getTime()).toBe(Date.UTC(2026, 9, 7, 1, 2, 3));
  });

  it("format tak valid menghasilkan null", () => {
    expect(parseSqliteUtc("")).toBeNull();
    expect(parseSqliteUtc("kemarin")).toBeNull();
    expect(parseSqliteUtc("2026-13-45 99:99:99")).toBeNull();
    expect(parseSqliteUtc("2026-02-30 10:00:00")).toBeNull(); // 30 Februari tidak ada
  });
});

describe("formatActivityTime", () => {
  const now = new Date(2026, 9, 7, 12, 0, 0); // waktu lokal; tes tidak bergantung pada zona
  const ago = (ms: number) => toSqliteUtc(new Date(now.getTime() - ms));
  const SECOND = 1000;
  const MINUTE = 60 * SECOND;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;

  it("rentang relatif: baru saja, menit, jam, hari", () => {
    expect(formatActivityTime(ago(30 * SECOND), now)).toBe("Baru saja");
    expect(formatActivityTime(ago(5 * MINUTE), now)).toBe("5 menit lalu");
    expect(formatActivityTime(ago(3 * HOUR), now)).toBe("3 jam lalu");
    expect(formatActivityTime(ago(2 * DAY), now)).toBe("2 hari lalu");
  });

  it("selisih negatif (entri lebih baru dari halaman dibuka) dibaca baru saja", () => {
    expect(formatActivityTime(ago(-10 * MINUTE), now)).toBe("Baru saja");
  });

  it("lebih dari seminggu ditulis sebagai tanggal lokal", () => {
    expect(formatActivityTime(ago(10 * DAY), now)).toBe("27 Sep 2026");
  });

  it("timestamp tak valid ditulis '-'", () => {
    expect(formatActivityTime("bukan tanggal", now)).toBe("-");
  });
});