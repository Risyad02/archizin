# ROADMAP — ArchIzin

Sumber: `05_IMPLEMENTATION_PLAN.md`. Dokumen ini yang dijaga up-to-date (centang checklist) seiring progres; `05_IMPLEMENTATION_PLAN.md` tetap sebagai arsip proposal awal.

Status keseluruhan: **Fase 6 (Search/Filter/Sort) selesai — Fase 7 (Dashboard) berikutnya**
Kriteria "selesai" untuk setiap checkpoint, fase, dan rilis MVP ada di `DEFINITION_OF_DONE.md`. Sebuah item hanya boleh dicentang bila kriteria di sana terpenuhi.

## PHASE 0 — Discovery & Architecture ✅ Selesai
- [x] Technology evaluation
- [x] Architecture proposal
- [x] Database proposal
- [x] UI/UX proposal
- [x] Implementation plan
- [x] Persetujuan stack (Tauri v2 + React + TS + SQLite) dari user

## PHASE 1 — Foundation ✅ Selesai
- [x] Scaffold project Tauri + React + TypeScript
- [x] Setup Tailwind CSS (v4, via plugin Vite — bukan `init -p`, sudah tidak ada di v4)
- [x] Pasang plugin: sql, dialog, fs, opener (Rust + JS package dua-duanya, lihat catatan di CHANGELOG)
- [x] Struktur folder modul (`src/modules/`, `src/database/`, dst.)
- [x] Migration runner custom (TypeScript, berbasis `PRAGMA user_version`)
- [x] Migration awal (`0001_init.sql`): skema baseline 19 tabel (roles, users, permit_types, custom_field_*, permit_records, document_links, permit_status, status_rules, folder_templates, audit_logs, imports, import_errors, exports, app_settings, storage_settings, backup_records, sessions), idempotent (`IF NOT EXISTS`)
- [x] Seed data awal: roles (ADMIN/OPERATOR/VIEWER), permit_status
- [x] Setup lint (ESLint flat config) + typecheck (tsc) + test runner (Vitest, `--passWithNoTests`)
- [x] Verifikasi: app jalan, database file ter-generate, migration ter-apply, tanpa error
- [x] Git repo + commit awal (`docs/` sengaja di-gitignore, lihat CLAUDE.md §13)

> `docs/ARCHITECTURE.md`, `DATABASE.md`, `ERD.md` versi lokal (tidak di-commit) menyusul opsional — tidak menghalangi Fase 2.

## PHASE 2 — Authentication P0 ✅ Selesai
- [x] Tabel & seed user admin pertama (argon2 hash, dibuat lewat alur "Setup Admin Pertama" di UI — bukan seed hardcode)
- [x] Login/logout, session (in-memory Zustand, belum persistent lintas restart — ditandai untuk enhancement nanti)
- [x] Role & permission check berbasis role langsung (ADMIN/OPERATOR/VIEWER) — tabel `permissions` granular ditunda, lihat ADR terkait

## PHASE 3 — Permit Types & Custom Fields P0 ✅ Selesai
- [x] CRUD jenis izin
- [x] CRUD custom field definition (+ options utk select/multiselect)
- [x] Routing & layout sidebar dibangun (HashRouter, ProtectedRoute/AdminRoute, AppLayout) — fondasi untuk semua halaman berikutnya
- [x] Data-fetching pakai TanStack Query (`useQuery`/`invalidateQueries`), bukan `useEffect`+`useState` manual
- [x] Design system (`src/index.css`, palet kertas/tinta/teal + IBM Plex) ditetapkan
- ⚠️ Gap yang baru terkonfirmasi di Fase 4: `listOptions`/`addOption` untuk `custom_field_options` cuma ada di `repository.ts`, tidak pernah di-wrap ke `service.ts` maupun dipakai di UI manapun — dropdown select/multiselect belum bisa dikelola. Lihat catatan di Fase 4.

