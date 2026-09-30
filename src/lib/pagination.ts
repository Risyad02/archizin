export type PageItem = number | "ellipsis";

/**
 * Menghasilkan daftar nomor halaman untuk ditampilkan, dengan "ellipsis" (...)
 * di celah yang terlalu jauh. Selalu menyertakan halaman 1, halaman terakhir,
 * dan halaman di sekitar halaman aktif (current-1, current, current+1).
 */
export function buildPageList(current: number, total: number): PageItem[] {
  if (total <= 1) return [1];

  const pages = new Set<number>();
  pages.add(1);
  pages.add(total);
  for (let p = current - 1; p <= current + 1; p++) {
    if (p >= 1 && p <= total) pages.add(p);
  }

  const sorted = Array.from(pages).sort((a, b) => a - b);
  const result: PageItem[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push("ellipsis");
    result.push(sorted[i]);
  }
  return result;
}