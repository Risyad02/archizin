import { daysUntil } from "../../lib/dateHelpers";
import type { StatusRule } from "./types";

export interface ExpiryBadge {
  label: string;
  color: string | null;
  daysUntil: number;
  overdue: boolean;
}

export const STATUS_CODES_EXCLUDED_FROM_EXPIRY: readonly string[] = ["dicabut", "tidak_aktif"];

export function isExpiryTracked(statusCode: string | null | undefined): boolean {
  if (!statusCode) return true;
  return !STATUS_CODES_EXCLUDED_FROM_EXPIRY.includes(statusCode);
}

/**
 * Murni & bisa dites: menghitung badge masa berlaku dari tanggal_berakhir dan
 * daftar status_rules aktif (HARUS sudah terurut threshold_days menaik — sesuai
 * listActiveStatusRules). TIDAK menulis apa pun ke database — sengaja hanya
 * indikator visual (keputusan sadar), supaya kesalahan ambang batas di sini
 * tidak pernah merusak status_id yang sudah tersimpan.
 */
export function computeExpiryBadge(
  tanggalBerakhir: string | null,
  rules: StatusRule[],
  statusCode: string | null | undefined
): ExpiryBadge | null {
  if (!isExpiryTracked(statusCode)) return null;

  const days = daysUntil(tanggalBerakhir);
  if (days === null) return null;

  if (days < 0) {
    return {
      label: `Kedaluwarsa ${Math.abs(days)} hari lalu`,
      color: null, // dirender pakai text-danger di UI, bukan warna dari DB
      daysUntil: days,
      overdue: true,
    };
  }

  const matchedRule = rules.find((rule) => days <= rule.threshold_days);
  if (!matchedRule) return null;

  return {
    label: `${matchedRule.resulting_label} (H-${days})`,
    color: matchedRule.resulting_color,
    daysUntil: days,
    overdue: false,
  };
}