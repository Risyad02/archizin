# ROADMAP — ArchIzin

Sumber: `05_IMPLEMENTATION_PLAN.md`. Dokumen ini yang dijaga up-to-date (centang checklist) seiring progres; `05_IMPLEMENTATION_PLAN.md` tetap sebagai arsip proposal awal.

Status keseluruhan: **Fase 1 (Foundation) — sedang berjalan**

## PHASE 0 — Discovery & Architecture ✅ Selesai
- [x] Technology evaluation
- [x] Architecture proposal
- [x] Database proposal
- [x] UI/UX proposal
- [x] Implementation plan
- [x] Persetujuan stack (Tauri v2 + React + TS + SQLite) dari user

## PHASE 1 — Foundation 🔄 Sedang berjalan
- [ ] Scaffold project Tauri + React + TypeScript
- [ ] Setup Tailwind CSS
- [ ] Pasang plugin: sql, dialog, fs, opener
- [ ] Struktur folder modul (`src/modules/`, `src/core/`, `src/database/`, `src/shared/`)
- [ ] Migration runner custom (TypeScript)
- [ ] Migration awal: skema baseline (roles, users, permit_types, custom_field_*, permit_records, document_links, permit_status, status_rules, folder_templates, audit_logs, imports, import_errors, exports, app_settings, storage_settings, backup_records, sessions)
- [ ] Seed data awal: roles (ADMIN/OPERATOR/VIEWER), permit_status
- [ ] Setup lint (ESLint) + typecheck (tsc) + test runner (Vitest)
- [ ] Verifikasi: app jalan, database file ter-generate, migration ter-apply
- [ ] `docs/` awal: ARCHITECTURE.md, DATABASE.md, ERD.md (turunan proposal 02/03)
- [ ] Git repo + commit awal

## PHASE 2 — Authentication P0
- [ ] Tabel & seed user admin pertama (argon2 hash)
- [ ] Login/logout, session, session timeout
- [ ] Role & permission check di service layer

## PHASE 3 — Permit Types & Custom Fields P0
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