## PHASE 4 — Permit Records P0 ✅ Selesai
- [x] CRUD data izin (field inti + dinamis via `custom_field_values`)
- [x] Modul baru `permit-status` (tidak direncanakan eksplisit di proposal awal, ternyata dibutuhkan untuk dropdown status di form — dibangun dengan pola layering yang sama: types/repository/service)
- [x] 3 halaman: `PermitRecordsPage` (list+filter+hapus), `PermitRecordFormPage` (create+edit), `PermitRecordDetailPage`
- [x] Audit log terpasang untuk create/update/delete permit record (helper generik `src/lib/audit.ts`)
- [x] Lint/typecheck/unit test bersih (18 test, 4 file) + uji manual end-to-end lolos
- [ ] Status otomatis via status_rules (H-90/60/30/14/7) — **DITUNDA ke Fase 6/7**, bukan bagian dari penutupan Fase 4. Fungsi murni `daysUntil()` sudah ada di `src/lib/dateHelpers.ts`, tinggal dipanggil dari UI list/dashboard nanti.
- ⚠️ Utang baru dari Fase 4 (lihat `CLAUDE.md` §13 untuk detail): dropdown `select`/`multiselect` di `DynamicFieldInput` masih fallback ke text input karena gap `custom_field_options` di atas; tidak ada transaksi DB eksplisit untuk create/update record (risiko diterima); `AppLayout` `NavLink` sempat ketinggalan link ke halaman ini (sudah diperbaiki; styling-nya juga sudah diseragamkan ke design system di akhir Fase 5).

