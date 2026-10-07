// src/modules/dashboard/components/MonthlyTrendChart.tsx
import { buildBarChartGeometry, type ChartPoint } from "../chartGeometry";
import type { MonthlyPoint } from "../stats";

const WIDTH = 640;
const HEIGHT = 240;
const MARGIN = { top: 18, right: 8, bottom: 40, left: 32 };

/**
 * Grafik batang SVG buatan sendiri (tanpa library). Semua koordinat datang dari
 * buildBarChartGeometry; komponen ini hanya menggambar. Warna memakai token tema
 * (fill-accent, stroke-line, fill-ink-muted) sehingga ikut design system.
 */
export function MonthlyTrendChart({ points }: { points: MonthlyPoint[] }) {
  const chartPoints: ChartPoint[] = points.map((point, index) => ({
    label: point.label,
    // Tahun ditulis di bawah bulan pertama dan setiap Januari, supaya batas tahun terlihat.
    sublabel: index === 0 || point.bulan === 1 ? String(point.tahun) : undefined,
    value: point.total,
  }));

  const { plot, ticks, bars } = buildBarChartGeometry(chartPoints, {
    width: WIDTH,
    height: HEIGHT,
    margin: MARGIN,
  });

  const baselineY = plot.top + plot.height;

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label="Grafik batang jumlah izin terbit per bulan selama 12 bulan terakhir"
      className="h-auto w-full"
    >
      {ticks.map((tick) => (
        <g key={tick.value}>
          <line
            x1={plot.left}
            x2={plot.left + plot.width}
            y1={tick.y}
            y2={tick.y}
            strokeWidth={1}
            className={tick.value === 0 ? "stroke-ink-muted" : "stroke-line"}
          />
          <text
            x={plot.left - 6}
            y={tick.y}
            textAnchor="end"
            dominantBaseline="middle"
            fontSize={10}
            className="fill-ink-muted font-mono"
          >
            {tick.value}
          </text>
        </g>
      ))}

      {bars.map((bar, index) => {
        const point = points[index];
        const period = point ? `${point.label} ${point.tahun}` : bar.label;
        return (
          <g key={`${period}-${index}`}>
            {bar.height > 0 && (
              <rect x={bar.x} y={bar.y} width={bar.width} height={bar.height} rx={1.5} className="fill-accent">
                <title>{`${period}: ${bar.value} izin`}</title>
              </rect>
            )}
            {bar.value > 0 && (
              <text
                x={bar.cx}
                y={bar.y - 5}
                textAnchor="middle"
                fontSize={11}
                className="fill-ink font-mono"
              >
                {bar.value}
              </text>
            )}
            <text x={bar.cx} y={baselineY + 15} textAnchor="middle" fontSize={11} className="fill-ink-muted">
              {bar.label}
            </text>
            {bar.sublabel && (
              <text
                x={bar.cx}
                y={baselineY + 29}
                textAnchor="middle"
                fontSize={10}
                className="fill-ink-muted font-mono"
              >
                {bar.sublabel}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}