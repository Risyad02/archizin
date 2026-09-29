import * as repo from "./repository";
import { copyFileWithDedup, grantFileScope } from "../../../lib/filesystem";
import { assertCan } from "../../../lib/permissions";
import type { AuthUser } from "../../auth/types";
import type { DocumentLink } from "./types";
import { logAudit } from "../../../lib/audit";
import { openInDefaultApp, assertPathWithinRoot } from "../../../lib/filesystem";

export async function getDocumentsForRecord(recordId: number): Promise<DocumentLink[]> {
  return repo.listDocumentLinks(recordId);
}

export async function addDocumentFromFile(
  recordId: number,
  folderPath: string,
  sourceFilePath: string,
  actor: AuthUser
): Promise<void> {
  assertCan(actor.role, "document:add");

  await grantFileScope(sourceFilePath);

  const originalFileName = sourceFilePath.split(/[\\/]/).pop() ?? "dokumen";
  const { finalPath } = await copyFileWithDedup(sourceFilePath, folderPath, originalFileName);

  await repo.createDocumentLink({
    permitRecordId: recordId,
    url: finalPath,
    linkType: "local",
    status: "valid",
  });

  const links = await repo.listDocumentLinks(recordId); // sudah ORDER BY id DESC
  await logAudit({
    userId: actor.id,
    action: "CREATE",
    entity: "document_links",
    recordId: links[0]?.id ?? null,
    oldValue: null,
    newValue: { permitRecordId: recordId, url: finalPath },
  });
}

export async function removeDocumentLink(id: number, actor: AuthUser): Promise<void> {
  assertCan(actor.role, "document:remove");

  const before = await repo.getDocumentLinkById(id);
  await repo.deleteDocumentLink(id);

  await logAudit({
    userId: actor.id,
    action: "DELETE",
    entity: "document_links",
    recordId: id,
    oldValue: before,
    newValue: null,
  });
}

export async function openDocumentFile(
  doc: DocumentLink,
  storageRoot: string,
  actor: AuthUser
): Promise<void> {
  assertCan(actor.role, "document:open");

  if (doc.link_type !== "local") {
    throw new Error(`Membuka dokumen bertipe "${doc.link_type}" belum didukung`);
  }

  assertPathWithinRoot(doc.url, storageRoot);
  await openInDefaultApp(doc.url);
}