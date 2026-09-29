import type { AuthUser } from "../modules/auth/types";

export type Role = AuthUser["role"];

/**
 * Daftar semua aksi yang dikenai aturan role. Sebagian belum dipakai karena
 * fiturnya belum ada (import, audit:view, user:manage, backup:manage), tapi
 * keputusan izinnya sudah ditetapkan sehingga dicatat di sini.
 */
export const ACTIONS = [
  "record:read",
  "record:export",
  "document:open",
  "record:create",
  "record:update",
  "record:delete",
  "document:add",
  "document:remove",
  "permit_type:manage",
  "custom_field:manage",
  "import:run",
  "audit:view",
  "user:manage",
  "backup:manage",
] as const;

export type Action = (typeof ACTIONS)[number];

const SEMUA: readonly Role[] = ["ADMIN", "OPERATOR", "VIEWER"];
const STAF: readonly Role[] = ["ADMIN", "OPERATOR"];
const HANYA_ADMIN: readonly Role[] = ["ADMIN"];

/** Satu-satunya tempat aturan role didefinisikan. UI dan service sama-sama membaca dari sini. */
export const PERMISSION_MATRIX: Record<Action, readonly Role[]> = {
  "record:read": SEMUA,
  "record:export": SEMUA,
  "document:open": SEMUA,
  "record:create": STAF,
  "record:update": STAF,
  "record:delete": STAF,
  "document:add": STAF,
  "document:remove": STAF,
  "permit_type:manage": STAF,
  "custom_field:manage": STAF,
  "import:run": STAF,
  "audit:view": STAF,
  "user:manage": HANYA_ADMIN,
  "backup:manage": HANYA_ADMIN,
};

export function can(role: Role | null | undefined, action: Action): boolean {
  if (!role) return false;
  return PERMISSION_MATRIX[action].includes(role);
}

export class PermissionError extends Error {
  readonly action: Action;

  constructor(action: Action) {
    super("Anda tidak punya izin untuk melakukan aksi ini");
    this.name = "PermissionError";
    this.action = action;
  }
}

/** Dipanggil di baris pertama fungsi service yang mengubah data (mulai 6.1b). */
export function assertCan(role: Role | null | undefined, action: Action): void {
  if (!can(role, action)) throw new PermissionError(action);
}