-- 0006: pastikan indeks document_links.permit_record_id ada
-- Alasan: pada sebagian database, migration 0005 tercatat sudah berjalan (user_version = 5)
-- tetapi indeksnya tidak terbentuk, sehingga query Kesehatan Arsip tetap memindai seluruh tabel
-- dokumen untuk setiap izin (sekitar 18 detik pada 20.000 izin).
-- Pernyataan yang sama dengan 0005. Aman dijalankan ulang (IF NOT EXISTS).
CREATE INDEX IF NOT EXISTS idx_document_links_permit_record ON document_links(permit_record_id);