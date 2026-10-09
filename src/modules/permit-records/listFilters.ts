/**
 * Murni (tanpa React, DB, atau Tauri): membaca dan menyusun parameter URL untuk filter
 * halaman Data Perizinan. Dipakai halaman itu untuk state awal, dan dipakai halaman lain
 * (Rekap, Dashboard) untuk membuat tautan ke daftar yang sudah terfilter, mis.
 *   #/permit-records?jenis=3&terbitDari=2026-01-01&terbitSampai=2026-03-31
 *
 * URL dianggap masukan luar: tiap parameter divalidasi dan yang tidak valid DIABAIKAN
 * (bukan error), supaya tautan yang rusak atau diketik manual tidak pernah merusak
 * halaman. Nilai dari URL tidak pernah disusun ke SQL; ia hanya jadi filter yang nanti
 * masuk ke query sebagai parameter ($n) lewat buildPermitRecordWhere.
 */

export interface ListFilters {
  permitTypeId: number | "all";
  statusId: number | "all";
  /** 4 digit, atau "" bila kosong. */
  tahun: string;
  /** Tanggal YYYY-MM-DD, atau "" bila kosong. */
  terbitFrom: string;
  terbitTo: string;
  berakhirFrom: string;
  berakhirTo: string;
}

export const EMPTY_LIST_FILTERS: ListFilters = {
  permitTypeId: "all",
  statusId: "all",
  tahun: "",
  terbitFrom: "",
  terbitTo: "",
  berakhirFrom: "",
  berakhirTo: "",
};

export const LIST_PATH = "/permit-records";

/** Nama parameter URL (Bahasa Indonesia, konsisten dengan label di UI). */
const PARAM = {
  permitTypeId: "jenis",
  statusId: "status",
  tahun: "tahun",
  terbitFrom: "terbitDari",
  terbitTo: "terbitSampai",
  berakhirFrom: "berakhirDari",
  berakhirTo: "berakhirSampai",
} as const;

/** Bilangan bulat positif tanpa nol di depan, maksimal 9 digit. */
const ID_PATTERN = /^[1-9]\d{0,8}$/;
const TAHUN_PATTERN = /^\d{4}$/;
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * YYYY-MM-DD yang benar-benar ada di kalender. Date.UTC menormalkan nilai di luar rentang
 * tanpa error (bulan 13 jadi Januari tahun depan), jadi tiap komponen dicocokkan ulang.
 */
export function isValidISODate(value: string): boolean {
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) return false;
  const [, y, m, d] = match;
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function idFromParam(value: string | null): number | "all" {
  return value !== null && ID_PATTERN.test(value) ? Number(value) : "all";
}

function tahunFromParam(value: string | null): string {
  return value !== null && TAHUN_PATTERN.test(value) ? value : "";
}

function dateFromParam(value: string | null): string {
  return value !== null && isValidISODate(value) ? value : "";
}

/** Membaca filter dari URL. Parameter tak dikenal diabaikan; parameter ganda memakai yang pertama. */
export function parseListFilters(params: URLSearchParams): ListFilters {
  return {
    permitTypeId: idFromParam(params.get(PARAM.permitTypeId)),
    statusId: idFromParam(params.get(PARAM.statusId)),
    tahun: tahunFromParam(params.get(PARAM.tahun)),
    terbitFrom: dateFromParam(params.get(PARAM.terbitFrom)),
    terbitTo: dateFromParam(params.get(PARAM.terbitTo)),
    berakhirFrom: dateFromParam(params.get(PARAM.berakhirFrom)),
    berakhirTo: dateFromParam(params.get(PARAM.berakhirTo)),
  };
}

/** Jumlah filter yang terisi (untuk lencana "Filter (n)" dan keputusan membuka panel filter). */
export function countActiveFilters(filters: ListFilters): number {
  return [
    filters.permitTypeId !== "all",
    filters.statusId !== "all",
    filters.tahun !== "",
    filters.terbitFrom !== "",
    filters.terbitTo !== "",
    filters.berakhirFrom !== "",
    filters.berakhirTo !== "",
  ].filter(Boolean).length;
}

/**
 * Menyusun tautan ke daftar izin dengan filter tertentu. Nilai kosong atau tidak valid
 * tidak ditulis; urutan parameter selalu sama (hasil stabil, mudah dites). Tanpa filter,
 * hasilnya hanya LIST_PATH.
 */
export function buildListUrl(filters: Partial<ListFilters>): string {
  const params = new URLSearchParams();

  const setId = (key: string, value: number | "all" | undefined) => {
    if (typeof value === "number" && ID_PATTERN.test(String(value))) {
      params.set(key, String(value));
    }
  };
  const setTahun = (key: string, value: string | undefined) => {
    if (value !== undefined && TAHUN_PATTERN.test(value)) params.set(key, value);
  };
  const setDate = (key: string, value: string | undefined) => {
    if (value !== undefined && isValidISODate(value)) params.set(key, value);
  };

  setId(PARAM.permitTypeId, filters.permitTypeId);
  setId(PARAM.statusId, filters.statusId);
  setTahun(PARAM.tahun, filters.tahun);
  setDate(PARAM.terbitFrom, filters.terbitFrom);
  setDate(PARAM.terbitTo, filters.terbitTo);
  setDate(PARAM.berakhirFrom, filters.berakhirFrom);
  setDate(PARAM.berakhirTo, filters.berakhirTo);

  const query = params.toString();
  return query ? `${LIST_PATH}?${query}` : LIST_PATH;
}