-- 0001_init.sql
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE IF NOT EXISTS permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id INTEGER NOT NULL REFERENCES roles(id),
  permission_id INTEGER NOT NULL REFERENCES permissions(id),
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role_id INTEGER NOT NULL REFERENCES roles(id),
  full_name TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS permit_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS custom_field_definitions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  permit_type_id INTEGER NOT NULL REFERENCES permit_types(id),
  field_key TEXT NOT NULL,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN (
    'text','textarea','integer','decimal','date','datetime','boolean',
    'select','multiselect','url','email','phone','file_link','reference'
  )),
  is_required INTEGER NOT NULL DEFAULT 0,
  is_searchable INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  config TEXT,
  UNIQUE (permit_type_id, field_key)
);

CREATE TABLE IF NOT EXISTS custom_field_options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  custom_field_definition_id INTEGER NOT NULL REFERENCES custom_field_definitions(id),
  value TEXT NOT NULL,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS permit_status (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  color TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS status_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  based_on TEXT NOT NULL DEFAULT 'tanggal_berakhir',
  threshold_days INTEGER NOT NULL,
  resulting_status_id INTEGER NOT NULL REFERENCES permit_status(id),
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS folder_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  pattern TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS permit_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  permit_type_id INTEGER NOT NULL REFERENCES permit_types(id),
  nomor_izin TEXT,
  nama_pemohon TEXT,
  nama_usaha TEXT,
  tanggal_dokumen TEXT,
  tanggal_terbit TEXT,
  tanggal_mulai_berlaku TEXT,
  tanggal_berakhir TEXT,
  status_id INTEGER REFERENCES permit_status(id),
  tahun INTEGER,
  bulan INTEGER,
  keterangan TEXT,
  sumber_data TEXT,
  lokasi_folder TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS custom_field_values (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  permit_record_id INTEGER NOT NULL REFERENCES permit_records(id),
  custom_field_definition_id INTEGER NOT NULL REFERENCES custom_field_definitions(id),
  value_text TEXT,
  value_integer INTEGER,
  value_decimal REAL,
  value_date TEXT,
  value_boolean INTEGER,
  UNIQUE (permit_record_id, custom_field_definition_id)
);

CREATE TABLE IF NOT EXISTS document_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  permit_record_id INTEGER NOT NULL REFERENCES permit_records(id),
  url TEXT NOT NULL,
  link_type TEXT NOT NULL CHECK (link_type IN ('local','network','http','gdrive','sharepoint')),
  last_checked_at TEXT,
  status TEXT NOT NULL DEFAULT 'unchecked' CHECK (status IN ('valid','not_found','unreachable','unchecked','needs_auth'))
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  record_id INTEGER,
  old_value TEXT,
  new_value TEXT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS imports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  total_rows INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  fail_count INTEGER NOT NULL DEFAULT 0,
  imported_by INTEGER REFERENCES users(id),
  imported_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS import_errors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  import_id INTEGER NOT NULL REFERENCES imports(id),
  row_number INTEGER NOT NULL,
  column_name TEXT,
  error_message TEXT NOT NULL,
  raw_value TEXT
);

CREATE TABLE IF NOT EXISTS exports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  export_type TEXT NOT NULL CHECK (export_type IN ('excel','csv','pdf')),
  filter_snapshot TEXT,
  exported_by INTEGER REFERENCES users(id),
  exported_at TEXT NOT NULL DEFAULT (datetime('now')),
  file_path TEXT
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  description TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS storage_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  storage_root TEXT,
  backup_root TEXT,
  active_folder_template_id INTEGER REFERENCES folder_templates(id)
);

CREATE TABLE IF NOT EXISTS backup_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  backup_type TEXT NOT NULL CHECK (backup_type IN ('db_only','db_config','full')),
  file_path TEXT NOT NULL,
  size_bytes INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by INTEGER REFERENCES users(id),
  checksum TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  token_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  last_active_at TEXT
);

-- Index untuk pencarian/filter/sorting (poin 11 brief)
CREATE INDEX IF NOT EXISTS idx_permit_records_nomor_izin ON permit_records(nomor_izin);
CREATE INDEX IF NOT EXISTS idx_permit_records_permit_type ON permit_records(permit_type_id);
CREATE INDEX IF NOT EXISTS idx_permit_records_status ON permit_records(status_id);
CREATE INDEX IF NOT EXISTS idx_permit_records_tahun ON permit_records(tahun);
CREATE INDEX IF NOT EXISTS idx_permit_records_bulan ON permit_records(bulan);
CREATE INDEX IF NOT EXISTS idx_permit_records_tanggal_terbit ON permit_records(tanggal_terbit);
CREATE INDEX IF NOT EXISTS idx_permit_records_tanggal_berakhir ON permit_records(tanggal_berakhir);
CREATE INDEX IF NOT EXISTS idx_custom_field_values_record ON custom_field_values(permit_record_id);
CREATE INDEX IF NOT EXISTS idx_custom_field_values_def ON custom_field_values(custom_field_definition_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity, record_id);

-- Seed data awal (bukan data produksi — role & status dasar yang memang dibutuhkan app)
INSERT INTO roles (name, description) VALUES
  ('ADMIN', 'Akses penuh termasuk user management, konfigurasi, backup, restore, audit log'),
  ('OPERATOR', 'CRUD data, import, export, rekap'),
  ('VIEWER', 'Lihat, search, filter, dashboard, laporan');

INSERT INTO permit_status (code, label, color, sort_order) VALUES
  ('draft', 'Draft', '#9ca3af', 0),
  ('dalam_proses', 'Dalam Proses', '#3b82f6', 1),
  ('aktif', 'Aktif', '#22c55e', 2),
  ('akan_berakhir', 'Akan Berakhir', '#eab308', 3),
  ('kedaluwarsa', 'Kedaluwarsa', '#ef4444', 4),
  ('dicabut', 'Dicabut', '#71717a', 5),
  ('tidak_aktif', 'Tidak Aktif', '#a1a1aa', 6),
  ('lainnya', 'Lainnya', '#94a3b8', 7);