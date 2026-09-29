import { describe, it, expect } from "vitest";
import { validateFieldKey, isValidFieldType } from "./service";
import { addField } from "./service";
import { PermissionError } from "../../lib/permissions";
import type { AuthUser } from "../auth/types";

const viewer: AuthUser = { id: 1, username: "v", full_name: "Viewer", role: "VIEWER" };

describe("validateFieldKey", () => {
  it("menerima key valid", () => expect(validateFieldKey("npsn")).toBeNull());
  it("menolak huruf kapital", () => expect(validateFieldKey("NPSN")).not.toBeNull());
  it("menolak diawali angka", () => expect(validateFieldKey("1npsn")).not.toBeNull());
});

describe("isValidFieldType", () => {
  it("menerima tipe yang dikenal", () => expect(isValidFieldType("select")).toBe(true));
  it("menolak tipe tidak dikenal", () => expect(isValidFieldType("wysiwyg")).toBe(false));
});

describe("addField — permission", () => {
  it("menolak VIEWER sebelum validasi lain dijalankan", async () => {
    await expect(
      addField(
        { permitTypeId: 1, fieldKey: "", label: "", fieldType: "text", isRequired: false },
        viewer
      )
    ).rejects.toBeInstanceOf(PermissionError);
  });
});