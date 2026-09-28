# DEFINITION OF DONE — ArchIzin

Dokumen ini menjawab satu pertanyaan: **kapan sesuatu boleh disebut selesai?** Berlaku untuk manusia maupun AI coding agent. Kalau satu butir belum terpenuhi, statusnya "belum selesai", bukan "selesai dengan catatan".

Tujuan akhir ArchIzin (dari brief awal): aplikasi desktop **offline-first** untuk mengelola data perizinan, arsip/dokumen fisik yang tertata dan bisa dipertanggungjawabkan, pencarian, monitoring masa berlaku, rekapitulasi, dan pelaporan bagi perangkat daerah. Single device di awal, arsitektur siap berkembang ke LAN/multi-user tanpa rewrite besar. Semua butir di bawah diturunkan dari tujuan itu, bukan dari selera.

Hubungan dengan dokumen lain: `ROADMAP.md` menyatakan **apa** yang dikerjakan per fase, dokumen ini menyatakan **seberapa matang** hasilnya sebelum dicentang. `CLAUDE.md` §9 dan §10 berisi prosedur kerja, dokumen ini berisi kriteria lulusnya.

---

## Tiga level

| Level | Unit | Kapan dicek |
|---|---|---|
| 1. Checkpoint | Satu potongan kerja kecil (satu modul, satu halaman, satu perubahan skema) | Sebelum lanjut ke checkpoint berikutnya |
| 2. Fase | Satu fase di ROADMAP | Sebelum fase dicentang ✅ dan di-push |
| 3. Rilis MVP | Seluruh aplikasi | Sebelum installer diberikan ke pengguna sungguhan |

Aturan dasar: level lebih tinggi mensyaratkan level di bawahnya sudah lulus.

---

## Level 1 — Checkpoint

Satu checkpoint dianggap selesai bila **semua** ini benar:

- [ ] Kode ditulis setelah membuka `types.ts`/`service.ts`/file asli yang dipanggil. Tidak ada nama fungsi atau field hasil tebakan.
- [ ] `npx tsc --noEmit` bersih (dijalankan dari terminal, bukan panel editor).
- [ ] `npx eslint .` bersih.
- [ ] `npx vitest run --passWithNoTests` hijau. Test yang gagal diperbaiki kodenya, tidak dihapus.
- [ ] Logika baru yang murni (validasi, transformasi, aturan bisnis) punya unit test.
- [ ] Perubahan yang menyentuh Rust atau `capabilities/*.json` diuji dengan **restart penuh** `tauri dev`.
- [ ] Diuji manual di aplikasi yang benar-benar berjalan: jalur normal **dan** minimal satu jalur gagal (input salah, file tidak ada, batal di dialog).
- [ ] Tidak ada error yang tertelan tanpa jejak. Kalau sebuah error sengaja tidak menghentikan proses (seperti pembuatan folder yang non-blocking), error itu tetap tercatat di log, bukan diam.
- [ ] Hasil manual test dilaporkan (apa yang dicoba, apa hasilnya), bukan hanya "sudah jalan".

---

## Level 2 — Fase

Selain semua butir Level 1 untuk tiap checkpoint di dalamnya:

### 2.1 Fungsional
- [ ] Seluruh item fase di `ROADMAP.md` tercentang, atau digeser **secara eksplisit** ke fase lain dengan alasan tertulis. Tidak ada item yang diam-diam hilang.
- [ ] Alur utama fase dijalankan ujung ke ujung di aplikasi sungguhan, dari data kosong sampai hasil akhir.
- [ ] Keputusan desain yang sudah disepakati (misalnya: konfirmasi sebelum rename folder, hapus tautan tidak menghapus file fisik) terbukti terpenuhi, bukan hanya tertulis.

