export interface PermitRecord {
  id: number;
  permit_type_id: number;
  permit_type_name: string;
  permit_type_code: string; // baru
  nomor_izin: string | null;
  nama_pemohon: string | null;
  nama_usaha: string | null;
  tanggal_dokumen: string | null;
  tanggal_terbit: string | null;
  tanggal_mulai_berlaku: string | null;
  tanggal_berakhir: string | null;
  status_id: number | null;
  status_code: string | null;
  status_label: string | null;
  status_color: string | null;
  tahun: number | null;
  bulan: number | null;
  keterangan: string | null;
  sumber_data: string | null;
  lokasi_folder: string | null;
}

export interface CustomFieldValueRow {
  custom_field_definition_id: number;
  field_key: string;
  label: string;
  field_type: string;
  value_text: string | null;
  value_integer: number | null;
  value_decimal: number | null;
  value_date: string | null;
  value_boolean: number | null;
}

export interface PermitRecordFormInput {
  permitTypeId: number;
  nomorIzin: string;
  namaPemohon: string;
  namaUsaha: string;
  tanggalDokumen: string | null;
  tanggalTerbit: string | null;
  tanggalMulaiBerlaku: string | null;
  tanggalBerakhir: string | null;
  statusId: number;
  keterangan: string;
  customFieldValues: Record<number, string | boolean | null>; // key = custom_field_definition_id
}