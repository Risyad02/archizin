import { getDb } from "../../database/db";
import type { User } from "./types";

export async function countUsers(): Promise<number> {
  const db = await getDb();
  const rows = await db.select<{ count: number }[]>("SELECT COUNT(*) as count FROM users");
  return rows[0]?.count ?? 0;
}

export async function findUserByUsername(username: string): Promise<User | null> {
  const db = await getDb();
  const rows = await db.select<User[]>(
    `SELECT u.id, u.username, u.password_hash, u.full_name, u.role_id, r.name as role_code, u.is_active
     FROM users u JOIN roles r ON r.id = u.role_id
     WHERE u.username = $1 AND u.is_active = 1`,
    [username]
  );
  return rows[0] ?? null;
}

export async function getRoleIdByCode(code: string): Promise<number> {
  const db = await getDb();
  const rows = await db.select<{ id: number }[]>("SELECT id FROM roles WHERE name = $1", [code]);
  if (!rows[0]) throw new Error(`Role ${code} tidak ditemukan di database`);
  return rows[0].id;
}

export async function createUser(params: {
  username: string;
  passwordHash: string;
  fullName: string;
  roleId: number;
}): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO users (username, password_hash, full_name, role_id, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, 1, datetime('now'), datetime('now'))`,
    [params.username, params.passwordHash, params.fullName, params.roleId]
  );
}