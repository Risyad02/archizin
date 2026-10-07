import { describe, it, expect } from "vitest";
import { niceAxis, buildBarChartGeometry, barPercents } from "./chartGeometry";

describe("niceAxis", () => {
  it("memilih langkah 1/2/5 × 10^k dengan maksimal 4 interval dan sumbu minimal 0–4", () => {
    expect(niceAxis(0)).toEqual({ axisMax: 4, step: 1, ticks: [0, 1, 2, 3, 4] });
    expect(niceAxis(4)).toEqual({ axisMax: 4, step: 1, ticks: [0, 1, 2, 3, 4] });
    expect(niceAxis(5)).toEqual({ axisMax: 6, step: 2, ticks: [0, 2, 4, 6] });
    expect(niceAxis(13)).toEqual({ axisMax: 15, step: 5, ticks: [0, 5, 10, 15] });
    expect(niceAxis(40)).toEqual({ axisMax: 40, step: 10, ticks: [0, 10, 20, 30, 40] });
    expect(niceAxis(101).axisMax).toBe(150);
  });

  it("nilai tak valid diperlakukan seperti 0", () => {
    expect(niceAxis(Number.NaN).axisMax).toBe(4);
  });
});

describe("buildBarChartGeometry", () => {
  const options = {
    width: 120,
    height: 70,
    margin: { top: 10, right: 0, bottom: 10, left: 0 },
    barRatio: 0.5,
  };

  it("menaruh batang, tinggi, dan garis sumbu pada koordinat yang tepat", () => {
    const geometry = buildBarChartGeometry(
      [
        { label: "A", value: 0 },
        { label: "B", value: 2 },
        { label: "C", value: 4, sublabel: "2026" },
      ],
      options
    );

    expect(geometry.plot).toEqual({ left: 0, top: 10, width: 120, height: 50 });
    expect(geometry.axisMax).toBe(4);

    expect(geometry.bars.map((b) => [b.x, b.y, b.width, b.height, b.cx])).toEqual([
      [10, 60, 20, 0, 20],
      [50, 35, 20, 25, 60],
      [90, 10, 20, 50, 100],
    ]);
    expect(geometry.bars[2]?.sublabel).toBe("2026");

    expect(geometry.ticks.map((t) => [t.value, t.y])).toEqual([
      [0, 60],
      [1, 47.5],
      [2, 35],
      [3, 22.5],
      [4, 10],
    ]);
  });

  it("tanpa data: tidak ada batang dan tidak ada NaN, sumbu tetap tergambar", () => {
    const geometry = buildBarChartGeometry([], options);
    expect(geometry.bars).toEqual([]);
    expect(geometry.axisMax).toBe(4);
    expect(geometry.ticks.every((t) => Number.isFinite(t.y))).toBe(true);
  });

  it("nilai negatif atau tak valid dibaca 0, bukan tinggi negatif", () => {
    const geometry = buildBarChartGeometry(
      [
        { label: "A", value: -3 },
        { label: "B", value: Number.NaN },
      ],
      options
    );
    expect(geometry.bars.map((b) => [b.value, b.height])).toEqual([
      [0, 0],
      [0, 0],
    ]);
  });

  it("koordinat dibulatkan ke 2 desimal agar SVG tidak berisi angka panjang", () => {
    const geometry = buildBarChartGeometry(
      [
        { label: "A", value: 1 },
        { label: "B", value: 1 },
        { label: "C", value: 1 },
      ],
      { width: 100, height: 50, margin: { top: 0, right: 0, bottom: 0, left: 0 }, barRatio: 0.6 }
    );
    // pita 33,333...; batang 20; x = (33,333 - 20) / 2 = 6,6667
    expect(geometry.bars[0]?.x).toBe(6.67);
    expect(geometry.bars[0]?.cx).toBe(16.67);
  });
});

describe("barPercents", () => {
  it("skala relatif terhadap nilai terbesar, dibulatkan 1 desimal", () => {
    expect(barPercents([4, 2, 1, 0])).toEqual([100, 50, 25, 0]);
    expect(barPercents([3, 1])).toEqual([100, 33.3]);
  });

  it("semua 0, kosong, atau tak valid: 0 tanpa NaN", () => {
    expect(barPercents([0, 0])).toEqual([0, 0]);
    expect(barPercents([])).toEqual([]);
    expect(barPercents([Number.NaN, -2, 5])).toEqual([0, 0, 100]);
  });
});