import { describe, it, expect } from "vitest";
import { validateCode, validateName } from "./service";
import { createPermitType } from "./service";
import { PermissionError } from "../../lib/permissions";
import type { AuthUser } from "../auth/types";

const viewer: AuthUser = { id: 1, username: "v", full_name: "Viewer", role: "VIEWER" };

describe("validateCode", () => {
  it("menerima kode valid", () => expect(validateCode("PBG")).toBeNull());
  it("menolak huruf kecil", () => expect(validateCode("pbg")).not.toBeNull());
  it("menolak spasi", () => expect(validateCode("PBG BARU")).not.toBeNull());
});

describe("validateName", () => {
  it("menolak nama terlalu pendek", () => expect(validateName("Ab")).not.toBeNull());
  it("menerima nama valid", () => expect(validateName("Persetujuan Bangunan Gedung")).toBeNull());
});

describe("createPermitType — permission", () => {
  it("menolak VIEWER sebelum validasi lain dijalankan", async () => {
    await expect(
      createPermitType({ code: "", name: "", description: "" }, viewer)
    ).rejects.toBeInstanceOf(PermissionError);
  });
});