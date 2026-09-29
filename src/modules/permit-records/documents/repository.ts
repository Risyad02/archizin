import { getDb } from "../../../database/db";
import type { DocumentLink } from "./types";

export async function listDocumentLinks(permitRecordId: number): Promise<DocumentLink[]> {
  const db = await getDb();
  return db.select<DocumentLink[]>(
    `SELECT id, permit_record_id, url, link_type, last_checked_at, status
     FROM document_links
     WHERE permit_record_id = $1
     ORDER BY id DESC`,
    [permitRecordId]
  );
}

export async function createDocumentLink(params: {
  permitRecordId: number;
  url: string;
  linkType: DocumentLink["link_type"];
  status: DocumentLink["status"];
}): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO document_links (permit_record_id, url, link_type, status, last_checked_at)
     VALUES ($1, $2, $3, $4, datetime('now'))`,
    [params.permitRecordId, params.url, params.linkType, params.status]
  );
}

export async function deleteDocumentLink(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM document_links WHERE id = $1", [id]);
}

export async function getDocumentLinkById(id: number): Promise<DocumentLink | null> {
  const db = await getDb();
  const rows = await db.select<DocumentLink[]>(
    `SELECT id, permit_record_id, url, link_type, last_checked_at, status
     FROM document_links WHERE id = $1`,
    [id]
  );
  return rows[0] ?? null;
}