### 2.2 Data dan keselamatan dokumen
- [ ] Tidak ada aksi yang bisa menghilangkan dokumen atau data user tanpa konfirmasi eksplisit yang menyebut apa yang akan hilang.
- [ ] Penghapusan data penting memakai soft delete, kecuali diputuskan lain secara tertulis.
- [ ] Setiap aksi tulis pada data bisnis (create/update/delete, tambah/hapus dokumen, rename folder, import, restore) tercatat di audit log dengan nilai lama dan baru.
- [ ] Perubahan skema hanya lewat migration baru yang idempotent, terdaftar di `migrate.ts` (import **dan** entry array), dan diuji pada database yang sudah berisi data, bukan hanya database kosong.

### 2.3 Keamanan
- [ ] Semua query parametrized. Tidak ada string concatenation SQL.
- [ ] Path atau URL yang berasal dari data user divalidasi sebelum diteruskan ke plugin `fs`/`opener`/command Rust.
- [ ] Pengecekan role dilakukan di service, bukan hanya menyembunyikan tombol di UI.
- [ ] Tidak ada secret, password, atau data nyata di kode maupun di log.

### 2.4 Testing
- [ ] Setiap service baru punya unit test untuk aturan validasi dan bisnisnya.
- [ ] Jalur kritikal fase punya test otomatis pada level yang sesuai (lihat §"Piramida test" di bawah). Kalau belum bisa, alasannya dan rencananya dicatat di register utang.
- [ ] Jumlah test tidak turun dibanding fase sebelumnya kecuali ada alasan tertulis.

### 2.5 UI/UX
- [ ] Memakai design system (`src/index.css`): tidak ada `bg-blue-600`, `bg-slate-*`, atau warna default Tailwind lain.
- [ ] Setiap halaman menangani empat keadaan: memuat, kosong, error, dan berhasil.
- [ ] Layout diperiksa di lebar minimum window (480px), sekitar breakpoint (768px), dan layar lebar (≥1280px). Tidak ada scroll horizontal pada halaman, tabel lebar punya kontainer scroll sendiri atau berubah jadi kartu.
- [ ] Setiap input punya `label` yang terhubung (`htmlFor`/`id`). Pesan error memakai `role="alert"`.
- [ ] Semua elemen bisa dijangkau dan dioperasikan dengan keyboard; fokus terlihat.
- [ ] Teks Bahasa Indonesia konsisten (istilah yang sama untuk hal yang sama di semua halaman).
- [ ] Aksi yang merusak (hapus, timpa, pindah) memakai dialog konfirmasi dari plugin dialog, dengan pesan yang menyebut objeknya.

### 2.6 Dokumentasi
- [ ] `ROADMAP.md`, `CHANGELOG.md` (Added/Changed/Fixed), dan `CLAUDE.md` §13 diperbarui.
- [ ] Setiap bug non-trivial dicatat dengan **akar masalah**, bukan hanya gejala.
- [ ] Keputusan arsitektur baru dicatat sebagai ADR di `docs/DECISIONS.md`.
- [ ] Bila skema berubah, `docs/DATABASE.md` dan `docs/ERD.md` ikut diperbarui.

### 2.7 Git
- [ ] `git status` bersih dari file yang tidak seharusnya (`.db`, `node_modules`, `src-tauri/target`).
- [ ] Commit mengikuti Conventional Commits, satu commit satu perubahan logis, perubahan gaya dipisah dari perubahan fitur.
- [ ] Sudah di-push ke `origin/master`.

### 2.8 Utang teknis
- [ ] Setiap utang baru yang muncul selama fase masuk ke **register utang** (bagian 5 dokumen ini) dengan: apa, sejak kapan, kapan wajib lunas, prioritas.
- [ ] Fase tidak boleh ditutup dengan utang yang **melanggar aturan tertulis** di `CLAUDE.md` tanpa dicatat sebagai pelanggaran sadar beserta rencana pelunasannya.

### 2.9 Kuota kualitas per fase ("Kualitas Berkelanjutan")
Agar UI/UX dan testing membaik bertahap dan tertelusur, bukan hanya fitur yang bertambah, setiap fase **wajib** memuat minimal:

