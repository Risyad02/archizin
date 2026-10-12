export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

/** Kontrol pilih-satu berbentuk deretan tombol (tab periode, dasar tanggal, pengelompokan). */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  /** Nama kelompok untuk pembaca layar; juga ditampilkan sebagai judul kecil di atas tombol. */
  label: string;
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <div>
      <p className="section-title mb-1.5">{label}</p>
      <div role="group" aria-label={label} className="inline-flex overflow-hidden rounded border border-line">
        {options.map((option, index) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.value)}
              className={`px-3 py-1.5 text-sm ${index > 0 ? "border-l border-line" : ""} ${
                active
                  ? "bg-accent-soft font-medium text-ink"
                  : "bg-paper-raised text-ink-muted hover:bg-accent-soft/40"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}