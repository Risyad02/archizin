// src/lib/filesystem.test.ts
import { describe, it, expect } from "vitest";
import { sanitizeForFolderName, resolveFolderPattern, assertPathWithinRoot } from "./filesystem";

describe("sanitizeForFolderName", () => {
  it("membiarkan nama yang sudah aman apa adanya", () => {
    expect(sanitizeForFolderName("PT Contoh Sejahtera")).toBe("PT Contoh Sejahtera");
  });

  it("mengganti setiap karakter ilegal Windows dengan underscore", () => {
    expect(sanitizeForFolderName('A\\B/C:D*E?F"G<H>I|J')).toBe("A_B_C_D_E_F_G_H_I_J");
  });

  it("menghapus titik di akhir string", () => {
    expect(sanitizeForFolderName("PT Contoh...")).toBe("PT Contoh");
  });

  it("menghapus spasi di akhir string", () => {
    expect(sanitizeForFolderName("PT Contoh   ")).toBe("PT Contoh");
  });

  it("menghapus kombinasi titik dan spasi berselang-seling di akhir", () => {
    expect(sanitizeForFolderName("PT Contoh . . ")).toBe("PT Contoh");
  });

  it("tidak menghapus titik/spasi di TENGAH string, hanya di akhir", () => {
    expect(sanitizeForFolderName("PT. Contoh Sejahtera")).toBe("PT. Contoh Sejahtera");
  });

  it("memangkas spasi di awal/akhir sebelum sanitasi lain", () => {
    expect(sanitizeForFolderName("   PT Contoh   ")).toBe("PT Contoh");
  });

  it("fallback ke 'tanpa_nama' kalau hasil akhirnya kosong", () => {
    expect(sanitizeForFolderName("   ")).toBe("tanpa_nama");
  });

  it("fallback ke 'tanpa_nama' kalau isinya cuma karakter ilegal lalu titik/spasi", () => {
    // "***" -> "___" (bukan kosong, jadi ini bukan kasus fallback - cek terpisah di bawah)
    expect(sanitizeForFolderName("***")).toBe("___");
  });

  it("fallback ke 'tanpa_nama' kalau isinya cuma titik dan spasi", () => {
    expect(sanitizeForFolderName(". . .")).toBe("tanpa_nama");
  });
});

describe("resolveFolderPattern", () => {
  const baseData = {
    kodeJenisIzin: "SIUP",
    tahun: 2026,
    nomorIzin: "001/2026",
    namaPemohon: "PT Contoh Sejahtera",
  };

  it("mengisi semua placeholder dan memecah jadi segmen per '/'", () => {
    const result = resolveFolderPattern(
      "{kode_jenis_izin}/{tahun}/{nomor_izin}_{nama_pemohon}",
      baseData
    );
    expect(result).toEqual(["SIUP", "2026", "001_2026_PT Contoh Sejahtera"]);
  });

  it("mengonversi tahun bertipe number jadi string dengan benar", () => {
    const result = resolveFolderPattern("{tahun}", baseData);
    expect(result).toEqual(["2026"]);
  });

  it("menerima tahun bertipe string juga", () => {
    const result = resolveFolderPattern("{tahun}", { ...baseData, tahun: "2025" });
    expect(result).toEqual(["2025"]);
  });

  it("mensanitasi karakter ilegal yang berasal dari data (bukan dari template)", () => {
    const result = resolveFolderPattern("{nomor_izin}_{nama_pemohon}", {
        ...baseData,
        nomorIzin: "001/IX/2026",
        namaPemohon: 'PT "Contoh" Sejahtera',
    });
    expect(result).toEqual(["001_IX_2026_PT _Contoh_ Sejahtera"]);
  });

  it("mengabaikan segmen kosong (misal pattern diawali/diakhiri '/')", () => {
    const result = resolveFolderPattern("/{kode_jenis_izin}//{tahun}/", baseData);
    expect(result).toEqual(["SIUP", "2026"]);
  });

  it("melempar error kalau ada placeholder yang tidak dikenal", () => {
    expect(() => resolveFolderPattern("{tidak_dikenal}", baseData)).toThrow(
      "Placeholder tidak dikenal di pola folder: {tidak_dikenal}"
    );
  });

  it("mendukung pattern satu segmen tanpa '/'", () => {
    const result = resolveFolderPattern("{kode_jenis_izin}_{tahun}", baseData);
    expect(result).toEqual(["SIUP_2026"]);
  });
});

describe("assertPathWithinRoot", () => {
  const root = "C:\\ArchizinArsip";

  it("menerima path yang persis sama dengan root", () => {
    expect(() => assertPathWithinRoot(root, root)).not.toThrow();
  });

  it("menerima subfolder di dalam root", () => {
    expect(() =>
      assertPathWithinRoot("C:\\ArchizinArsip\\PBG\\2026\\001_Budi\\scan.pdf", root)
    ).not.toThrow();
  });

  it("menolak path yang keluar lewat traversal ..", () => {
    expect(() =>
      assertPathWithinRoot("C:\\ArchizinArsip\\PBG\\..\\..\\Windows\\System32", root)
    ).toThrow();
  });

  it("menolak path yang sama sekali di luar root", () => {
    expect(() => assertPathWithinRoot("C:\\Users\\budi\\Desktop\\rahasia.txt", root)).toThrow();
  });

  it("menolak folder sibling yang namanya diawali nama root (jebakan startsWith naif)", () => {
    expect(() => assertPathWithinRoot("C:\\ArchizinArsipXtra\\file.txt", root)).toThrow();
  });

  it("perbandingan tidak case-sensitive", () => {
    expect(() =>
      assertPathWithinRoot("c:\\archizinarsip\\PBG\\file.pdf", root)
    ).not.toThrow();
  });

  it("menerima campuran pemisah / dan \\\\", () => {
    expect(() => assertPathWithinRoot("C:/ArchizinArsip/PBG/file.pdf", root)).not.toThrow();
  });
});