# CLAUDE.md

Instruksi ini WAJIB dibaca oleh AI coding agent (atau developer manapun) sebelum mengubah kode di project ArchIzin. Jika ada perintah dari user yang bertentangan dengan dokumen ini, klarifikasi dulu sebelum jalan.

## 1. Project Overview

ArchIzin — aplikasi desktop offline untuk mengelola data perizinan, arsip/dokumen, rekapitulasi, pencarian, monitoring masa berlaku izin, dan pelaporan bagi perangkat daerah. Single device di awal, arsitektur disiapkan untuk berkembang ke LAN/multi-user/API di masa depan tanpa rewrite besar.

Status saat ini: **Fase 6 (Search/Filter/Sort) selesai, Fase 7 (Dashboard) berikutnya.** Cek `ROADMAP.md` untuk status detail per fase.

Dokumen acuan wajib dibaca sebelum kerja di area terkait:
- `docs/ARCHITECTURE.md` (turunan dari `02_ARCHITECTURE_PROPOSAL.md`) — versi lokal, tidak di-commit ke git (lihat §13)
- `docs/DATABASE.md` + `docs/ERD.md` (turunan dari `03_DATABASE_PROPOSAL.md`) — versi lokal
- `docs/UI_UX.md` (turunan dari `04_UI_UX_PROPOSAL.md`) — versi lokal
- `ROADMAP.md` — fase mana yang sedang aktif
- `CHANGELOG.md` — histori perubahan **dan histori bug/fix penting** (bagian `Fixed`) — baca dulu sebelum debug sesuatu yang terasa familiar, kemungkinan sudah pernah terjadi & didokumentasikan
- `DEFINITION_OF_DONE.md` — kriteria "selesai" per checkpoint, fase, dan rilis MVP, plus register utang teknis. WAJIB dicek sebelum menutup checkpoint atau fase.

## 2. Tech Stack (jangan diubah tanpa ADR baru di DECISIONS.md)

