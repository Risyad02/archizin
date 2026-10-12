import { describe, it, expect } from "vitest";
import { shortPeriodLabel } from "./periodLabels";
import { periodsForYear } from "./periods";

describe("shortPeriodLabel", () => {
  it("bulan disingkat tiga huruf sesuai singkatan Indonesia", () => {
    const labels = periodsForYear(2026, "month").map((p) => shortPeriodLabel(p, "month"));
    expect(labels).toEqual([
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "Mei",
      "Jun",
      "Jul",
      "Agu",
      "Sep",
      "Okt",
      "Nov",
      "Des",
    ]);
  });

  it("triwulan, semester, dan tahun memakai label penuh", () => {
    expect(shortPeriodLabel({ label: "Triwulan III" }, "quarter")).toBe("Triwulan III");
    expect(shortPeriodLabel({ label: "Semester II" }, "semester")).toBe("Semester II");
    expect(shortPeriodLabel({ label: "Tahun 2026" }, "year")).toBe("Tahun 2026");
  });
});