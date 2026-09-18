import { describe, it, expect } from "vitest";
import { validateUsername, validatePassword } from "./service";

describe("validateUsername", () => {
  it("menolak username kurang dari 3 karakter", () => {
    expect(validateUsername("ab")).not.toBeNull();
  });
  it("menerima username valid", () => {
    expect(validateUsername("admin_1")).toBeNull();
  });
  it("menolak karakter aneh", () => {
    expect(validateUsername("admin!!")).not.toBeNull();
  });
});

describe("validatePassword", () => {
  it("menolak password kurang dari 8 karakter", () => {
    expect(validatePassword("abc123")).not.toBeNull();
  });
  it("menerima password valid", () => {
    expect(validatePassword("passwordkuat")).toBeNull();
  });
});