| Kuota | Isi | Dicatat di |
|---|---|---|
| **Q-UI** | Minimal 1 peningkatan UI/UX yang nyata (mis. state kosong lebih informatif, validasi inline, pintasan keyboard, perbaikan responsif) | `ROADMAP.md`, bagian Kualitas Berkelanjutan |
| **Q-TEST** | Minimal 1 penambahan test di luar fitur fase itu sendiri (modul lama yang belum punya test, integration test, atau test komponen) | `ROADMAP.md`, bagian Kualitas Berkelanjutan |
| **Q-DEBT** | Minimal 1 utang dari register (bagian 5) dilunasi | Register utang |

Fase yang tidak memenuhi kuota tidak boleh dicentang selesai, kecuali ada alasan tertulis yang disetujui.

---

## Piramida test

Saat ini hanya level 1 yang ada. Target akhir:

| Level | Isi | Status | Wajib pada |
|---|---|---|---|
| Unit | Logika murni, validasi, helper | Ada (35 test) | Setiap checkpoint |
| Integrasi | Repository dan service terhadap SQLite sungguhan (file temporary) | **Belum ada** | Sebelum Fase 9 (Import/Export) dan Fase 11 (Backup/Restore) |
| Komponen | Halaman dan form React dengan Testing Library (sudah terpasang) | **Belum ada** | Untuk form dan alur kritikal, dimulai Fase 6 |
| Akseptansi | Skrip manual ujung ke ujung berbasis kriteria Level 3 | Belum ada | Sebelum rilis MVP |

Catatan teknis yang harus diputuskan sebelum integration test pertama: akses database saat ini lewat `getDb()` yang memakai plugin Tauri, dan plugin itu tidak tersedia di lingkungan Vitest. Perlu antarmuka akses database yang bisa diganti di test (adapter ke SQLite lokal seperti `better-sqlite3` atau `sql.js`). Keputusannya dicatat sebagai ADR.

---

## Gate tambahan menurut jenis perubahan

| Jenis perubahan | Wajib tambahan |
|---|---|
| Migration DB | Diuji pada DB berisi data; idempotent; dijalankan dua kali tanpa error; dicek langsung isinya di DB Browser |
| Rust / `capabilities` | Restart penuh `tauri dev`; catat di `CLAUDE.md` §3; tidak menambah command yang menerima input tanpa validasi |
| Halaman UI baru | Empat keadaan halaman; cek 3 lebar layar; link di `navItems` bila perlu; class dari design system |
| Operasi filesystem | Diuji dengan path berisi spasi, karakter ilegal Windows, nama sangat panjang, file yang sedang dibuka aplikasi lain, dan drive lain |
| Aksi destruktif | Konfirmasi eksplisit, tercatat di audit log, ada jalan mundur (soft delete atau backup) |
| Import / Export | File dengan baris rusak, kolom hilang, karakter khusus, dan ukuran besar; laporan error per baris |
| Perubahan role/izin | Diuji dengan ketiga role (ADMIN, OPERATOR, VIEWER), termasuk mencoba aksi terlarang lewat service |

---

## Level 3 — Rilis MVP

MVP boleh diberikan ke pengguna sungguhan hanya bila **semua** bagian ini lulus.

### 3.1 Fungsional (dari brief awal)
- [ ] CRUD data izin dengan field inti dan field dinamis per jenis izin, tanpa mengubah kode saat menambah jenis izin baru
- [ ] Dropdown `select`/`multiselect` untuk field dinamis benar-benar bisa dikelola dan dipakai
- [ ] Pencarian dan filter lintas field inti dan custom field; sortir; pagination
- [ ] Monitoring masa berlaku: status otomatis dari `status_rules` (H-90/60/30/14/7), indikator terlihat di daftar dan dashboard
- [ ] Dashboard ringkasan
- [ ] Rekapitulasi bulanan, triwulanan, semester, tahunan, dengan filter
- [ ] Import Excel/CSV (pratinjau, pemetaan kolom, validasi, ringkasan hasil, laporan baris gagal)
- [ ] Export Excel/CSV/PDF mengikuti filter yang aktif
- [ ] Arsip dokumen: folder tertata sesuai template, dokumen bisa dibuka, status link tervalidasi, folder bisa dibuat ulang untuk data yang belum punya
- [ ] Tiga role berfungsi (lihat 3.3)

