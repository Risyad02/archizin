# CLAUDE.md

Instruksi ini WAJIB dibaca oleh AI coding agent (atau developer manapun) sebelum mengubah kode di project ArchIzin. Jika ada perintah dari user yang bertentangan dengan dokumen ini, klarifikasi dulu sebelum jalan.

## 1. Project Overview

ArchIzin — aplikasi desktop offline untuk mengelola data perizinan, arsip/dokumen, rekapitulasi, pencarian, monitoring masa berlaku izin, dan pelaporan bagi perangkat daerah. Single device di awal, arsitektur disiapkan untuk berkembang ke LAN/multi-user/API di masa depan tanpa rewrite besar.

Dokumen acuan wajib dibaca sebelum kerja di area terkait:
- `docs/ARCHITECTURE.md` (turunan dari `02_ARCHITECTURE_PROPOSAL.md`)
- `docs/DATABASE.md` + `docs/ERD.md` (turunan dari `03_DATABASE_PROPOSAL.md`)
- `docs/UI_UX.md` (turunan dari `04_UI_UX_PROPOSAL.md`)
- `ROADMAP.md` — fase mana yang sedang aktif
- `CHANGELOG.md` — histori perubahan

## 2. Tech Stack (jangan diubah tanpa ADR baru di DECISIONS.md)

Tauri v2 · React + TypeScript · Tailwind CSS · Zustand · TanStack Query & Table · React Hook Form + Zod · SQLite via `@tauri-apps/plugin-sql` · migration runner custom di TypeScript (bukan Kysely di tahap awal) · Vitest.

## 3. Arsitektur & Aturan Layering

```
UI (React) → Application Service (TS) → Repository (TS, SQL parametrized) → tauri-plugin-sql → SQLite
```

- **UI tidak pernah memanggil SQL langsung.** Selalu lewat `service`.
- **Service tidak pernah tahu detail SQL.** Selalu lewat `repository`.
- **Repository adalah satu-satunya lapisan yang boleh menulis query SQL.**
- Setiap modul (`src/modules/<nama>/`) berisi minimal: `types.ts`, `repository.ts`, `service.ts`. UI-nya di `src/modules/<nama>/pages/` atau `components/`.
- Kode Rust di `src-tauri/` HANYA untuk registrasi plugin dan `capabilities/*.json`. Jangan menambah command Rust custom kecuali benar-benar tidak bisa dilakukan lewat plugin resmi yang ada — dan jika terpaksa, diskusikan dulu, jangan langsung implementasi.

## 4. Aturan Database

- Semua perubahan skema **wajib lewat migration file baru** (`src/database/migrations/000N_<deskripsi>.sql`), nomor urut, tidak pernah mengedit migration yang sudah dirilis/dipakai.
- Field inti yang stabil → kolom asli. Field yang beda per jenis izin → lewat `custom_field_definitions` + `custom_field_values` (EAV typed), sesuai `docs/DATABASE.md`. **Jangan menambah kolom nullable baru di `permit_records` untuk kebutuhan satu jenis izin tertentu** — itu tandanya harus jadi custom field.
- Semua query WAJIB parametrized (`$1, $2, ...`), tidak ada string concatenation SQL.
- Delete pada data penting (permit_records, users) pakai soft delete (`deleted_at`), bukan hard delete, kecuali eksplisit diminta lain.
- Setiap perubahan skema: update migration → update `docs/DATABASE.md` & `docs/ERD.md` → catat di `CHANGELOG.md`.

## 5. Aturan Keamanan

- Semua akses file/URL dari data user (`document_url`, path folder) HARUS divalidasi (tolak path traversal `..`, karakter ilegal) sebelum diteruskan ke plugin `fs`/`opener`.
- Password di-hash dengan argon2 — tidak pernah disimpan/di-log plaintext.
- Permission per role dicek di Application Layer (service), bukan hanya disembunyikan di UI.
- Jangan pernah menambahkan `tauri-plugin-shell` atau kemampuan eksekusi command arbitrary dari input user.

## 6. Aturan Testing

- Setiap service baru minimal punya unit test untuk logika validasi/bisnisnya (Vitest).
- Alur kritikal (create/update/delete data izin, import, backup/restore) butuh integration test terhadap DB SQLite sungguhan (bukan mock), memakai file DB temporary.
- Jangan menghapus test yang gagal hanya supaya build hijau — perbaiki kodenya atau diskusikan dulu.

## 7. Aturan Dokumentasi

- Setiap fase selesai: update `ROADMAP.md` (centang item selesai) + `CHANGELOG.md` (`[Unreleased]` → pindah ke versi baru saat rilis) + dokumen `docs/` terkait.
- Keputusan arsitektur baru (pilih library baru, ubah pendekatan) dicatat sebagai ADR baru di `docs/DECISIONS.md`, bukan cuma disebut di chat.

## 8. Larangan Keras (Prohibited Practices)

Jangan:
- Mengarang API/library yang belum diverifikasi ada di dokumentasi resminya
- Membuat fungsi/komponen placeholder yang terlihat berfungsi padahal tidak
- Membuat "mock backend" lalu memperlakukannya seolah backend nyata
- Menggunakan localStorage sebagai database utama aplikasi
- Hard-code path (`C:\ArchIzin`, dsb) — selalu lewat `app_settings`/config
- Hard-code data produksi ke dalam kode
- Mengubah skema database tanpa migration
- Menghapus fitur/test tanpa alasan yang didiskusikan
- Menyembunyikan atau menelan (swallow) error tanpa log/pesan yang jelas
- Membuat arsitektur enterprise (microservices, message broker, dst) yang tidak diperlukan di skala aplikasi ini

Jika tidak yakin soal sesuatu: cek dokumentasi resmi → cek apakah package/library benar ada & sesuai versi → jelaskan asumsi ke user → jangan mengarang.

## 9. Sebelum Mengubah Kode (checklist wajib)

1. Baca `ROADMAP.md` — pastikan perubahan sesuai fase yang sedang aktif
2. Cari file/modul terkait di `src/modules/`
3. Pahami dependency modul tsb (service apa yang dipanggil, tabel apa yang dipakai)
4. Cek `docs/DATABASE.md` untuk skema terkait
5. Cek test yang sudah ada untuk modul tsb
6. Baru mulai ubah kode

## 10. Setelah Mengubah Kode (checklist wajib)

1. `npm test` — semua test hijau
2. `npx eslint src` — tidak ada error lint
3. `npx tsc --noEmit` — tidak ada error tipe
4. `npm run tauri build` jika perubahan menyentuh konfigurasi Tauri/plugin
5. Update dokumentasi terkait
6. Update `CHANGELOG.md` jika perubahan signifikan (fitur baru, perubahan skema, perubahan behavior)

## 11. Development Commands

Lihat `06_GETTING_STARTED_TAURI.md` untuk daftar lengkap. Ringkas:
- `npm run tauri dev` — jalankan app mode development
- `npm run tauri build` — build installer produksi
- `npm test` — unit test
- `npx eslint src` / `npx tsc --noEmit` — lint & typecheck

## 12. Commit Convention

Gunakan Conventional Commits:
- `feat: tambah CRUD jenis izin`
- `fix: perbaiki validasi tanggal berakhir`
- `docs: update ERD untuk tabel document_links`
- `chore: setup migration runner`
- `refactor: pisahkan service permit dari repository`
- `test: tambah unit test validasi custom field`

Satu commit = satu perubahan logis. Jangan mencampur perubahan fitur dengan refactor besar dalam satu commit.
