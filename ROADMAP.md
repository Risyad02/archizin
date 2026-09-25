# ROADMAP — ArchIzin

Sumber: `05_IMPLEMENTATION_PLAN.md`. Dokumen ini yang dijaga up-to-date (centang checklist) seiring progres; `05_IMPLEMENTATION_PLAN.md` tetap sebagai arsip proposal awal.

Status keseluruhan: **Fase 4 (Permit Records) selesai — Fase 5 (Filesystem) berikutnya**

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
- ⚠️ Utang baru dari Fase 4 (lihat `CLAUDE.md` §13 untuk detail): dropdown `select`/`multiselect` di `DynamicFieldInput` masih fallback ke text input karena gap `custom_field_options` di atas; tidak ada transaksi DB eksplisit untuk create/update record (risiko diterima); `AppLayout` `NavLink` sempat ketinggalan link ke halaman ini (sudah diperbaiki) tapi styling-nya masih Tailwind default, belum pakai `nav-item`/palet teal.

## PHASE 5 — Filesystem P0
- [ ] Folder templates & pembuatan folder fisik
- [ ] document_links + tombol "Lihat Dokumen"
- [ ] Validasi link (local dulu; network/HTTP opsional)

## PHASE 6 — Search/Filter/Sort P0
- [ ] Pencarian lintas field inti + custom field
- [ ] Pagination + virtualized table
- [ ] Pemakaian `daysUntil()`/`status_rules` untuk indikator masa berlaku (dipindah dari Fase 4)

## PHASE 7 — Dashboard P1
- [ ] Kartu ringkasan + grafik ringan

## PHASE 8 — Recapitulation P1
- [ ] Rekap bulanan/triwulanan/semester/tahunan + filter

## PHASE 9 — Import/Export P1
- [ ] Wizard import Excel/CSV (preview, mapping, validasi, ringkasan)
- [ ] Export Excel/CSV/PDF mengikuti filter aktif

## PHASE 10 — Audit Log P0 (paralel sejak Fase 2)
- [ ] Pencatatan semua action penting
- ⚠️ Terpasang untuk `permit_records` sejak Fase 4 (create/update/delete). **Masih belum diretrofit** ke `auth` (login/logout/setup admin) dan `permit-types`/`custom-fields` (CRUD jenis izin & field) — semua action di dua modul itu masih belum ter-audit sama sekali.

## PHASE 11 — Backup/Restore P0
- [ ] 3 tipe backup, restore dengan auto-backup & validasi

## PHASE 12 — Testing P0 (berjalan sepanjang fase)
- [ ] Acceptance test MVP lengkap
- ⚠️ Sejauh ini hanya unit test logic murni (`auth`, `permit-types`, `custom-fields`, `permit-records` — 18 test, 4 file). Belum ada integration test terhadap DB SQLite sungguhan, belum ada test komponen React sama sekali.

## PHASE 13 — Packaging P1
- [ ] Installer Windows (.msi/.exe)
- [ ] Dokumentasi instalasi

## Kualitas Berkelanjutan (usulan, belum diadopsi resmi)
Permintaan user: mulai fase-fase berikutnya, ArchIzin juga harus memperbaiki UI/UX dan testing secara bertahap dan tertrack — bukan cuma menambah fitur. Belum diformalkan sebagai checklist di sini; keputusan bentuk akhirnya (bagian terpisah vs. jadi item di Definition of Done tiap fase) masih menunggu.

---
Update terakhir: dicatat di `CHANGELOG.md` setiap ada perubahan status fase.