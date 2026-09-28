import * as repository from "./repository";
import type { StorageSettings, StorageSetupInput } from "./types";
import type { FolderTemplate } from "./types";

export async function getStorageSettings(): Promise<StorageSettings | null> {
  return repository.getStorageSettings();
}

export async function needsStorageSetup(): Promise<boolean> {
  const settings = await repository.getStorageSettings();
  return !settings || !settings.storageRoot;
}

export async function getActiveFolderTemplate(): Promise<FolderTemplate | null> {
  const settings = await repository.getStorageSettings();
  if (!settings?.activeFolderTemplateId) {
    return repository.getDefaultFolderTemplate();
  }
  return repository.getFolderTemplateById(settings.activeFolderTemplateId);
}

export async function setupStorage(input: StorageSetupInput): Promise<StorageSettings> {
  const trimmedRoot = input.storageRoot.trim();
  if (!trimmedRoot) {
    throw new Error("Lokasi penyimpanan wajib diisi");
  }

  const defaultTemplate = await repository.getDefaultFolderTemplate();
  if (!defaultTemplate) {
    throw new Error("Template folder default belum tersedia. Pastikan migration 0002 sudah jalan.");
  }

  return repository.upsertStorageSettings({
    storageRoot: trimmedRoot,
    backupRoot: input.backupRoot?.trim() || null,
    activeFolderTemplateId: defaultTemplate.id,
  });
}