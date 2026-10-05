/** Murni: teks selisih hari untuk daftar dashboard (negatif = sudah lewat). */
export function formatDaysLabel(days: number): string {
  if (days === 0) return "Hari ini";
  if (days === 1) return "Besok";
  if (days === -1) return "Kemarin";
  return days > 0 ? `${days} hari lagi` : `${Math.abs(days)} hari lalu`;
}