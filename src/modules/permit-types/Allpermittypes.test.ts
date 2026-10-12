import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("./repository", () => ({
  listPermitTypes: vi.fn(),
  findPermitTypeByCode: vi.fn(),
  createPermitType: vi.fn(),
}));
vi.mock("../../lib/audit", () => ({
  logAudit: vi.fn(),
}));

import * as repo from "./repository";
import { getActivePermitTypes, getAllPermitTypes } from "./service";

const types = [
  { id: 1, code: "IMB", name: "IMB", description: null, is_active: 1 },
  { id: 2, code: "LAMA", name: "Lama", description: null, is_active: 0 },
];

beforeEach(() => {
  vi.mocked(repo.listPermitTypes).mockResolvedValue(types as never);
});

afterEach(() => {
  vi.resetAllMocks();
});

describe("getAllPermitTypes", () => {
  it("meminta repository menyertakan jenis izin nonaktif dan mengembalikan hasilnya apa adanya", async () => {
    const result = await getAllPermitTypes();
    expect(repo.listPermitTypes).toHaveBeenCalledTimes(1);
    expect(repo.listPermitTypes).toHaveBeenCalledWith(true);
    expect(result).toEqual(types);
  });

  it("getActivePermitTypes tetap hanya meminta yang aktif", async () => {
    await getActivePermitTypes();
    expect(repo.listPermitTypes).toHaveBeenCalledWith(false);
  });
});