### 3.2 Offline-first
- [ ] Semua fitur inti di 3.1 diuji **dengan koneksi internet dimatikan**, dari instalasi bersih.
- [ ] Tidak ada resource dari internet (font, CDN, ikon, skrip). Semua ter-bundle.
- [ ] Tidak ada fitur yang gagal diam-diam karena tidak ada koneksi.

### 3.3 Keamanan dan role
- [ ] ADMIN, OPERATOR, VIEWER punya batas yang terdokumentasi (matriks role × aksi) dan **ditegakkan di service**.
- [ ] Setiap aksi terlarang diuji lewat pemanggilan service langsung, bukan hanya lewat UI.
- [ ] Password di-hash (argon2), tidak pernah tampil di log atau audit.
- [ ] Session diputuskan perilakunya: tetap in-memory (login ulang tiap buka aplikasi) atau persisten, dan keputusannya dicatat.
- [ ] Semua path dan URL dari data divalidasi sebelum dibuka atau disalin.
- [ ] Command Rust custom ditinjau ulang: masing-masing menerima input minimal yang dibutuhkan dan divalidasi di sisi Rust bila memungkinkan.

### 3.4 Keselamatan data
- [ ] Backup: database saja, database + konfigurasi, dan penuh (termasuk arsip).
- [ ] Restore **diuji pada instalasi kosong** dari file backup, lalu data, dokumen, dan audit log terverifikasi utuh.
- [ ] Restore membuat backup otomatis dari kondisi saat ini sebelum menimpa, dan memvalidasi file backup sebelum mulai.
- [ ] Aplikasi tidak mengubah skema database pengguna tanpa backup otomatis sebelumnya.
- [ ] Upgrade dari versi sebelumnya mempertahankan seluruh data.
- [ ] Audit log terpisah dari system log; keduanya tersedia. Audit mencakup semua modul (auth, jenis izin, custom field, data izin, dokumen, import, restore).
- [ ] System log ada untuk error teknis (termasuk kegagalan yang sengaja non-blocking), tersimpan ke file, dan bisa dibuka dari aplikasi untuk keperluan pemecahan masalah.

### 3.5 Performa dan perangkat spek rendah
- [ ] Diuji di perangkat dengan spesifikasi paling rendah yang menjadi target pengguna, bukan hanya di laptop pengembangan.
- [ ] Target waktu dan memori ditetapkan **setelah baseline diukur** di Fase 6 (dengan dataset uji yang realistis, termasuk ribuan data izin dan ribuan dokumen), lalu dicatat di dokumen ini.
- [ ] Daftar besar tidak membekukan UI (paginasi atau virtualisasi).
- [ ] Ukuran installer dan penggunaan memori saat idle dicatat.

### 3.6 Akseptansi dan regresi
- [ ] Skrip akseptansi manual tertulis (langkah, data uji, hasil yang diharapkan) untuk setiap poin 3.1, dijalankan penuh oleh orang yang bukan penulis kodenya.
- [ ] Test integrasi dan komponen untuk semua jalur kritikal (CRUD data izin, dokumen, import, backup/restore, login/role) sudah ada dan hijau.
- [ ] Tidak ada bug terbuka berstatus tinggi (lihat 3.9).

