-- src/database/migrations/0002_seed_folder_template.sql
INSERT INTO folder_templates (name, pattern, is_default, is_active)
SELECT 'Default', '{kode_jenis_izin}/{tahun}/{nomor_izin}_{nama_pemohon}', 1, 1
WHERE NOT EXISTS (SELECT 1 FROM folder_templates WHERE is_default = 1);