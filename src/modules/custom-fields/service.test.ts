import { describe, it, expect } from "vitest";
import { validateFieldKey, isValidFieldType } from "./service";

describe("validateFieldKey", () => {
  it("menerima key valid", () => expect(validateFieldKey("npsn")).toBeNull());
  it("menolak huruf kapital", () => expect(validateFieldKey("NPSN")).not.toBeNull());
  it("menolak diawali angka", () => expect(validateFieldKey("1npsn")).not.toBeNull());
});

describe("isValidFieldType", () => {
  it("menerima tipe yang dikenal", () => expect(isValidFieldType("select")).toBe(true));
  it("menolak tipe tidak dikenal", () => expect(isValidFieldType("wysiwyg")).toBe(false));
});