/**
 * Murni: menghitung geometri grafik batang (koordinat SVG) dari data. Tidak ada React,
 * DOM, atau library chart — komponen hanya menggambar angka yang dihasilkan di sini,
 * sehingga skala sumbu, posisi batang, dan pembulatan bisa dites tanpa render.
 */

export interface ChartPoint {
  label: string;
  /** Baris label kedua di bawah sumbu X (mis. tahun); opsional. */
  sublabel?: string | undefined;
  value: number;
}

export interface ChartMargin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface BarChartOptions {
  width: number;
  height: number;
  margin: ChartMargin;
  /** Lebar batang sebagai pecahan dari lebar pita per titik (default 0.6). */
  barRatio?: number;
}

export interface BarGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Titik tengah horizontal pita, untuk menaruh label. */
  cx: number;
  label: string;
  sublabel?: string | undefined;
  value: number;
}

export interface AxisTick {
  value: number;
  y: number;
}

export interface BarChartGeometry {
  plot: { left: number; top: number; width: number; height: number };
  axisMax: number;
  ticks: AxisTick[];
  bars: BarGeometry[];
}

const MAX_INTERVALS = 4;
const MIN_AXIS_MAX = 4;

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Skala sumbu Y "rapi": langkah 1/2/5 × 10^k, maksimal 4 interval, minimal sumbu 0–4
 * (supaya data kecil seperti 0–1 izin per bulan tidak membuat satu batang memenuhi grafik).
 */
export function niceAxis(maxValue: number): { axisMax: number; step: number; ticks: number[] } {
  const effective = Math.max(Number.isFinite(maxValue) ? maxValue : 0, MIN_AXIS_MAX);

  for (let magnitude = 1; ; magnitude *= 10) {
    for (const multiplier of [1, 2, 5]) {
      const step = multiplier * magnitude;
      const intervals = Math.ceil(effective / step);
      if (intervals <= MAX_INTERVALS) {
        const axisMax = intervals * step;
        const ticks: number[] = [];
        for (let value = 0; value <= axisMax; value += step) ticks.push(value);
        return { axisMax, step, ticks };
      }
    }
  }
}

export function buildBarChartGeometry(
  points: ChartPoint[],
  options: BarChartOptions
): BarChartGeometry {
  const { width, height, margin } = options;
  const barRatio = options.barRatio ?? 0.6;

  const plot = {
    left: margin.left,
    top: margin.top,
    width: Math.max(0, width - margin.left - margin.right),
    height: Math.max(0, height - margin.top - margin.bottom),
  };

  // Jumlah izin tidak pernah negatif; nilai tak valid dibaca 0 supaya tidak menghasilkan NaN di SVG.
  const values = points.map((point) =>
    Number.isFinite(point.value) ? Math.max(0, point.value) : 0
  );
  const { axisMax, ticks } = niceAxis(Math.max(0, ...values));

  const band = points.length > 0 ? plot.width / points.length : 0;
  const barWidth = band * barRatio;

  const bars: BarGeometry[] = points.map((point, index) => {
    const value = values[index] ?? 0;
    const barHeight = (value / axisMax) * plot.height;
    const bandLeft = plot.left + index * band;
    return {
      x: round(bandLeft + (band - barWidth) / 2),
      y: round(plot.top + plot.height - barHeight),
      width: round(barWidth),
      height: round(barHeight),
      cx: round(bandLeft + band / 2),
      label: point.label,
      sublabel: point.sublabel,
      value,
    };
  });

  return {
    plot,
    axisMax,
    ticks: ticks.map((value) => ({
      value,
      y: round(plot.top + plot.height - (value / axisMax) * plot.height),
    })),
    bars,
  };
}

/**
 * Murni: lebar batang horizontal sebagai persen (0–100) dari nilai terbesar di daftar.
 * Daftar semua 0 menghasilkan 0 (bukan NaN); nilai tak valid dibaca 0.
 */
export function barPercents(values: number[]): number[] {
  const clean = values.map((value) => (Number.isFinite(value) ? Math.max(0, value) : 0));
  const max = Math.max(0, ...clean);
  if (max === 0) return clean.map(() => 0);
  return clean.map((value) => Math.round((value / max) * 1000) / 10);
}