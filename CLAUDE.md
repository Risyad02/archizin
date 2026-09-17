# CLAUDE.md

Instruksi ini WAJIB dibaca oleh AI coding agent (atau developer manapun) sebelum mengubah kode di project ArchIzin. Jika ada perintah dari user yang bertentangan dengan dokumen ini, klarifikasi dulu sebelum jalan.

## 1. Project Overview

ArchIzin — aplikasi desktop offline untuk mengelola data perizinan, arsip/dokumen, rekapitulasi, pencarian, monitoring masa berlaku izin, dan pelaporan bagi perangkat daerah. Single device di awal, arsitektur disiapkan untuk berkembang ke LAN/multi-user/API di masa depan tanpa rewrite besar.

Status saat ini: **Fase 1 (Foundation) selesai, Fase 2 (Authentication) sedang berjalan.** Cek `ROADMAP.md` untuk status detail per fase.

Dokumen acuan wajib dibaca sebelum kerja di area terkait:
- `docs/ARCHITECTURE.md` (turunan dari `02_ARCHITECTURE_PROPOSAL.md`) — versi lokal, tidak di-commit ke git (lihat §13)
- `docs/DATABASE.md` + `docs/ERD.md` (turunan dari `03_DATABASE_PROPOSAL.md`) — versi lokal
- `docs/UI_UX.md` (turunan dari `04_UI_UX_PROPOSAL.md`) — versi lokal
- `ROADMAP.md` — fase mana yang sedang aktif
- `CHANGELOG.md` — histori perubahan **dan histori bug/fix penting** (bagian `Fixed`) — baca dulu sebelum debug sesuatu yang terasa familiar, kemungkinan sudah pernah terjadi & didokumentasikan

## 2. Tech Stack (jangan diubah tanpa ADR baru di DECISIONS.md)

Tauri v2 · React 19 + TypeScript · Tailwind CSS v4 (via plugin Vite `@tailwindcss/vite`, BUKAN `tailwind.config.js`/`init -p` — sudah dihapus di v4) · Zustand · TanStack Query & Table · React Hook Form + Zod · SQLite via `@tauri-apps/plugin-sql` · migration runner custom di TypeScript berbasis `PRAGMA user_version` (bukan Kysely di tahap awal) · Vitest · ESLint flat config (`eslint.config.js`, bukan `.eslintrc.cjs`).

## 3. Arsitektur & Aturan Layering

```
UI (React) → Application Service (TS) → Repository (TS, SQL parametrized) → tauri-plugin-sql → SQLite
```

- **UI tidak pernah memanggil SQL langsung.** Selalu lewat `service`.
- **Service tidak pernah tahu detail SQL.** Selalu lewat `repository`.
- **Repository adalah satu-satunya lapisan yang boleh menulis query SQL.**
- Setiap modul (`src/modules/<nama>/`) berisi minimal: `types.ts`, `repository.ts`, `service.ts`. UI-nya di `src/modules/<nama>/pages/` atau `components/`.
- Kode Rust di `src-tauri/` HANYA untuk registrasi plugin dan `capabilities/*.json`. Jangan menambah command Rust custom kecuali benar-benar tidak bisa dilakukan lewat plugin resmi yang ada — dan jika terpaksa, diskusikan dulu, jangan langsung implementasi.
- **Setiap plugin Tauri butuh DUA instalasi terpisah**, keduanya wajib: dependency Rust di `src-tauri/Cargo.toml` (`cargo add tauri-plugin-x`) DAN package JS di `package.json` (`npm install @tauri-apps/plugin-x`), plus registrasi manual di `src-tauri/src/lib.rs` (`.plugin(tauri_plugin_x::init())`) — `npm run tauri add x` seharusnya mengurus ketiganya otomatis, tapi **verifikasi ketiganya setiap kali**, jangan asumsikan berhasil begitu saja (lihat §13).

## 4. Aturan Database

