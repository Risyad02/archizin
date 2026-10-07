import { describe, it, expect } from "vitest";
import { buildArchiveHealthItems } from "./archiveHealth";
import type { ArchiveHealthCounts } from "./types";

function counts(overrides: Partial<ArchiveHealthCounts> = {}): ArchiveHealthCounts {
  return {
    totalRecords: 20,
    withoutDocuments: 0,
    withoutFolder: 0,
    totalDocuments: 10,
    documentsNotFound: 0,
    recordsWithMissingDocuments: 0,
    documentsUnchecked: 0,
    ...overrides,
  };
}

describe("buildArchiveHealthItems", () => {
  it("arsip lengkap: tidak ada item", () => {
    expect(buildArchiveHealthItems(counts())).toEqual([]);
  });

  it("hanya item bernilai > 0 yang muncul, dengan masalah lebih dulu dari kelengkapan", () => {
    const items = buildArchiveHealthItems(
      counts({
        withoutDocuments: 11,
        withoutFolder: 11,
        documentsNotFound: 2,
        recordsWithMissingDocuments: 2,
        documentsUnchecked: 1,
      })
    );

    expect(items.map((i) => [i.key, i.value, i.of, i.severity])).toEqual([
      ["documentsNotFound", 2, 10, "problem"],
      ["withoutFolder", 11, 20, "problem"],
      ["withoutDocuments", 11, 20, "info"],
      ["documentsUnchecked", 1, 10, "info"],
    ]);
    expect(items[0]?.note).toBe("2 izin terdampak");
  });

  it("satu item saja: item lain tidak ikut tampil", () => {
    const items = buildArchiveHealthItems(counts({ withoutDocuments: 3 }));
    expect(items.map((i) => i.key)).toEqual(["withoutDocuments"]);
  });
});