export type PermitRecordSortBy =
  | "created_at"
  | "tanggal_berakhir"
  | "nomor_izin"
  | "nama_pemohon"
  | "tahun";

export type SortDirection = "asc" | "desc";

export interface PermitRecordQuery {
  search?: string;
  permitTypeId?: number;
  statusId?: number;
  tahun?: number;
  tanggalBerakhirFrom?: string; // YYYY-MM-DD
  tanggalBerakhirTo?: string;
  sortBy?: PermitRecordSortBy;
  sortDir?: SortDirection;
  page?: number; // 1-based
  pageSize?: number;
}

export interface PermitRecordPage<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
export const PAGE_SIZE_MIN = 10;
export const PAGE_SIZE_MAX = 100;
export const PAGE_SIZE_DEFAULT = 25;

export function clampPageSize(pageSize: number | undefined): number {
  if (!pageSize || Number.isNaN(pageSize)) return PAGE_SIZE_DEFAULT;
  return Math.min(PAGE_SIZE_MAX, Math.max(PAGE_SIZE_MIN, Math.floor(pageSize)));
}

export function clampPage(page: number | undefined): number {
  if (!page || Number.isNaN(page) || page < 1) return 1;
  return Math.floor(page);
}

export interface BuiltWhere {
  whereSql: string;
  params: unknown[];
}

/**
 * Membentuk klausa WHERE + parameter parametrized ($1, $2, ...) secara murni.
 * Selalu menyertakan pr.deleted_at IS NULL. Pencarian bebas mencakup 5 kolom
 * sekaligus: nomor_izin, nama_pemohon, nama_usaha, nama jenis izin (pt.name),
 * dan keterangan.
 */
export function buildPermitRecordWhere(query: PermitRecordQuery): BuiltWhere {
  const conditions: string[] = ["pr.deleted_at IS NULL"];
  const params: unknown[] = [];

  const search = query.search?.trim();
  if (search) {
    const term = `%${search}%`;
    const placeholders: string[] = [];
    for (let i = 0; i < 9; i++) {
      params.push(term);
      placeholders.push(`$${params.length}`);
    }
    conditions.push(
      `(pr.nomor_izin LIKE ${placeholders[0]} OR pr.nama_pemohon LIKE ${placeholders[1]} ` +
        `OR pr.nama_usaha LIKE ${placeholders[2]} OR pt.name LIKE ${placeholders[3]} ` +
        `OR pr.keterangan LIKE ${placeholders[4]} OR EXISTS (` +
        `SELECT 1 FROM custom_field_values cfv ` +
        `JOIN custom_field_definitions cfd ON cfd.id = cfv.custom_field_definition_id ` +
        `WHERE cfv.permit_record_id = pr.id AND cfd.is_searchable = 1 AND (` +
        `cfv.value_text LIKE ${placeholders[5]} ` +
        `OR CAST(cfv.value_integer AS TEXT) LIKE ${placeholders[6]} ` +
        `OR CAST(cfv.value_decimal AS TEXT) LIKE ${placeholders[7]} ` +
        `OR cfv.value_date LIKE ${placeholders[8]}` +
        `)))`
    );
  }

  if (query.permitTypeId) {
    params.push(query.permitTypeId);
    conditions.push(`pr.permit_type_id = $${params.length}`);
  }
  if (query.statusId) {
    params.push(query.statusId);
    conditions.push(`pr.status_id = $${params.length}`);
  }
  if (query.tahun) {
    params.push(query.tahun);
    conditions.push(`pr.tahun = $${params.length}`);
  }
  if (query.tanggalBerakhirFrom) {
    params.push(query.tanggalBerakhirFrom);
    conditions.push(`pr.tanggal_berakhir >= $${params.length}`);
  }
  if (query.tanggalBerakhirTo) {
    params.push(query.tanggalBerakhirTo);
    conditions.push(`pr.tanggal_berakhir <= $${params.length}`);
  }

  return { whereSql: `WHERE ${conditions.join(" AND ")}`, params };
}

const SORT_COLUMN_MAP: Record<PermitRecordSortBy, string> = {
  created_at: "pr.created_at",
  tanggal_berakhir: "pr.tanggal_berakhir",
  nomor_izin: "pr.nomor_izin",
  nama_pemohon: "pr.nama_pemohon",
  tahun: "pr.tahun",
};

const DEFAULT_SORT_DIR: Record<PermitRecordSortBy, SortDirection> = {
  created_at: "desc",
  tanggal_berakhir: "asc",
  nomor_izin: "asc",
  nama_pemohon: "asc",
  tahun: "desc",
};

/**
 * Membentuk klausa ORDER BY. Untuk tanggal_berakhir, baris NULL selalu di akhir
 * lewat trik "(kolom IS NULL)" — di SQLite, FALSE=0/TRUE=1, jadi baris terisi
 * (0) selalu tersusun sebelum baris kosong (1), apa pun arah sortnya.
 */
export function buildOrderBy(sortBy?: PermitRecordSortBy, sortDir?: SortDirection): string {
  const key = sortBy ?? "created_at";
  const column = SORT_COLUMN_MAP[key];
  const dir = (sortDir ?? DEFAULT_SORT_DIR[key]).toUpperCase();

  if (key === "tanggal_berakhir") {
    return `ORDER BY (pr.tanggal_berakhir IS NULL), pr.tanggal_berakhir ${dir}`;
  }
  return `ORDER BY ${column} ${dir}`;
}

export function getDefaultSortDirection(sortBy: PermitRecordSortBy): SortDirection {
  return DEFAULT_SORT_DIR[sortBy];
}