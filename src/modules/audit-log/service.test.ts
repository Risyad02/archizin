import { describe, it, expect } from "vitest";
import { getRecentAuditLogs } from "./service";
import { PermissionError } from "../../lib/permissions";
import type { AuthUser } from "../auth/types";

const viewer: AuthUser = { id: 1, username: "v", full_name: "Viewer", role: "VIEWER" };

describe("getRecentAuditLogs — permission", () => {
  it("menolak VIEWER", async () => {
    await expect(getRecentAuditLogs(viewer)).rejects.toBeInstanceOf(PermissionError);
  });
});