- Semua perubahan skema **wajib lewat migration file baru** (`src/database/migrations/000N_<deskripsi>.sql`), nomor urut, tidak pernah mengedit migration yang sudah dirilis/dipakai.
- Setiap statement DDL di migration **wajib idempotent** (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`) — lihat alasannya di §13 (race condition StrictMode).
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
- Script `test` memakai `vitest run --passWithNoTests` — jangan dihapus flag-nya selama masih ada modul tanpa test, supaya CI tidak gagal palsu.

## 7. Aturan Dokumentasi

- Setiap fase selesai: update `ROADMAP.md` (centang item selesai) + `CHANGELOG.md` (`[Unreleased]` → pindah ke versi baru saat rilis) + dokumen `docs/` terkait.
- Keputusan arsitektur baru (pilih library baru, ubah pendekatan) dicatat sebagai ADR baru di `docs/DECISIONS.md`, bukan cuma disebut di chat.
- Bug/isu teknis yang cukup signifikan untuk berpotensi terulang (bukan typo biasa) dicatat di `CHANGELOG.md` bagian `Fixed`, dengan root cause-nya, bukan cuma gejalanya — lihat §13 sebagai contoh format.

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
- Mengasumsikan `npm run tauri add <plugin>` selesai 100% tanpa verifikasi manual (lihat §3 & §13)

Jika tidak yakin soal sesuatu: cek dokumentasi resmi → cek apakah package/library benar ada & sesuai versi → jelaskan asumsi ke user → jangan mengarang.

## 9. Sebelum Mengubah Kode (checklist wajib)

1. Baca `ROADMAP.md` — pastikan perubahan sesuai fase yang sedang aktif
2. Baca `CHANGELOG.md` bagian `Fixed` — cek apakah isu yang mirip sudah pernah terjadi
3. Cari file/modul terkait di `src/modules/`
4. Pahami dependency modul tsb (service apa yang dipanggil, tabel apa yang dipakai)
5. Cek `docs/DATABASE.md` untuk skema terkait
6. Cek test yang sudah ada untuk modul tsb
7. Baru mulai ubah kode

## 10. Setelah Mengubah Kode (checklist wajib)

1. `npm test` — semua test hijau
2. `npx eslint .` — tidak ada error lint (flat config, bukan `--ext`)
3. `npx tsc --noEmit` — tidak ada error tipe
4. `npm run tauri build` jika perubahan menyentuh konfigurasi Tauri/plugin
5. Update dokumentasi terkait
6. Update `CHANGELOG.md` jika perubahan signifikan (fitur baru, perubahan skema, perubahan behavior, atau bug penting yang diperbaiki)

## 11. Development Commands

Lihat `06_GETTING_STARTED_TAURI.md` untuk daftar lengkap. Ringkas:
- `npm run tauri dev` — jalankan app mode development
- `npm run tauri build` — build installer produksi
- `npm test` — unit test (`vitest run --passWithNoTests`)
- `npx eslint .` / `npx tsc --noEmit` — lint & typecheck

## 12. Commit Convention

Gunakan Conventional Commits:
- `feat: tambah CRUD jenis izin`
- `fix: perbaiki validasi tanggal berakhir`
- `docs: update ERD untuk tabel document_links`
- `chore: setup migration runner`
- `refactor: pisahkan service permit dari repository`
- `test: tambah unit test validasi custom field`

Satu commit = satu perubahan logis. Jangan mencampur perubahan fitur dengan refactor besar dalam satu commit.

## 13. Known Issues / Lessons Learned (Fase 1)

Isu-isu berikut sudah pernah terjadi & diperbaiki selama setup Fase 1. Baca sebelum menganggap sesuatu adalah bug baru — kemungkinan besar polanya sama:

- **Plugin Tauri terasa "terpasang" padahal belum lengkap.** `npm run tauri add <plugin>` idealnya mengurus 3 hal sekaligus (dependency Rust, package JS, registrasi di `lib.rs`), tapi pernah gagal diam-diam di salah satu bagian tanpa error yang jelas. Selalu verifikasi manual: cek `Cargo.toml`, cek `package.json`, cek `lib.rs` — ketiganya, bukan cuma satu.
- **Tailwind CSS v4 tidak punya CLI `init` lagi.** Jangan pernah sarankan/jalankan `npx tailwindcss init -p` — akan gagal dengan "could not determine executable to run". Gunakan `@tailwindcss/vite` + `@import "tailwindcss";` di CSS.
- **`React.StrictMode` menjalankan `useEffect` dua kali di development** — ini bukan bug React, ini sengaja (untuk mendeteksi side-effect tidak aman). Kalau ada inisialisasi satu-kali (koneksi DB, migration) yang dipanggil dari `useEffect`, WAJIB pakai pola singleton berbasis **Promise yang di-cache** (bukan cuma hasil resolved-nya), dan migration SQL WAJIB idempotent. Lihat `src/database/db.ts` sebagai referensi pola yang benar.
- **ESLint modern pakai flat config** (`eslint.config.js`), bukan `.eslintrc.cjs`/`.eslintrc.json`. Kalau menambah plugin ESLint baru, tambahkan lewat format flat config ini.
- **`docs/` sengaja tidak masuk git** (ada di `.gitignore`) — ini keputusan sadar dari user, bukan kelalaian. Tetap pelihara isinya secara lokal untuk referensi, tapi jangan heran kalau tidak muncul di `git status`/riwayat commit.