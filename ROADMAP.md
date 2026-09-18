# ROADMAP — ArchIzin

Sumber: `05_IMPLEMENTATION_PLAN.md`. Dokumen ini yang dijaga up-to-date (centang checklist) seiring progres; `05_IMPLEMENTATION_PLAN.md` tetap sebagai arsip proposal awal.

Status keseluruhan: **Fase 2 (Authentication) selesai — Fase 3 (Permit Types & Custom Fields) dimulai**

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

## PHASE 3 — Permit Types & Custom Fields P0 🔄 Sedang berjalan
- [ ] CRUD jenis izin
- [ ] CRUD custom field definition (+ options utk select/multiselect)

## PHASE 4 — Permit Records P0
- [ ] CRUD data izin (field inti + dinamis)
- [ ] Status otomatis via status_rules (H-90/60/30/14/7)

## PHASE 5 — Filesystem P0
- [ ] Folder templates & pembuatan folder fisik
- [ ] document_links + tombol "Lihat Dokumen"
- [ ] Validasi link (local dulu; network/HTTP opsional)

## PHASE 6 — Search/Filter/Sort P0
- [ ] Pencarian lintas field inti + custom field
- [ ] Pagination + virtualized table

## PHASE 7 — Dashboard P1
- [ ] Kartu ringkasan + grafik ringan

## PHASE 8 — Recapitulation P1
- [ ] Rekap bulanan/triwulanan/semester/tahunan + filter

## PHASE 9 — Import/Export P1
- [ ] Wizard import Excel/CSV (preview, mapping, validasi, ringkasan)
- [ ] Export Excel/CSV/PDF mengikuti filter aktif

## PHASE 10 — Audit Log P0 (paralel sejak Fase 2)
- [ ] Pencatatan semua action penting

## PHASE 11 — Backup/Restore P0
- [ ] 3 tipe backup, restore dengan auto-backup & validasi

## PHASE 12 — Testing P0 (berjalan sepanjang fase)
- [ ] Acceptance test MVP lengkap

## PHASE 13 — Packaging P1
- [ ] Installer Windows (.msi/.exe)
- [ ] Dokumentasi instalasi

---
Update terakhir: dicatat di `CHANGELOG.md` setiap ada perubahan status fase.