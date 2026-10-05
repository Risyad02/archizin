import { describe, it, expect } from "vitest";
import { formatDaysLabel } from "./daysLabel";

describe("formatDaysLabel", () => {
  it("kata khusus untuk hari ini, besok, dan kemarin", () => {
    expect(formatDaysLabel(0)).toBe("Hari ini");
    expect(formatDaysLabel(1)).toBe("Besok");
    expect(formatDaysLabel(-1)).toBe("Kemarin");
  });

  it("selisih lain memakai 'hari lagi' atau 'hari lalu'", () => {
    expect(formatDaysLabel(7)).toBe("7 hari lagi");
    expect(formatDaysLabel(-40)).toBe("40 hari lalu");
  });

  it("-0 (hasil Math.round untuk selisih kecil negatif) dibaca sebagai hari ini", () => {
    expect(formatDaysLabel(-0)).toBe("Hari ini");
  });
});