-- 0005: indeks untuk document_links.permit_record_id
-- Alasan: query "Kesehatan Arsip" di dashboard mencocokkan tiap izin dengan document_links lewat
-- permit_record_id. Tanpa indeks, tiap izin memindai seluruh tabel dokumen, jadi waktunya naik
-- kuadrat terhadap jumlah data. Diukur pada 20.000 izin dan 12.857 dokumen: sekitar 18,6 detik
-- di aplikasi tanpa indeks, beberapa milidetik dengan indeks. Indeks ini juga mempercepat
-- pengambilan dokumen per izin di halaman detail.
-- Aman dijalankan ulang (IF NOT EXISTS).
CREATE INDEX IF NOT EXISTS idx_document_links_permit_record ON document_links(permit_record_id);