### 3.7 Packaging dan instalasi
- [ ] `npm run tauri build` sukses; installer (`.msi` atau `.exe`) dibuat.
- [ ] Diinstal di Windows bersih (tanpa Node, Rust, atau alat pengembangan), dijalankan dari nol: wizard admin, wizard lokasi penyimpanan, pemakaian nyata.
- [ ] Dependensi runtime (WebView2) tertangani atau terdokumentasi.
- [ ] Lokasi data (database, konfigurasi, log) jelas dan terdokumentasi; uninstall tidak menghapus data pengguna tanpa sepengetahuan mereka.
- [ ] Versi aplikasi, changelog rilis, dan tag Git dibuat.

### 3.8 Dokumentasi
Tersedia dan mutakhir: `USER_GUIDE.md`, `ADMIN_GUIDE.md`, `TROUBLESHOOTING.md` (termasuk cara mengambil log), `BACKUP_RESTORE.md`, `DEPLOYMENT.md`, `SECURITY.md`, `DATABASE.md`, `ERD.md`, `ARCHITECTURE.md`, `TESTING.md`, `DECISIONS.md`, `CHANGELOG.md`.

### 3.9 Yang memblokir rilis
Rilis **tidak boleh** dilakukan bila salah satu ini masih ada:
- Kemungkinan kehilangan atau kerusakan data pengguna (termasuk restore yang belum teruji)
- Pengecekan role yang belum ditegakkan di service
- Aksi tulis penting yang tidak tercatat di audit log
- Path atau input dari data yang belum divalidasi sebelum menyentuh filesystem
- Fitur inti yang butuh internet
- Error yang tertelan tanpa jejak di log
- Utang berprioritas **P0** di register (bagian 5)

---

## 4. Sebelum memulai fase (Definition of Ready singkat)

- [ ] Fase sebelumnya sudah memenuhi Level 2 dan di-push.
- [ ] Item fase dipecah menjadi checkpoint kecil; satu checkpoint per giliran kerja.
- [ ] Kode aktual modul yang akan disentuh sudah dibaca (bukan dari dokumen lama).
- [ ] Keputusan desain yang belum jelas sudah ditanyakan dan dijawab, bukan diasumsikan.
- [ ] Utang di register yang jatuh tempo di fase ini sudah dijadwalkan sebagai checkpoint, bukan ditunda lagi.

---

## Bukti selesai (salin di setiap penutupan checkpoint)

```
Checkpoint: <nama>
Perubahan:  <file/modul yang disentuh>
Otomatis:   tsc [bersih]  eslint [bersih]  vitest [N test lulus]
Manual:     <skenario normal: hasil> | <jalur gagal: hasil>
Data/FS:    <yang dicek langsung di DB Browser / File Explorer>
UI:         responsif [480/768/1280 diuji]  keyboard [ok]  empat keadaan halaman [ok]
Rust/cap:   <restart penuh dilakukan? ya / tidak / tidak relevan>
Utang:      <utang baru (nomor) / utang dilunasi (nomor)>
Catatan:    <bug + akar masalah bila ada>
```

## Sengaja di luar cakupan

Sesuai keputusan awal, yang berikut **bukan** bagian dokumen ini dan tidak dikerjakan tanpa keputusan baru: microservices, Kubernetes, message broker, database terdistribusi, multi-user/LAN/cloud pada MVP, dan sistem operasi selain Windows. Arsitektur hanya perlu tidak menutup jalan ke sana.

---

## 5. Register utang dan celah saat ini

Kondisi per akhir Fase 5, dibandingkan dengan dokumen ini. Prioritas: **P0** memblokir rilis, **P1** harus lunas sebelum fase yang disebut selesai, **P2** dijadwalkan.

