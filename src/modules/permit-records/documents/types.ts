export interface DocumentLink {
  id: number;
  permit_record_id: number;
  url: string;
  link_type: "local" | "network" | "http" | "gdrive" | "sharepoint";
  last_checked_at: string | null;
  status: "valid" | "not_found" | "unreachable" | "unchecked" | "needs_auth";
}