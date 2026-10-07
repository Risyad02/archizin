import { describe, it, expect } from "vitest";
import { deriveTahunBulan, daysUntil } from "./dateHelpers";

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** Tanggal lokal "hari ini + offsetDays" dalam format YYYY-MM-DD (tanpa toISOString, yang memakai UTC). */
function localDateString(offsetDays: number): string {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offsetDays);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// getTimezoneOffset() bernilai negatif di timur UTC: UTC+7 (WIB) = -420, UTC+9 (WIT) = -540.
const offsetMenit = new Date().getTimezoneOffset();
const diZonaIndonesia = offsetMenit <= -420 && offsetMenit >= -540;

describe("deriveTahunBulan", () => {
  it("memecah YYYY-MM-DD menjadi tahun dan bulan berupa angka (nol di depan hilang)", () => {
    expect(deriveTahunBulan("2026-10-07")).toEqual({ tahun: 2026, bulan: 10 });
    expect(deriveTahunBulan("2026-01-05")).toEqual({ tahun: 2026, bulan: 1 });
    expect(deriveTahunBulan("2027-12-31")).toEqual({ tahun: 2027, bulan: 12 });
  });

  it("tanggal kosong (null atau string kosong) menghasilkan tahun dan bulan null", () => {
    expect(deriveTahunBulan(null)).toEqual({ tahun: null, bulan: null });
    expect(deriveTahunBulan("")).toEqual({ tahun: null, bulan: null });
  });
});

describe("daysUntil", () => {
  it("tanpa tanggal menghasilkan null", () => {
    expect(daysUntil(null)).toBeNull();
    expect(daysUntil("")).toBeNull();
  });

  it("selisih antar-hari konsisten di zona waktu mana pun, termasuk lintas bulan dan tahun", () => {
    // Dibandingkan terhadap "hari ini" yang dihitung dengan fungsi yang sama, sehingga
    // pergeseran konstan akibat zona waktu saling menghapus. Nilai absolut diuji terpisah.
    const hariIni = daysUntil(localDateString(0));
    expect(hariIni).not.toBeNull();
    for (const offset of [-400, -40, -1, 1, 7, 90, 400]) {
      const hasil = daysUntil(localDateString(offset));
      expect(hasil === null ? null : hasil - (hariIni as number)).toBe(offset);
    }
  });

  it("selalu bilangan bulat", () => {
    for (const offset of [-3, 0, 5, 30]) {
      expect(Number.isInteger(daysUntil(localDateString(offset)))).toBe(true);
    }
  });

  // Nilai absolut hanya terjamin di UTC+7..+9 (target pengguna: Indonesia) — lihat utang #22.
  // Di zona lain test ini dilewati (tercatat "skipped"), bukan diam-diam lulus.
  it.skipIf(!diZonaIndonesia)("di zona Indonesia: hari ini = 0, besok = 1, kemarin = -1, 90 hari lagi = 90", () => {
    expect(daysUntil(localDateString(0))).toBe(0);
    expect(daysUntil(localDateString(1))).toBe(1);
    expect(daysUntil(localDateString(-1))).toBe(-1);
    expect(daysUntil(localDateString(90))).toBe(90);
  });
});