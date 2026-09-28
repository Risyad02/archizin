import { getDb } from "../../database/db";
import type { StorageSettings, FolderTemplate } from "./types";

interface StorageSettingsRow {
  id: number;
  storage_root: string | null;
  backup_root: string | null;
  active_folder_template_id: number | null;
}

interface FolderTemplateRow {
  id: number;
  name: string;
  pattern: string;
  is_default: number;
  is_active: number;
}

function mapStorageSettings(row: StorageSettingsRow): StorageSettings {
  return {
    id: row.id,
    storageRoot: row.storage_root,
    backupRoot: row.backup_root,
    activeFolderTemplateId: row.active_folder_template_id,
  };
}

function mapFolderTemplate(row: FolderTemplateRow): FolderTemplate {
  return {
    id: row.id,
    name: row.name,
    pattern: row.pattern,
    isDefault: row.is_default === 1,
    isActive: row.is_active === 1,
  };
}

export async function getStorageSettings(): Promise<StorageSettings | null> {
  const db = await getDb();
  const rows = await db.select<StorageSettingsRow[]>(
    "SELECT id, storage_root, backup_root, active_folder_template_id FROM storage_settings ORDER BY id ASC LIMIT 1"
  );
  return rows.length > 0 ? mapStorageSettings(rows[0]) : null;
}

export async function getDefaultFolderTemplate(): Promise<FolderTemplate | null> {
  const db = await getDb();
  const rows = await db.select<FolderTemplateRow[]>(
    "SELECT id, name, pattern, is_default, is_active FROM folder_templates WHERE is_default = 1 AND is_active = 1 LIMIT 1"
  );
  return rows.length > 0 ? mapFolderTemplate(rows[0]) : null;
}

export async function getFolderTemplateById(id: number): Promise<FolderTemplate | null> {
  const db = await getDb();
  const rows = await db.select<FolderTemplateRow[]>(
    "SELECT id, name, pattern, is_default, is_active FROM folder_templates WHERE id = $1",
    [id]
  );
  return rows.length > 0 ? mapFolderTemplate(rows[0]) : null;
}

export async function upsertStorageSettings(input: {
  storageRoot: string;
  backupRoot: string | null;
  activeFolderTemplateId: number;
}): Promise<StorageSettings> {
  const db = await getDb();
  const existing = await getStorageSettings();

  if (existing) {
    await db.execute(
      "UPDATE storage_settings SET storage_root = $1, backup_root = $2, active_folder_template_id = $3 WHERE id = $4",
      [input.storageRoot, input.backupRoot, input.activeFolderTemplateId, existing.id]
    );
    return {
      ...existing,
      storageRoot: input.storageRoot,
      backupRoot: input.backupRoot,
      activeFolderTemplateId: input.activeFolderTemplateId,
    };
  }

  await db.execute(
    "INSERT INTO storage_settings (storage_root, backup_root, active_folder_template_id) VALUES ($1, $2, $3)",
    [input.storageRoot, input.backupRoot, input.activeFolderTemplateId]
  );

  const created = await getStorageSettings();
  if (!created) {
    throw new Error("Gagal menyimpan pengaturan penyimpanan");
  }
  return created;
}