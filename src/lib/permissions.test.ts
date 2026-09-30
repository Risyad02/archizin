import { describe, it, expect } from "vitest";
import { ACTIONS, can, assertCan, PermissionError } from "./permissions";
import type { Action, Role } from "./permissions";

const ROLES: Role[] = ["ADMIN", "OPERATOR", "VIEWER"];

const expected: Record<Action, Role[]> = {
  "record:read": ["ADMIN", "OPERATOR", "VIEWER"],
  "record:export": ["ADMIN", "OPERATOR", "VIEWER"],
  "document:open": ["ADMIN", "OPERATOR", "VIEWER"],
  "record:create": ["ADMIN", "OPERATOR"],
  "record:update": ["ADMIN", "OPERATOR"],
  "record:delete": ["ADMIN", "OPERATOR"],
  "document:add": ["ADMIN", "OPERATOR"],
  "document:remove": ["ADMIN", "OPERATOR"],
  "document:validate": ["ADMIN", "OPERATOR"],
  "permit_type:manage": ["ADMIN", "OPERATOR"],
  "custom_field:manage": ["ADMIN", "OPERATOR"],
  "import:run": ["ADMIN", "OPERATOR"],
  "audit:view": ["ADMIN", "OPERATOR"],
  "user:manage": ["ADMIN"],
  "backup:manage": ["ADMIN"],
};

describe("matriks izin role", () => {
  it.each(ACTIONS)("%s sesuai matriks yang disepakati", (action) => {
    for (const role of ROLES) {
      expect(can(role, action), `${role} untuk ${action}`).toBe(expected[action].includes(role));
    }
  });

  it("ADMIN boleh semua aksi", () => {
    for (const action of ACTIONS) {
      expect(can("ADMIN", action)).toBe(true);
    }
  });

  it("VIEWER hanya boleh melihat, export, dan membuka dokumen", () => {
    const boleh = ACTIONS.filter((a) => can("VIEWER", a));
    expect(boleh.sort()).toEqual(["document:open", "record:export", "record:read"]);
  });

  it("OPERATOR tidak boleh kelola pengguna dan backup", () => {
    expect(can("OPERATOR", "user:manage")).toBe(false);
    expect(can("OPERATOR", "backup:manage")).toBe(false);
  });

  it("tanpa role (belum login) ditolak untuk semua aksi", () => {
    for (const action of ACTIONS) {
      expect(can(null, action)).toBe(false);
      expect(can(undefined, action)).toBe(false);
    }
  });
});

describe("assertCan", () => {
  it("tidak melempar error bila diizinkan", () => {
    expect(() => assertCan("OPERATOR", "record:delete")).not.toThrow();
  });

  it("melempar PermissionError bila ditolak, dengan aksi yang dituju", () => {
    try {
      assertCan("VIEWER", "record:delete");
      expect.unreachable("seharusnya melempar error");
    } catch (err) {
      expect(err).toBeInstanceOf(PermissionError);
      expect((err as PermissionError).action).toBe("record:delete");
    }
  });
});