import { describe, it, expect } from "vitest";
import { validateCode, validateName } from "./service";

describe("validateCode", () => {
  it("menerima kode valid", () => expect(validateCode("PBG")).toBeNull());
  it("menolak huruf kecil", () => expect(validateCode("pbg")).not.toBeNull());
  it("menolak spasi", () => expect(validateCode("PBG BARU")).not.toBeNull());
});

describe("validateName", () => {
  it("menolak nama terlalu pendek", () => expect(validateName("Ab")).not.toBeNull());
  it("menerima nama valid", () => expect(validateName("Persetujuan Bangunan Gedung")).toBeNull());
});