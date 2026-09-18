import { invoke } from "@tauri-apps/api/core";
import * as repo from "./repository";
import type { AuthUser } from "./types";

export function validateUsername(username: string): string | null {
  if (username.trim().length < 3) return "Username minimal 3 karakter";
  if (!/^[a-zA-Z0-9_.]+$/.test(username)) return "Username hanya boleh huruf, angka, titik, underscore";
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) return "Password minimal 8 karakter";
  return null;
}

export async function needsInitialSetup(): Promise<boolean> {
  const total = await repo.countUsers();
  return total === 0;
}

export async function createFirstAdmin(params: {
  username: string;
  password: string;
  fullName: string;
}): Promise<void> {
  const usernameError = validateUsername(params.username);
  if (usernameError) throw new Error(usernameError);
  const passwordError = validatePassword(params.password);
  if (passwordError) throw new Error(passwordError);

  const passwordHash = await invoke<string>("hash_password", { password: params.password });
  const roleId = await repo.getRoleIdByCode("ADMIN");
  await repo.createUser({
    username: params.username,
    passwordHash,
    fullName: params.fullName,
    roleId,
  });
}

export async function login(username: string, password: string): Promise<AuthUser> {
  const user = await repo.findUserByUsername(username);
  if (!user) throw new Error("Username atau password salah");

  const valid = await invoke<boolean>("verify_password", {
    password,
    hash: user.password_hash,
  });
  if (!valid) throw new Error("Username atau password salah");

  return {
    id: user.id,
    username: user.username,
    full_name: user.full_name,
    role: user.role_code,
  };
}