Tauri v2 · React 19 + TypeScript · Tailwind CSS v4 (via plugin Vite `@tailwindcss/vite`, BUKAN `tailwind.config.js`/`init -p` — sudah dihapus di v4) · `react-router-dom` (`HashRouter` — bukan `BrowserRouter`, lebih aman untuk desktop app Tauri) · Zustand (state global ringan spt `authStore` — field user yang login adalah **`currentUser`**, bukan `user`) · TanStack Query (SEMUA data-fetching WAJIB lewat `useQuery`/`useMutation`+`invalidateQueries`, bukan `useEffect`+`useState` manual — lihat §13) & TanStack Table (ter-install, dievaluasi di akhir Fase 6 — paginasi SQL sudah cukup, library ini belum benar-benar dipakai, lihat §13) · React Hook Form + Zod (ter-install, **belum benar-benar dipakai** — semua form sejauh ini pakai `useState` manual per field, lihat §13) · SQLite via `@tauri-apps/plugin-sql` (akses lewat `getDb()` di `src/database/db.ts`) · migration runner custom di TypeScript berbasis `PRAGMA user_version` (bukan Kysely di tahap awal) · Vitest · ESLint flat config (`eslint.config.js`, bukan `.eslintrc.cjs`) · Design system di `src/index.css` (Tailwind v4 `@theme` — palet kertas/tinta/teal, font IBM Plex Sans & Mono, component classes `btn-primary`/`field-input`/`panel`/`data-code`/`nav-item` — … PAKAI ini, jangan kembali ke `bg-blue-600`/`bg-slate-50` dkk Tailwind default. Varian tombol: `btn-primary` (aksi utama), `btn-secondary` (aksi biasa), `btn-danger` (hapus), `btn-sm` (di baris tabel/daftar); label form `field-label`; judul bagian `section-title`; baris daftar `item-row`. Tailwind v4 preflight membuat `<button>` polos tanpa gaya — selalu beri salah satu class tombol. Font IBM Plex di-bundle lokal via `@fontsource` (aplikasi offline, jangan kembali ke Google Fonts).

## 3. Arsitektur & Aturan Layering

```
UI (React) → Application Service (TS) → Repository (TS, SQL parametrized) → tauri-plugin-sql → SQLite
```

- **UI tidak pernah memanggil SQL langsung.** Selalu lewat `service`.
- **Service tidak pernah tahu detail SQL.** Selalu lewat `repository`.
- **Repository adalah satu-satunya lapisan yang boleh menulis query SQL.**
- Setiap modul (`src/modules/<nama>/`) berisi minimal: `types.ts`, `repository.ts`, `service.ts`. UI-nya di `src/modules/<nama>/pages/` atau `components/`.
- Kode Rust di `src-tauri/` untuk registrasi plugin dan `capabilities/*.json`, plus command custom yang **terbukti** tidak bisa dilakukan lewat plugin resmi. Yang ada saat ini: `hash_password`/`verify_password` (argon2), `grant_storage_scope`/`grant_file_scope` (perluas scope `fs` saat runtime), `open_in_default_app` (buka file/folder). Alasan tiga terakhir: scope plugin `fs`/`opener` statis, sedangkan path arsip dipilih user saat runtime (lihat §13, Fase 5). Command custom TIDAK digerbangi sistem ACL capabilities (beda dari command plugin). Menambah command baru: diskusikan dulu, dan ingat perubahan Rust/capabilities butuh restart penuh `tauri dev`.
- **Setiap plugin Tauri butuh DUA instalasi terpisah**, keduanya wajib: dependency Rust di `src-tauri/Cargo.toml` (`cargo add tauri-plugin-x`) DAN package JS di `package.json` (`npm install @tauri-apps/plugin-x`), plus registrasi manual di `src-tauri/src/lib.rs` (`.plugin(tauri_plugin_x::init())`) — `npm run tauri add x` seharusnya mengurus ketiganya otomatis, tapi **verifikasi ketiganya setiap kali**, jangan asumsikan berhasil begitu saja (lihat §13).
- **Sebelum menulis halaman/komponen baru yang memanggil service modul lain, selalu buka langsung `types.ts`/`service.ts` modul tsb dan cek nama fungsi & bentuk data persis** — jangan menebak dari dokumen walkthrough/planning lama, sekalipun dokumen itu ditulis untuk fase yang sama. Lihat §13 (Fase 4) untuk contoh nyata kegagalan pola ini.
- **Penegakan role:** setiap fungsi service yang MENGUBAH data wajib memanggil `assertCan(actor.role, <Action>)` di baris pertama (lihat `src/lib/permissions.ts` untuk daftar `Action` dan matriksnya), dan menerima parameter `actor: AuthUser` — bukan `currentUserId` mentah, karena `actor.id` juga dipakai untuk audit log. UI menyaring tombol/menu lewat `can()` dari matriks yang sama, tapi penegakan sesungguhnya ada di service, bukan di UI.
- **Validasi path:** `assertPathWithinRoot` (murni, di `src/lib/filesystem.ts`) wajib dipanggil sebelum membuka path apa pun yang berasal dari data user (`document_links.url`, `permit_records.lokasi_folder`) lewat `fs`/`opener`/command Rust. Saat ini ketat hanya untuk `link_type: "local"` — lihat §13 Fase 6.

## 4. Aturan Database

- Semua perubahan skema **wajib lewat migration file baru** (`src/database/migrations/000N_<deskripsi>.sql`), nomor urut, tidak pernah mengedit migration yang sudah dirilis/dipakai.
- Setiap statement DDL di migration **wajib idempotent** (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`) — lihat alasannya di §13 (race condition StrictMode).
- Field inti yang stabil → kolom asli. Field yang beda per jenis izin → lewat `custom_field_definitions` + `custom_field_values` (EAV typed), sesuai `docs/DATABASE.md`. **Jangan menambah kolom nullable baru di `permit_records` untuk kebutuhan satu jenis izin tertentu** — itu tandanya harus jadi custom field.
- Semua query WAJIB parametrized (`$1, $2, ...`), tidak ada string concatenation SQL.
- Delete pada data penting (permit_records, users) pakai soft delete (`deleted_at`), bukan hard delete, kecuali eksplisit diminta lain.
- Setiap perubahan skema: update migration → update `docs/DATABASE.md` & `docs/ERD.md` → catat di `CHANGELOG.md`.
- **Jangan asumsikan pola penamaan kolom konsisten antar tabel bahkan untuk konsep yang sama.** `roles` pakai `name`, `permit_status` pakai `code`. `permit_status` juga **tidak punya kolom `is_active`** — semua baris selalu jadi opsi valid. Selalu cek migration file-nya langsung.

## 5. Aturan Keamanan

- Semua akses file/URL dari data user (`document_url`, path folder) HARUS divalidasi sebelum diteruskan ke plugin `fs`/`opener`. **Terpasang sejak Fase 6**: `assertPathWithinRoot` menolak path di luar `storage_root` untuk `link_type: "local"`. Tipe lain (`network`/`http`/`gdrive`/`sharepoint`) ada di skema tapi belum ada fitur pembuat/pemvalidasinya — jangan asumsikan tervalidasi kalau fitur itu dibangun nanti.
- Password di-hash dengan argon2 (crate `argon2 = { version = "0.5.3", features = ["std"] }` — versi ini WAJIB dipin persis, lihat §13) — tidak pernah disimpan/di-log plaintext.
- Permission per role dicek di Application Layer (service), bukan hanya disembunyikan di UI.
- Jangan pernah menambahkan `tauri-plugin-shell` atau kemampuan eksekusi command arbitrary dari input user.

## 6. Aturan Testing

- Setiap service baru minimal punya unit test untuk logika validasi/bisnisnya (Vitest).
- Alur kritikal (create/update/delete data izin, import, backup/restore) butuh integration test terhadap DB SQLite sungguhan (bukan mock), memakai file DB temporary. Sampai akhir Fase 6 masih murni unit test (termasuk yang mock-based sejak Checkpoint 6.4) — **belum ada** integration test terhadap SQLite sungguhan maupun test komponen React. Lihat `DEFINITION_OF_DONE.md` bagian Piramida Test untuk rencana adapter DB yang dibutuhkan sebelum integration test pertama bisa ditulis.
- Jangan menghapus test yang gagal hanya supaya build hijau — perbaiki kodenya atau diskusikan dulu.
- Script `test` memakai `vitest run --passWithNoTests` — jangan dihapus flag-nya selama masih ada modul tanpa test, supaya CI tidak gagal palsu. **Perhatikan penulisannya persis: `--passWithNoTests` (ada huruf "s" di akhir) — pernah salah ketik jadi `--passWithNoTest` dan menghasilkan `CACError: Unknown option`.**

## 7. Aturan Dokumentasi

- Setiap fase selesai: update `ROADMAP.md` (centang item selesai) + `CHANGELOG.md` (`[Unreleased]` → pindah ke versi baru saat rilis) + dokumen `docs/` terkait.
- Keputusan arsitektur baru (pilih library baru, ubah pendekatan) dicatat sebagai ADR baru di `docs/DECISIONS.md`, bukan cuma disebut di chat.
- Bug/isu teknis yang cukup signifikan untuk berpotensi terulang (bukan typo biasa) dicatat di `CHANGELOG.md` bagian `Fixed`, dengan root cause-nya, bukan cuma gejalanya — lihat §13 sebagai contoh format.
- Register utang di `DEFINITION_OF_DONE.md` diperbarui di setiap penutupan fase. Utang yang lewat batas "harus lunas" tanpa dijadwalkan ulang secara tertulis menghalangi penutupan fase berikutnya.

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
- **Menebak nama fungsi/field/signature dari dokumen walkthrough atau planning lama tanpa membuka kode `types.ts`/`service.ts` yang sebenarnya** (lihat §13, Fase 4)

Jika tidak yakin soal sesuatu: cek dokumentasi resmi → cek apakah package/library benar ada & sesuai versi → jelaskan asumsi ke user → jangan mengarang.

## 9. Sebelum Mengubah Kode (checklist wajib)

1. Baca `ROADMAP.md` — pastikan perubahan sesuai fase yang sedang aktif
2. Baca `CHANGELOG.md` bagian `Fixed` — cek apakah isu yang mirip sudah pernah terjadi
3. Cari file/modul terkait di `src/modules/`
4. **Buka langsung `types.ts` dan `service.ts` modul yang akan dipanggil — jangan andalkan dokumen walkthrough/planning lama untuk nama fungsi atau bentuk data**
5. Pahami dependency modul tsb (service apa yang dipanggil, tabel apa yang dipakai)
6. Cek `docs/DATABASE.md` untuk skema terkait
7. Cek test yang sudah ada untuk modul tsb
8. Baru mulai ubah kode

## 10. Setelah Mengubah Kode (checklist wajib)

1. `npm test` — semua test hijau
2. `npx eslint .` — tidak ada error lint (flat config, bukan `--ext`)
3. `npx tsc --noEmit` — tidak ada error tipe
4. `npm run tauri build` jika perubahan menyentuh konfigurasi Tauri/plugin
5. Update dokumentasi terkait
6. Update `CHANGELOG.md` jika perubahan signifikan (fitur baru, perubahan skema, perubahan behavior, atau bug penting yang diperbaiki)
7. Cek `DEFINITION_OF_DONE.md` Level 1 sebelum menyatakan checkpoint selesai (dan Level 2 sebelum menutup fase). Sertakan "bukti selesai" sesuai templatnya, dan perbarui register utang bila ada utang baru atau yang lunas.

> Jalankan langkah 1–3 dari terminal langsung (bukan hanya mengandalkan panel "Problems" di editor) — panel editor bisa menunjukkan error basi kalau TS server belum di-restart setelah file baru dibuat.

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

## 13. Known Issues / Lessons Learned

Isu-isu berikut sudah pernah terjadi & diperbaiki. Baca sebelum menganggap sesuatu adalah bug baru — kemungkinan besar polanya sama:

### Fase 1
- **Plugin Tauri terasa "terpasang" padahal belum lengkap.** `npm run tauri add <plugin>` idealnya mengurus 3 hal sekaligus (dependency Rust, package JS, registrasi di `lib.rs`), tapi pernah gagal diam-diam di salah satu bagian tanpa error yang jelas. Selalu verifikasi manual: cek `Cargo.toml`, cek `package.json`, cek `lib.rs` — ketiganya, bukan cuma satu.
- **Tailwind CSS v4 tidak punya CLI `init` lagi.** Jangan pernah sarankan/jalankan `npx tailwindcss init -p` — akan gagal dengan "could not determine executable to run". Gunakan `@tailwindcss/vite` + `@import "tailwindcss";` di CSS.
- **`React.StrictMode` menjalankan `useEffect` dua kali di development** — ini bukan bug React, ini sengaja (untuk mendeteksi side-effect tidak aman). Kalau ada inisialisasi satu-kali (koneksi DB, migration) yang dipanggil dari `useEffect`, WAJIB pakai pola singleton berbasis **Promise yang di-cache** (bukan cuma hasil resolved-nya), dan migration SQL WAJIB idempotent. Lihat `src/database/db.ts` sebagai referensi pola yang benar.
- **ESLint modern pakai flat config** (`eslint.config.js`), bukan `.eslintrc.cjs`/`.eslintrc.json`. Kalau menambah plugin ESLint baru, tambahkan lewat format flat config ini.
- **`docs/` sengaja tidak masuk git** (ada di `.gitignore`) — ini keputusan sadar dari user, bukan kelalaian. Tetap pelihara isinya secara lokal untuk referensi, tapi jangan heran kalau tidak muncul di `git status`/riwayat commit.
- **`cargo add <crate>` tanpa versi bisa mengambil release candidate yang API-nya belum stabil.** Ini terjadi pada `argon2` — versi default yang ter-install (`0.6.0`) adalah RC dengan API `SaltString`/`rand_core` yang berubah-ubah antar sub-versi & fitur default yang berbeda dari versi stabil sebelumnya, menyebabkan 3 ronde error berantai (`unresolved import`, argumen method berubah, `OsRng` tidak ketemu). **Solusi final: pin `argon2 = { version = "0.5.3", features = ["std"] }`** — versi stabil, dipakai luas, terverifikasi jalan di project ini. Pelajaran umum: untuk dependency kriptografi/keamanan, SELALU pin versi eksplisit yang sudah stabil lama, jangan biarkan cargo pilih versi terbaru begitu saja.
- **Migration runner bisa "berhasil" tanpa error padahal diam-diam skip statement.** Pola lama `sql.split(";").filter(s => !s.startsWith("--"))` membuang SELURUH potongan kalau potongan itu diawali baris komentar — walau ada `INSERT`/`CREATE` sungguhan di baris berikutnya dalam potongan yang sama. Akibatnya `roles` sempat kosong tanpa ada pesan error sama sekali. Pola yang benar (sudah diterapkan di `migrate.ts`): buang semua baris komentar dari keseluruhan SQL dulu (`stripComments`), baru pecah jadi statement. **Kalau menulis migration baru dan curiga seed/insert tidak jalan padahal tidak ada error, cek dulu apakah ada baris komentar `--` tepat sebelum statement tsb.**
- **Nama kolom harus dicek langsung ke file migration, jangan diasumsikan konsisten antar tabel.** `permit_status` pakai kolom `code`, tapi `roles` pakai kolom `name` untuk hal yang secara konsep sama (identifier role/status). Sebelum menulis query baru ke tabel manapun, buka `src/database/migrations/000N_*.sql` dan cek definisi kolomnya persis — jangan menebak dari pola tabel lain.
- **Kalau mengganti isi `App.tsx` (atau file entry point lain) secara total, cek dulu baris `import "./App.css"` / `"./index.css"` tidak ikut hilang.** Ini sempat menyebabkan Tailwind CSS "hilang" padahal konfigurasinya benar — CSS-nya memang tidak pernah di-import lagi setelah file ditimpa.
- **Setelah login/aksi berhasil, state boleh sudah benar tapi UI terasa "diam" kalau tidak ada navigasi eksplisit.** `LoginPage` sempat tidak pindah halaman walau `setUser()` sudah sukses — solusinya `navigate("/", { replace: true })` dari `useNavigate()` setelah state di-set, bukan mengandalkan re-render otomatis membawa ke halaman lain.

### Fase 3
- **JANGAN pakai `useEffect(() => { load() }, [])` untuk data-fetching.** ESLint (`react-hooks/set-state-in-effect`) akan menolaknya. Pola wajib: `useQuery({ queryKey: [...], queryFn: ... })` dari TanStack Query untuk baca data, dan `queryClient.invalidateQueries({ queryKey: [...] })` setelah create/update/delete untuk refresh. Semua halaman baru (Fase 4 dst) ikuti pola ini dari awal, jangan tulis manual lagi.
- **Hapus data anak (child rows) secara manual di kode, jangan andalkan `ON DELETE CASCADE`** — skema ArchIzin tidak memakainya di mana pun (konsisten, semua `REFERENCES` polos). Contoh: `custom-fields/repository.ts` → `deleteDefinition()` menghapus `custom_field_options` dulu sebelum menghapus definisinya. Ikuti pola yang sama untuk tabel lain yang punya relasi anak.

### Fase 4
- **PostCSS "@import statements must precede all other statements"** bisa muncul walau urutan `@import` di file sudah benar, kalau `@import url(...)` (Google Fonts) digabung dengan `@import "tailwindcss";` di file yang sama — Tailwind v4 meng-expand importnya jadi banyak sub-import yang rapuh terhadap Vite HMR. **Solusi: Google Fonts selalu lewat `<link>` di `index.html`, jangan pernah `@import url(...)` di CSS yang juga mengimpor Tailwind.**
- **Dokumen walkthrough/planning yang ditulis tanpa melihat kode asli bisa salah menebak nama fungsi/field**, bahkan untuk modul yang ditulisnya sendiri di fase sebelumnya. Terjadi cukup parah di Bagian E Fase 4: hampir semua nama fungsi (`listPermitRecords` vs `getPermitRecords`, dst.) dan bentuk field (`PermitRecordFormInput` pakai penamaan Indonesia campuran, bukan camelCase Inggris penuh) meleset dari draf. **Aturan wajib sekarang: sebelum menulis halaman/komponen apa pun yang memanggil modul lain, buka dulu `types.ts`/`service.ts` modul tsb, jangan pernah menebak dari dokumen lama** (lihat juga §3 & §9).
- **`react-hooks/set-state-in-effect` bisa kena lagi di luar kasus data-fetching murni** — kali ini saat mengisi form dari hasil query yang butuh transformasi data dulu (`useEffect(() => setForm(transform(detail)), [detail])`). TanStack Query saja tidak cukup menghindarinya kalau tetap ada `useEffect`+`setState` di belakangnya. **Pola fix: split komponen jadi luar (tunggu query) dan dalam (terima `initialForm` sebagai prop, `useState(initialForm)` langsung), pasang `key={id ?? "new"}` pada komponen dalam supaya remount total tiap `id` berganti** — dengan begitu inisialisasi state tidak butuh efek sama sekali. Pola ini dipakai di `PermitRecordFormPage`/`PermitRecordFormInner`, jadikan referensi untuk kasus serupa di fase berikutnya.
- **Menambah routing baru di `App.tsx` tidak otomatis membuatnya bisa diakses dari UI** — kalau `AppLayout.tsx` `navItems` tidak diupdate, tidak ada tombol/menu yang mengarah ke halaman baru meski route-nya valid dan bisa diakses lewat URL langsung. **Checklist tambahan saat menambah halaman baru: selain routing di `App.tsx`, cek juga apakah perlu entry baru di `navItems`.**
- **`tsc --noEmit` dari terminal adalah sumber kebenaran, bukan panel "Problems" di editor.** Panel editor bisa menampilkan error basi (file baru belum dikenali TS server) padahal sebenarnya sudah tidak ada error — sempat menimbulkan kebingungan soal apakah modul `permit-status` benar-benar hilang atau cuma belum ke-refresh. Kalau ragu, restart TS server ATAU langsung percaya hasil `npx tsc --noEmit` dari terminal.
- **Gap nyata dikonfirmasi (bukan sekadar belum sempat)**: `custom_field_options` (tabel untuk opsi dropdown `select`/`multiselect`) — `listOptions`/`addOption` di `custom-fields/repository.ts` tidak pernah di-wrap ke `service.ts` dan tidak pernah dipakai di UI manapun sejak Fase 3. `DynamicFieldInput` untuk tipe `select`/`multiselect` sementara fallback ke `<input type="text">` biasa. Belum dikerjakan sampai ada keputusan eksplisit — lihat `ROADMAP.md` Fase 3/4.
**Update Fase 5:** font sekarang di-bundle lokal via `@fontsource` (import di `main.tsx`), bukan `<link>` Google Fonts — aplikasi ini offline-first, jadi jangan kembali ke font dari internet.

### Fase 5
- **Scope `fs` Tauri v2 bersifat statis; path yang dipilih user saat runtime tidak bisa didaftarkan di capabilities.** Gejala: `forbidden path: ..., maybe it is not allowed on the scope for allow-exists permission`. Solusi resmi: command Rust yang memanggil `FsExt::fs_scope().allow_directory(path, true)` (folder) atau `.allow_file(path)` (satu file), dipanggil dari JS lewat `invoke`. Scope dinamis **tidak persisten antar restart** — `grant_storage_scope` harus dipanggil ulang tiap app dibuka (`useBootStatus` di `App.tsx`) dan saat storage_root baru diset. Setiap kali menyentuh path di luar `storage_root` (mis. file sumber yang dipilih user), panggil `grantFileScope` dulu.
- **`fs:default` tidak mencakup semua command.** `rename` dan `copy-file` harus ditambah eksplisit di `capabilities/default.json` (`fs:allow-rename`, `fs:allow-copy-file`). Pesan errornya `fs.rename not allowed. Permissions associated with this command: ...` — daftar permission di pesan itu menunjukkan apa yang bisa ditambahkan. Cek pola yang sama untuk command fs lain sebelum dipakai (`remove`, `read-dir`, dst).
- **`opener:default` hanya mencakup buka URL dan `reveal-item-in-dir`, TIDAK `open-path`**, dan scope opener juga statis. Buka file/folder lokal dari path runtime pakai `openInDefaultApp()` (command Rust `open_in_default_app`), bukan `openPath` dari plugin JS.
- **Setelah `@tauri-apps/plugin-dialog` dipakai, `confirm()`/`alert()` bawaan browser gagal** (`dialog.confirm not allowed. Command not found`). Pakai `import { confirm } from "@tauri-apps/plugin-dialog"` — async (`await confirm(pesan, { title, kind })`), bukan `confirm()` global. Berlaku untuk seluruh aplikasi; tombol Hapus lama ikut rusak begitu plugin dipakai. Cek semua pemanggilan `confirm`/`alert` kalau menambah halaman baru.
- **Perubahan `lib.rs`, `Cargo.toml`, dan `capabilities/*.json` butuh stop total lalu jalankan ulang `npx tauri dev`** (Rust compile ulang). HMR hanya untuk kode frontend. Kalau perubahan Rust terasa "tidak berefek", cek dulu apakah proses lama masih jalan.
- **Pembuatan folder fisik sengaja NON-BLOCKING** (`ensurePermitFolder` menangkap error dan mengembalikan `null`): kegagalan filesystem tidak boleh membuat data izin yang sudah diketik user hilang. Konsekuensinya `lokasi_folder` bisa `NULL` tanpa error yang terlihat di UI — gejala "folder tidak terbuat tapi tidak ada error" berarti cek console dan kolom `lokasi_folder`. Ini pengecualian sadar dari larangan menelan error di §8. Utang: `resolveTargetPath` return `null` tanpa log kalau storage/template belum siap.
- **Data izin yang dibuat sebelum fix scope punya `lokasi_folder` NULL dan tidak otomatis diperbaiki.** Belum ada tombol "Buat Folder" manual; halaman detail hanya menampilkan pesan info. Saat diedit, record ini juga tidak memicu dialog rename (tidak ada folder lama untuk dibandingkan).
- **Hapus data izin adalah soft delete** — baris tetap ada di tabel dengan `deleted_at` terisi; query manual di DB Browser tanpa `WHERE deleted_at IS NULL` tetap menampilkannya. Bukan bug.
- **Hapus tautan dokumen TIDAK menghapus file fisik** (keputusan sadar, supaya tidak ada risiko kehilangan dokumen asli). Kalau nanti ada fitur hapus file fisik, buat sebagai aksi terpisah dengan konfirmasi ekstra.
- **`react-hooks/set-state-in-effect` kena lagi (ketiga kali)** di boot flow `App.tsx`. Aturan praktis: jangan tulis `useEffect` yang memanggil `setState` untuk memuat data; pakai `useQuery` (data eksternal) atau key-remount (inisialisasi state dari data).
- **`buildFolderPath` memakai pemisah `\`** — asumsi Windows-only. Kalau nanti cross-platform, ganti dengan API path Tauri.
- **`<input type="number">` tanpa `step` menolak nilai desimal** (validasi bawaan browser). Field bertipe `decimal` di `DynamicFieldInput` memakai `step="any"`.
- **Tailwind v4 preflight**: `<button>` tanpa class tampil sebagai teks polos dan kursornya panah. Design system sekarang punya `btn-*` dan aturan kursor; selalu beri class tombol.


### Fase 6
- **Pola `actor: AuthUser` di service, bukan `currentUserId: number`.** Setiap fungsi service yang mengubah data menerima `actor`, memanggil `assertCan(actor.role, <Action>)` di baris pertama (sebelum `await` apa pun — supaya bisa ditest tanpa mock DB, lihat pola test di `*.service.test.ts`), dan memakai `actor.id` untuk audit log. Kalau menambah fungsi mutasi baru, ikuti pola ini dari awal, jangan tambah `userId` terpisah.
- **Command Rust custom tidak digerbangi ACL capabilities** — berlaku untuk `hash_password`/`verify_password` sejak Fase 2, dan dikonfirmasi lagi untuk `grant_storage_scope` dkk di Fase 5. Jangan tambah entri capabilities untuk command custom; itu memang tidak diperlukan.
- **`is_required`/`is_active`/kolom boolean-like lain dari SQLite bertipe `number` (0/1), bukan `boolean`.** Ekspresi React `{kondisi && <Elemen/>}` merender literal `"0"` kalau `kondisi` adalah angka `0` (beda dari `false`/`null`/`undefined` yang tidak merender apa-apa). **Selalu bungkus `Boolean(...)` dulu** sebelum dipakai di posisi kondisional JSX — jangan asumsikan nilai dari DB sudah jadi boolean asli di JS.
- **Opsi custom field (`custom_field_options`) memakai soft delete (`is_active`), bukan hard delete** — keputusan direvisi di tengah Checkpoint 6.5 sebelum sempat dipakai pengguna sungguhan. Alasannya sama dengan `permit_records`: `custom_field_values.value_text` menyimpan **string nilai mentah**, bukan foreign key ke baris opsi, jadi menghapus baris opsi berarti kehilangan makna label data lama secara permanen. Pola ini jadi acuan: kalau sebuah tabel referensi dirujuk lewat **nilai**, bukan **id**, dari tabel lain, defaultkan ke soft delete.
- **Menampilkan nilai `select`/`multiselect` di luar form (halaman detail, laporan, dsb) butuh mengambil ulang opsi dan mencocokkan value→label** — nilai yang tersimpan (`value_text`) adalah value mentah opsi, bukan label yang user lihat. `multiselect` tersimpan sebagai string JSON array. Ambil opsi lewat fungsi yang **menyertakan opsi nonaktif** (`getAllOptionsForDefinitions`, bukan `getOptionsForField`) supaya histori tetap terbaca meski opsinya sudah dinonaktifkan.
- **Semua hook React (`useState`/`useMemo`/`useQuery`/dst.) wajib dipanggil sebelum early-return apa pun** (`if (isLoading) return ...`, `if (!data) return ...`) — melanggar ini menghasilkan "Rendered more hooks than during the previous render" yang membuat komponen crash total begitu kondisi early-return itu aktif. Ini bukan error yang langsung kelihatan saat menulis kode; baru muncul saat kondisinya benar-benar terpicu. Kalau menambah hook baru ke komponen yang sudah punya early-return, selalu taruh di **atas** blok `if` pertama yang bisa `return`.
- **Paginasi dan virtualisasi tabel menyelesaikan masalah yang sama dari dua arah.** Begitu daftar sudah dibatasi lewat `LIMIT`/`OFFSET` di SQL (bukan di-fetch semua lalu disaring di client), jumlah baris yang pernah ada di DOM otomatis terbatas ke `pageSize` — virtualisasi jadi tidak perlu. Jangan pasang keduanya tanpa alasan konkret; evaluasi daftar yang sudah dipaginasi dulu sebelum menganggap tabel butuh virtualisasi.
- **Saat test gagal, cek dulu di sisi mana bug-nya sebelum mengubah kode produksi.** Tiga kali terjadi di Fase 6: dua kali salah hitung nomor placeholder SQL di assertion test, satu kali helper test tanggal salah zona waktu (`toISOString()` mengonversi ke UTC, pakai komponen tanggal lokal langsung kalau test butuh "hari ini + N hari" dalam zona waktu lokal). Semua kasus ini kode produksinya sudah benar sejak awal.
- **Kalau mock sebuah modul dengan `vi.mock(path, factory)`, pastikan SEMUA fungsi yang dipanggil kode yang ditest benar-benar disebut ulang di dalam factory-nya.** Nama yang tidak disebut ulang akan jatuh ke implementasi asli (lewat `...actual` dari `importOriginal`) — kalau fungsi aslinya memanggil plugin Tauri sungguhan, hasilnya bukan `vi.fn()` dan `.mockResolvedValue` akan error "is not a function", bukan mock yang diam-diam gagal.