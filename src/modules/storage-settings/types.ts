export interface FolderTemplate {
  id: number;
  name: string;
  pattern: string;
  isDefault: boolean;
  isActive: boolean;
}

export interface StorageSettings {
  id: number;
  storageRoot: string | null;
  backupRoot: string | null;
  activeFolderTemplateId: number | null;
}

export interface StorageSetupInput {
  storageRoot: string;
  backupRoot?: string | null;
}