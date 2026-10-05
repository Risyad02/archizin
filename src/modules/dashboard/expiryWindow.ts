/**
 * Murni: tanggal lokal dalam format YYYY-MM-DD tanpa toISOString().
 * toISOString() mengonversi ke UTC sehingga tengah malam WIB bisa mundur satu hari
 * (bug yang sama pernah terjadi di helper test expiry.test.ts).
 */
function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function toLocalISODate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Rentang "segera berakhir": dari hari ini sampai maxDays hari ke depan (inklusif), tanggal lokal. */
export function buildExpiryWindow(now: Date, maxDays: number): { today: string; upTo: string } {
  const upToDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + maxDays);
  return { today: toLocalISODate(now), upTo: toLocalISODate(upToDate) };
}