import { describe, it, expect } from "vitest";
import { validateCoreFields } from "./service";
import type { PermitRecordFormInput } from "./types";

function baseInput(overrides: Partial<PermitRecordFormInput> = {}): PermitRecordFormInput {
  return {
    permitTypeId: 1,
    nomorIzin: "001/PBG/2026",
    namaPemohon: "Budi Santoso",
    namaUsaha: "",
    tanggalDokumen: null,
    tanggalTerbit: "2026-01-10",
    tanggalMulaiBerlaku: null,
    tanggalBerakhir: "2027-01-10",
    statusId: 1,
    keterangan: "",
    customFieldValues: {},
    ...overrides,
  };
}

describe("validateCoreFields", () => {
  it("menerima input valid", () => {
    expect(validateCoreFields(baseInput())).toBeNull();
  });
  it("menolak nomor izin kosong", () => {
    expect(validateCoreFields(baseInput({ nomorIzin: "" }))).not.toBeNull();
  });
  it("menolak tanggal berakhir sebelum tanggal terbit", () => {
    expect(
      validateCoreFields(baseInput({ tanggalTerbit: "2026-06-01", tanggalBerakhir: "2026-01-01" }))
    ).not.toBeNull();
  });
});