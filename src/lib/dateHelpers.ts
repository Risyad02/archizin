export function deriveTahunBulan(tanggalTerbit: string | null): { tahun: number | null; bulan: number | null } {
  if (!tanggalTerbit) return { tahun: null, bulan: null };
  const [tahunStr, bulanStr] = tanggalTerbit.split("-");
  return { tahun: Number(tahunStr), bulan: Number(bulanStr) };
}

export function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}