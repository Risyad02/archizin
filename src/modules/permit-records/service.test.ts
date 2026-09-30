import { describe, it, expect } from "vitest";
import { validateCoreFields, createRecordFolderManually } from "./service";
import type { PermitRecordFormInput } from "./types";
import { createPermitRecord, updatePermitRecord, deletePermitRecord } from "./service";
import { PermissionError } from "../../lib/permissions";
import type { AuthUser } from "../auth/types";

const viewer: AuthUser = { id: 1, username: "v", full_name: "Viewer", role: "VIEWER" };

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

describe("permit-records — permission", () => {
  it("createPermitRecord menolak VIEWER", async () => {
    await expect(createPermitRecord(baseInput(), viewer)).rejects.toBeInstanceOf(PermissionError);
  });
  it("updatePermitRecord menolak VIEWER", async () => {
    await expect(updatePermitRecord(1, baseInput(), viewer)).rejects.toBeInstanceOf(PermissionError);
  });
  it("deletePermitRecord menolak VIEWER", async () => {
    await expect(deletePermitRecord(1, viewer)).rejects.toBeInstanceOf(PermissionError);
  });
});

describe("createRecordFolderManually — permission", () => {
  it("menolak VIEWER", async () => {
    await expect(createRecordFolderManually(1, viewer)).rejects.toBeInstanceOf(PermissionError);
  });
});