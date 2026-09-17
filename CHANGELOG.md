# Changelog

Semua perubahan signifikan pada project ArchIzin dicatat di sini.
Format mengikuti [Keep a Changelog](https://keepachangelog.com/), dengan kategori: Added, Changed, Fixed, Removed, Security.

## [Unreleased]

### Added
- Dokumen Fase 0 (Discovery & Architecture): technology evaluation, architecture proposal, database proposal, UI/UX proposal, implementation plan
- `ROADMAP.md`, `CLAUDE.md`, tutorial `06_GETTING_STARTED_TAURI.md` dan `07_FOUNDATION_WALKTHROUGH.md`
- Fase 1 (Foundation) selesai: scaffold project Tauri v2 + React + TS, struktur folder modul, migration runner TypeScript + migration baseline `0001_init.sql` (19 tabel + index + seed roles/permit_status), setup ESLint (flat config)/typecheck/Vitest
- `.gitignore`: `docs/` sengaja dikeluarkan dari repo (dipakai lokal saja, tidak di-push)

### Changed
- (belum ada)

### Fixed
Beberapa isu ditemukan & diperbaiki selama setup Fase 1 — dicatat di sini supaya tidak terulang di fase berikutnya:
- **Plugin SQL tidak terdaftar di `lib.rs`**: `npm run tauri add sql` sempat hanya menambah dependency di `Cargo.toml` tanpa ikut menyisipkan `.plugin(tauri_plugin_sql::Builder::default().build())` di `src-tauri/src/lib.rs`. Ditambahkan manual.
- **Paket JS `@tauri-apps/plugin-sql` belum ter-install**: sisi Rust (`Cargo.toml`) dan sisi JS (`package.json`) adalah dua instalasi terpisah untuk plugin yang sama — keduanya wajib ada. Diinstall manual via `npm install @tauri-apps/plugin-sql`.
- **`npx tailwindcss init -p` gagal ("could not determine executable to run")**: command `init` sudah dihapus total di Tailwind CSS v4. Diganti dengan pendekatan plugin Vite resmi (`@tailwindcss/vite` + `@import "tailwindcss";` di CSS, tanpa `tailwind.config.js`).
- **`table roles already exists` saat startup**: root cause race condition dari `React.StrictMode` yang menjalankan `useEffect` dua kali di development, menyebabkan migration terpanggil dua kali hampir bersamaan sebelum `PRAGMA user_version` sempat ter-update. Diperbaiki dua lapis: (1) `src/database/db.ts` men-cache **Promise** inisialisasi (bukan hasil resolved-nya) supaya panggilan concurrent menunggu proses yang sama; (2) semua statement di migration diubah jadi idempotent (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`).
- **ESLint tidak ter-install**: scaffold `create-tauri-app` versi ini tidak otomatis menyertakan ESLint. Dipasang manual dengan **flat config** (`eslint.config.js`) — bukan `.eslintrc.cjs` (format lama, sempat salah disarankan di awal).
- **`vitest run` exit code 1 saat belum ada test**: default Vitest menganggap "no test files" sebagai kegagalan. Ditambahkan flag `--passWithNoTests` di script `test`.
- **File nyasar `src-tauri/2`**: file kosong tidak sengaja ke-generate (kemungkinan dari output redirect yang salah ketik di salah satu command sebelumnya), sempat ikut ter-commit. Dihapus.
- **`.gitignore` ada baris menyatu**: `*.local` dan `src-tauri/target/` sempat ke-paste jadi satu baris (`*.localsrc-tauri/target/`), membuat pattern `*.local` tidak match apa pun. Diperbaiki jadi dua baris terpisah. (`src-tauri/target/` tetap aman karena ada `src-tauri/.gitignore` bawaan Tauri.)

### Removed
- File nyasar `src-tauri/2` (lihat Fixed)

### Security
- (belum ada)