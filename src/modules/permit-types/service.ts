import * as repo from "./repository";
import type { PermitType } from "./types";
import { assertCan } from "../../lib/permissions";
import type { AuthUser } from "../auth/types";
import { logAudit } from "../../lib/audit";

export function validateCode(code: string): string | null {
  if (!/^[A-Z0-9_]{2,20}$/.test(code)) {
    return "Kode harus huruf kapital/angka/underscore, 2-20 karakter (contoh: PBG, IZIN_PENELITIAN)";
  }
  return null;
}

export function validateName(name: string): string | null {
  if (name.trim().length < 3) return "Nama jenis izin minimal 3 karakter";
  return null;
}

export async function getActivePermitTypes(): Promise<PermitType[]> {
  return repo.listPermitTypes(false);
}

export async function createPermitType(
  params: { code: string; name: string; description: string },
  actor: AuthUser
): Promise<void> {
  assertCan(actor.role, "permit_type:manage");

  const codeError = validateCode(params.code);
  if (codeError) throw new Error(codeError);
  const nameError = validateName(params.name);
  if (nameError) throw new Error(nameError);

  const existing = await repo.findPermitTypeByCode(params.code);
  if (existing) throw new Error(`Kode "${params.code}" sudah dipakai jenis izin lain`);

  await repo.createPermitType({
    code: params.code.toUpperCase(),
    name: params.name.trim(),
    description: params.description.trim() || null,
  });

  const created = await repo.findPermitTypeByCode(params.code.toUpperCase());
  await logAudit({
    userId: actor.id,
    action: "CREATE",
    entity: "permit_types",
    recordId: created?.id ?? null,
    oldValue: null,
    newValue: { code: params.code, name: params.name, description: params.description },
  });
}