| # | Celah | Sejak | Harus lunas | Prioritas |
|---|---|---|---|---|
| 1 | Pengecekan role belum terlihat di service `permit-records` (create/update/delete tidak memeriksa role pemanggil); hanya rute admin yang dijaga di UI. Perlu dicek juga service lain | Fase 2 | Awal Fase 6 (sebelum data nyata dimasukkan) | P0 |
| 2 | Audit log belum ada untuk auth, jenis izin, custom field, tambah/hapus dokumen, rename folder | Fase 2 | Awal Fase 6 | P0 |
| 3 | Path dokumen belum divalidasi sebelum `open_in_default_app` (melanggar `CLAUDE.md` §5) | Fase 5 | Fase 6 | P0 |
| 4 | Tidak ada system log; kegagalan non-blocking hanya `console.error`, tidak terlihat oleh pengguna | Fase 5 | Sebelum Fase 11 | P0 |
| 5 | Restore, backup, dan migrasi DB belum ada; migration berjalan otomatis tanpa backup sebelumnya | Fase 1 | Fase 11 (aturan backup-sebelum-migrate berlaku sejak sekarang untuk migration baru berisi perubahan destruktif) | P0 |
| 6 | Test integrasi ke SQLite sungguhan belum ada; belum diputuskan cara menyuntik adapter DB | Fase 1 | Keputusan di awal Fase 6, test sebelum Fase 9 | P1 |
| 7 | Tidak ada test komponen React | Fase 1 | Dimulai Fase 6 untuk form dan alur kritikal | P1 |
| 8 | Test untuk `folderSync.ts`, modul `documents`, dan `storage-settings` belum ada | Fase 5 | Fase 6 | P1 |
| 9 | `custom_field_options` tanpa service dan UI; `select`/`multiselect` jatuh ke text input | Fase 3 | Sebelum rilis MVP; sebaiknya Fase 6 | P1 |
| 10 | Tombol "Buat Folder" manual untuk data izin dengan `lokasi_folder` NULL; validasi status `document_links` | Fase 5 | Fase 6 | P1 |
| 11 | `resolveTargetPath` di `folderSync.ts` mengembalikan `null` tanpa log saat storage/template belum siap | Fase 5 | Bersama system log (#4) | P1 |
| 12 | Tidak ada transaksi DB eksplisit pada create/update data izin (insert inti lalu nilai custom field) | Fase 4 | Sebelum Fase 9 (import massal memperbesar risikonya) | P1 |
| 13 | Session hanya in-memory; belum diputuskan apakah cukup | Fase 2 | Sebelum rilis MVP (keputusan) | P2 |
| 14 | `react-hook-form` dan `zod` terpasang tetapi tidak dipakai; validasi form manual per halaman | Fase 4 | Diputuskan: pakai atau hapus dari dependensi | P2 |
| 15 | `buildFolderPath` memakai pemisah `\` (Windows-only) | Fase 5 | Bila keputusan cross-platform muncul | P2 |
| 16 | Fitur "Pindah Lokasi Penyimpanan" belum ada (di luar scope Fase 5 sesuai keputusan) | Fase 5 | Sebelum rilis MVP bila pengguna butuh pindah disk; keputusan | P2 |
| 17 | Status otomatis `status_rules` (H-90/60/30/14/7) belum dipakai di UI | Fase 4 | Fase 6/7 | P1 |

Aturan pemeliharaan register: diperbarui di setiap penutupan fase. Utang yang lewat batas "harus lunas" tanpa dijadwalkan ulang secara tertulis menjadi penghalang penutupan fase berikutnya.

---

## 6. Keputusan terbuka yang memengaruhi dokumen ini

1. **Cara integration test** (adapter DB di Vitest) — perlu ADR sebelum test integrasi pertama.
2. **Perilaku session** (persisten atau tidak) — perlu keputusan sebelum rilis.
3. **Target performa dan spesifikasi perangkat minimum** — ditetapkan setelah baseline diukur; perlu pengguna menyebutkan perangkat terendah yang harus didukung.
4. **Matriks role × aksi** — perlu ditulis sebelum pengecekan role di service dikerjakan (#1 register).
5. **Format dan lokasi system log** — perlu diputuskan sebelum #4 register.
6. **Kuota kualitas per fase (2.9)** — apakah ketiganya (Q-UI, Q-TEST, Q-DEBT) wajib di setiap fase, atau hanya Q-TEST dan Q-DEBT?