## PHASE 5 — Filesystem P0 ✅ Selesai
- [x] Wizard "Setup Lokasi Penyimpanan" (sekali saat first-run, bukan bebas diganti lewat Pengaturan) + modul `storage-settings`; migration `0002` seed folder template default `{kode_jenis_izin}/{tahun}/{nomor_izin}_{nama_pemohon}`; boot flow `needs-admin` → `needs-storage` → `ready` (via `useQuery`)
- [x] `src/lib/filesystem.ts`: `sanitizeForFolderName`, `resolveFolderPattern`, `copyFileWithDedup` (auto-rename `nama (2).ext`, tidak pernah overwrite), `checkFolderSync`, `renameFolder` + 17 unit test
- [x] Folder fisik dibuat otomatis saat data izin dibuat (non-blocking: gagal buat folder tidak menggagalkan simpan data) dan `lokasi_folder` terisi; saat nomor izin/nama pemohon/tanggal terbit diedit, muncul dialog konfirmasi sebelum folder di-rename (`folderSync.ts`)
- [x] `document_links`: daftar, tambah dokumen (pilih file → auto-copy ke folder izin), buka file, buka folder, hapus tautan (file fisik TIDAK ikut terhapus — keputusan sadar)
- [x] 3 command Rust custom (`grant_storage_scope`, `grant_file_scope`, `open_in_default_app`) karena scope plugin `fs`/`opener` bersifat statis — lihat `CLAUDE.md` §3 dan §13
- [x] Penyeragaman UI + responsif untuk semua halaman (design system diperluas: `btn-secondary`, `btn-danger`, `btn-sm`, `field-label`, `section-title`, `item-row`; sidebar jadi bar atas di layar sempit; tabel jadi kartu di layar sempit); font IBM Plex di-bundle lokal via `@fontsource` (aplikasi offline)
- [x] Lint/typecheck/unit test bersih (35 test, 5 file) + uji manual end-to-end lolos
- [ ] Validasi status `document_links` (cek file masih ada di disk, update `status`/`last_checked_at`) — **DIGESER ke Fase 6**, tidak wajib untuk penutupan Fase 5
- [ ] Tombol "Buat Folder" manual untuk data izin yang `lokasi_folder`-nya NULL (data lama sebelum Fase 5, atau pembuatan folder yang sempat gagal) — saat ini hanya ada pesan info di halaman detail
- [ ] Fitur "Pindah Lokasi Penyimpanan" (pindah folder fisik + update semua path di DB) — **di luar scope Fase 5** sesuai keputusan desain
- ⚠️ Utang dari Fase 5 (detail di `CLAUDE.md` §13): path dokumen belum divalidasi (tolak `..`/karakter ilegal) sebelum dibuka lewat `open_in_default_app` padahal `CLAUDE.md` §5 mewajibkannya; tambah/hapus dokumen dan rename folder belum tercatat di audit log; `resolveTargetPath` di `folderSync.ts` return `null` tanpa log kalau storage/template belum siap; `buildFolderPath` memakai pemisah `\` (asumsi Windows-only); belum ada test untuk `folderSync.ts` dan modul `documents`

## PHASE 6 — Search/Filter/Sort P0 ✅ Selesai
- [x] Pelunasan utang P0: `src/lib/permissions.ts` (matriks role, `assertCan`, `PermissionRoute`) dipasang di semua service mutasi (`permit-types`, `custom-fields`, `permit-records`, `documents`) lewat parameter `actor: AuthUser` (ganti `currentUserId` mentah); audit log (`logAudit`) retrofit ke `auth` (login/logout/setup admin), jenis izin, custom field, dokumen, dan rename folder, plus halaman baru **Log Aktivitas** (`audit-log/`, dijaga `audit:view`); `assertPathWithinRoot` (murni, ketat terhadap `storage_root` khusus `link_type: "local"`) dipasang di `openDocumentFile`/`openRecordFolder` baru — sekaligus memindahkan pemanggilan `open_in_default_app` dari UI ke service (perbaikan layering)
- [x] Tombol "Buat Folder Sekarang" untuk data izin dengan `lokasi_folder` NULL (`createFolderNow` — melempar pesan error spesifik, beda dari `ensurePermitFolder` yang tetap non-blocking untuk jalur otomatis)
- [x] Validasi status `document_links`: tombol "Cek Status Dokumen" (`pathExists`, `validateDocumentStatus`/`validateAllDocumentsForRecord`), status "File tidak ditemukan" tampil merah
- [x] Indikator masa berlaku dari `status_rules`: migration `0004` seed H-90/60/30/14/7; `permit-status/expiry.ts` (`computeExpiryBadge`, murni) — **keputusan sadar: murni indikator visual, TIDAK menulis `status_id`**, supaya kesalahan ambang batas tidak pernah merusak data tersimpan
- [x] Pencarian/filter/sort/pagination field inti: `searchQuery.ts` (`buildPermitRecordWhere`/`buildOrderBy`, murni) — pencarian 5 kolom (nomor izin, nama pemohon, nama usaha, jenis izin, keterangan) dengan debounce 300ms, filter (jenis izin/status/tahun/rentang tanggal berakhir) di balik tombol, sort dengan arah default berbeda per kolom, page size 10–100 (default 25) bisa dipilih user, navigasi halaman bernomor dengan ellipsis
- [x] Perluasan pencarian ke custom field `is_searchable` (checkbox "Bisa dicari" saat menambah field baru — **belum ada fitur edit field untuk field lama**, keputusan scope sadar); sekalian diperbaiki 2 bug tampilan field dinamis yang ditemukan di sela-sela: label field opsional menampilkan "0" (`is_required` bertipe `number` bukan `boolean`), dan nilai `select`/`multiselect` tampil JSON/value mentah di halaman detail bukan label
- [x] Evaluasi virtualisasi tabel (6.11): **disimpulkan tidak diperlukan** — paginasi sudah membatasi render maksimal `pageSize` baris via SQL `LIMIT`/`OFFSET`, bukan filter sisi client. `@tanstack/react-table` tetap ter-install tapi belum dipakai, keputusan hapus/pertahankan menunggu user
- [x] Lint/typecheck/unit test bersih (138 test, 13 file, naik dari 35 di akhir Fase 5) + uji manual end-to-end lolos tiap checkpoint
- ⚠️ Utang baru dari Fase 6 (detail di `CLAUDE.md` §13 dan `DEFINITION_OF_DONE.md` §5): belum ada fitur edit custom field definition (termasuk mengubah `is_searchable` field lama); `@tanstack/react-table` nganggur

## PHASE 7 — Dashboard P1 (sedang berjalan)
- [x] 7.1 Fungsi murni statistik: bucketExpiry, buildMonthlySeries (+6 test)
- [x] 7.2 Query agregasi + service getDashboardSummary (SQL diverifikasi dengan data uji)
- [x] 7.3 Halaman Dashboard: kartu ringkasan + blok "Perlu Dilengkapi"
- [x] 7.3b Pengecualian status Dicabut/Tidak Aktif dari masa berlaku (keputusan user; daftar status tunggal di expiry.ts, dipakai dashboard dan daftar izin)
- [x] 7.4 Daftar segera berakhir & kedaluwarsa (klik ke detail, maks 8 baris)
- [ ] 7.5 Grafik SVG sendiri: distribusi status/jenis izin + tren penerbitan 12 bulan
- [ ] 7.6 Panel kesehatan arsip (tanpa dokumen, tanpa folder, file hilang) + aktivitas terbaru (audit:view)
- [ ] 7.7 Kuota Q-UI/Q-TEST/Q-DEBT + penutupan fase
- [ ] 7.8 PermitRecordsPage membaca filter awal dari URL, supaya kartu/daftar dashboard bisa mengarah ke daftar terfilter

## PHASE 8 — Recapitulation P1
- [ ] Rekap bulanan/triwulanan/semester/tahunan + filter

## PHASE 9 — Import/Export P1
- [ ] Wizard import Excel/CSV (preview, mapping, validasi, ringkasan)
- [ ] Export Excel/CSV/PDF mengikuti filter aktif

## PHASE 10 — Audit Log P0 (paralel sejak Fase 2) ✅ Tercapai untuk cakupan saat ini
- [x] Pencatatan aksi penting: `permit_records` (Fase 4); `auth`, `permit-types`, `custom-fields`, `documents`, rename folder (Fase 6)
- [x] Halaman **Log Aktivitas** untuk melihatnya (dijaga `audit:view`, ADMIN/OPERATOR)
- ⚠️ Belum mencakup `import` dan `restore` karena fiturnya sendiri belum ada (Fase 9/11) — pola `actor`+`logAudit` sudah mapan, tinggal dipasang saat fase itu dikerjakan

## PHASE 11 — Backup/Restore P0
- [ ] 3 tipe backup, restore dengan auto-backup & validasi

## PHASE 12 — Testing P0 (berjalan sepanjang fase)
- [ ] Acceptance test MVP lengkap
- ⚠️ 138 unit test (13 file) — mencakup semua modul inti plus `permissions`, `searchQuery`, `pagination`, `expiry`. Test mock-based pertama muncul di Fase 6 Checkpoint 6.4 (`folderSync`, `documents`, `storage-settings`). Masih belum ada integration test terhadap DB SQLite sungguhan, dan belum ada test komponen React sama sekali — lihat `DEFINITION_OF_DONE.md` bagian Piramida Test untuk rencananya.

## PHASE 13 — Packaging P1
- [ ] Installer Windows (.msi/.exe)
- [ ] Dokumentasi instalasi

## Kualitas Berkelanjutan (diadopsi)
Setiap fase wajib memuat kuota Q-UI, Q-TEST, dan Q-DEBT (definisi di `DEFINITION_OF_DONE.md` §2.9). Pelacakan:

| Fase | Q-UI | Q-TEST | Q-DEBT |
|---|---|---|---|
| 5 | Penyeragaman UI + responsif semua halaman (dikerjakan sebelum kuota ini ada) | — | — |
| 6 | Perbaikan tampilan field dinamis (label "0" hilang, select/multiselect tampil label asli, bukan JSON mentah) | Test mock-based pertama di codebase (`folderSync`/`documents`/`storage-settings`, Checkpoint 6.4) + `searchQuery.ts`/`pagination.ts` murni dengan test penuh | U-05, U-06, U-09, U-15, dan U-01 lanjutan (searchable) lunas; #1/#2/#3 (role, audit, path) lunas |
| 7 | | | |

---
Update terakhir: dicatat di `CHANGELOG.md` setiap ada perubahan status fase.