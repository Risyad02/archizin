import { getDb } from "../../database/db";
import type { PermitType } from "./types";

export async function listPermitTypes(includeInactive = false): Promise<PermitType[]> {
  const db = await getDb();
  const where = includeInactive ? "" : "WHERE is_active = 1";
  return db.select<PermitType[]>(
    `SELECT id, code, name, description, is_active FROM permit_types ${where} ORDER BY name`
  );
}

export async function findPermitTypeByCode(code: string): Promise<PermitType | null> {
  const db = await getDb();
  const rows = await db.select<PermitType[]>(
    "SELECT id, code, name, description, is_active FROM permit_types WHERE code = $1",
    [code]
  );
  return rows[0] ?? null;
}

export async function createPermitType(params: {
  code: string;
  name: string;
  description: string | null;
}): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO permit_types (code, name, description, is_active, created_at)
     VALUES ($1, $2, $3, 1, datetime('now'))`,
    [params.code, params.name, params.description]
  );
}

export async function updatePermitType(
  id: number,
  params: { name: string; description: string | null }
): Promise<void> {
  const db = await getDb();
  await db.execute(
    "UPDATE permit_types SET name = $1, description = $2 WHERE id = $3",
    [params.name, params.description, id]
  );
}

export async function setPermitTypeActive(id: number, isActive: boolean): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE permit_types SET is_active = $1 WHERE id = $2", [isActive ? 1 : 0, id]);
}