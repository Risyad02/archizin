# Menjalankan ArchIzin di Windows

Panduan berdasarkan repository `Risyad02/archizin`, branch `master`, baseline `cec259899b26f2cc3dbf743c23f25809873335e6`. Disusun 23 Oktober 2026.

## 1. Status proyek

Proyek sudah menggunakan Tauri 2, React 19, TypeScript, Tailwind CSS 4 dan SQLite. Tidak perlu membuat scaffold baru atau memindahkan kode Electron ke repository ini.

Dokumentasi ROADMAP mencatat Fase 8 (rekapitulasi) selesai; berikutnya Fase 9 (impor/ekspor). Ini bukan pernyataan bahwa seluruh aplikasi telah siap produksi.

Sudah terdapat kode untuk setup administrator pertama, login/logout, jenis izin, kolom dinamis, data izin, dokumen lokal, pencarian, dashboard, rekap dan audit.

Belum tersedia pada baseline: lupa password/pemulihan akses, pilihan tanpa login, backup/restore terpadu, impor/ekspor lengkap, serta penggantian nama melalui satu konfigurasi. Keberadaan dependensi Excel/CSV atau tabel backup tidak berarti fitur tersebut sudah berfungsi.

## 2. Persiapan Windows

Pasang alat dari sumber resmi:

| Alat | Keterangan |
|---|---|
| Git for Windows | https://git-scm.com/downloads/win |
| Node.js seri 24 LTS | https://nodejs.org/en/download |
| Rust melalui rustup | https://rustup.rs/ |
| Microsoft C++ Build Tools | Ikuti https://v2.tauri.app/start/prerequisites/ — pilih workload Desktop development with C++, MSVC dan Windows SDK. |
| Microsoft Edge WebView2 Runtime | Diperlukan untuk antarmuka Tauri di Windows; ikuti prasyarat resmi di atas. |
| Visual Studio Code | Opsional: https://code.visualstudio.com/ |

Gunakan toolchain Rust MSVC yang sesuai arsitektur Windows Anda. Developer memerlukan Rust dan C++ Build Tools; pengguna installer biasanya tidak memerlukan toolchain pengembangan tersebut.

Tutup terminal lama setelah instalasi. Buka Command Prompt (CMD) baru, lalu periksa:

```bat
git --version
node --version
npm --version
rustc --version
cargo --version
rustup show
```

Panduan ini menggunakan npm. Tidak perlu memasang pnpm. Jalankan secara native di Windows, bukan WSL.

## 3. Ambil source

Jika belum memiliki salinan lokal:

```bat
cd /d C:\Projects
git clone https://github.com/Risyad02/archizin.git
cd archizin
git status --short --branch
```

Buat folder C:\Projects dahulu jika belum ada, atau gunakan direktori kerja Anda sendiri.

Jika sudah memiliki salinan yang sedang dikerjakan, buka folder itu dan periksa `git status` dahulu. Jangan clone menimpa pekerjaan lama, menjalankan reset/clean, atau menarik perubahan tanpa meninjau perubahan lokal.

Branch default repository adalah **master**, bukan main. Tutorial ini tidak mengubah nama repository `archizin`.

## 4. Instal dependensi

Di folder yang berisi package.json:

```bat
npm ci
```

Perintah mengikuti package-lock.json dan membuat node_modules. Jangan menjalankan npm init, create-tauri-app, atau scaffold lain di atas proyek ini.

Unduhan npm dan crate Rust memerlukan internet pada persiapan awal. Aplikasi kemudian dapat mengelola data lokal secara offline. Build pertama dapat memerlukan unduhan tambahan.

## 5. Pemeriksaan awal

```bat
npm test
npm run lint
npm run typecheck
npm run build
```

Keempat script benar-benar tersedia di package.json.

Baseline pemeriksaan pada lingkungan Linux dengan Node 24:
- 34 file tes lulus; 277 pengujian lulus dan 1 dilewati.
- Satu tes dilewati karena syarat zona waktu yang sudah dicatat di proyek, bukan dihapus.
- Lint, typecheck, dan build frontend lulus.

`npm run build` membangun antarmuka Vite; perintah ini belum membuktikan bahwa Rust, jendela Tauri, atau installer Windows berhasil.

## 6. Jalankan desktop

```bat
npm run tauri -- dev
```

Script tauri memanggil CLI Tauri. Konfigurasi menjalankan Vite otomatis pada tahap pengembangan. Jangan hanya memakai npm run dev bila ingin menguji database, filesystem, dan dialog desktop.

Build Rust pertama bisa lebih lama. Jendela aplikasi seharusnya terbuka setelah kompilasi selesai.

## 7. Alur pertama kali

Berdasarkan kode App.tsx saat ini:
1. Jika belum ada pengguna, muncul **Buat Akun Admin Pertama**.
2. Isi nama lengkap, username dan password. Validasi baseline: username minimal 3 karakter dengan huruf/angka/titik/underscore; password minimal 8 karakter.
3. Tentukan lokasi arsip melalui **Setup Lokasi Penyimpanan**.
4. Masuk melalui login.
5. Buka dashboard dan modul lainnya.

Tidak ada akun atau password bawaan. Setup administrator pertama berfungsi sebagai pendaftaran awal; belum ada pendaftaran publik atau pengelolaan pengguna lengkap.

Password di-hash menggunakan Argon2 melalui Rust. Sesi saat ini berada di memori Zustand dan hilang ketika proses aplikasi dimulai ulang.

**Penting:** baseline belum memiliki lupa password. Simpan kredensial uji dengan aman. Jangan menghapus database untuk memulihkan akun yang terkunci. Rancangan berikutnya adalah kode pemulihan offline dan pilihan perlindungan password; keduanya belum diimplementasikan.

## 8. Uji fitur dengan data contoh

1. Tambahkan dua jenis izin.
2. Tambahkan kolom khusus yang berbeda untuk masing-masing jenis, beserta opsi jika bertipe select/multiselect.
3. Buat izin dengan nomor yang memiliki nol di awal.
4. Periksa form dinamis, detail, edit, pencarian dan filter.
5. Tambahkan salinan file contoh melalui bagian dokumen.
6. Periksa folder, buka file, dan cek status file yang tidak ditemukan.
7. Buka rekap bulanan/triwulanan/semester/tahunan.
8. Klik angka rekap; jumlah daftar tujuan harus sama dengan angka tersebut.
9. Periksa audit perubahan.
10. Tutup dan buka ulang aplikasi, login, dan pastikan data tetap tersedia.

Jangan menganggap soft delete sudah menyediakan UI pemulihan/tempat sampah. Periksa kemampuan aktual sebelum menghapus data penting.

Penghapusan tautan dokumen saat ini tidak menghapus file fisiknya. Perubahan nomor/nama/tanggal yang memengaruhi nama folder mengikuti konfirmasi rename yang sudah ada.

Pemeriksaan desktop ini perlu dilakukan langsung di Windows. Panduan tidak menggantikan bukti uji manual.

## 9. Database dan arsip adalah dua lokasi berbeda

- Database dibuka sebagai `sqlite:archizin.db` melalui plugin SQL Tauri.
- Identitas aplikasi saat ini `id.pemda.archizin`.
- Folder arsip dipilih pengguna melalui wizard penyimpanan.

Jangan menganggap semua data berada di folder arsip pilihan pengguna. Untuk pencadangan, database dan salinan dokumen harus diperhitungkan bersama. Lokasi dasar database mengikuti resolusi direktori plugin SQL pada sistem, bukan folder repository.

Backup/restore terpadu belum selesai. Sebelum perubahan penting, tutup aplikasi dan buat salinan database beserta file pendamping yang masih ada serta folder arsip. Jangan menyalin satu file database aktif lalu menganggap cadangannya konsisten. Uji pemulihan pada salinan data, bukan data utama.

## 10. Nama sementara Archive Izin

Kebutuhan baru: nama tampilan Archive Izin dari satu konfigurasi, dengan identitas teknis tetap.

Pada baseline, nama masih tersebar pada:
- src-tauri/tauri.conf.json: productName dan title.
- Halaman login, setup administrator, setup penyimpanan, dan layout.

Pemusatan nama belum diterapkan oleh perubahan dokumentasi ini. Saat diimplementasikan, label dan judul dapat berubah tetapi identifier `id.pemda.archizin`, database `archizin.db`, lokasi data, dan referensi arsip harus tetap. Mengganti identifier atau nama database dapat membuat aplikasi membuka lokasi berbeda sehingga data seolah hilang.

Repository yang diberikan pengguna tetap digunakan sebagai `archizin`. Penggantian nama repository menjadi archive-izin merupakan tindakan terpisah dan tidak diperlukan agar nama tampilannya bisa diganti.

## 11. Build installer

Setelah tes dan uji desktop berhasil:

```bat
npm run tauri -- build
```

Hasil bundle umumnya ada di `src-tauri\target\release\bundle`, bergantung target/config yang dipakai. Baca keluaran CLI untuk lokasi artefak sebenarnya.

Konfigurasi baseline memiliki bundle.targets = all. Build installer Windows belum diverifikasi pada sesi pemeriksaan ini. Uji pada Windows yang sesuai sebelum distribusi.

Periksa:
- instalasi dan peluncuran;
- WebView2 tersedia atau strategi pemasangannya sesuai kebutuhan;
- login, database dan arsip tetap tersedia;
- pembaruan aplikasi tidak menghapus data;
- pembukaan file dan dialog bekerja;
- installer tidak bergantung pada Rust/Node di komputer pengguna.

Aplikasi offline tidak berarti installer pasti dapat berjalan tanpa internet: strategi distribusi WebView2 perlu ditentukan. Sertifikat code signing dan mekanisme update juga membutuhkan keputusan terpisah.

## 12. Melanjutkan pengembangan

Ikuti CLAUDE.md, ROADMAP.md, CHANGELOG.md dan DEFINITION_OF_DONE.md.

Arsitektur yang sudah dipakai:
UI React → service TypeScript → repository TypeScript → plugin SQL → SQLite.
Rust saat ini menangani plugin dan command tertentu, termasuk hashing dan filesystem. Jangan memindahkan seluruh akses data ke Rust tanpa keputusan arsitektur yang dicatat.

Prioritas baru yang direkomendasikan:
1. Pusatkan nama tampilan tanpa mengganti identitas penyimpanan.
2. Perkuat setup akun awal dan tambahkan pemulihan password offline.
3. Tambahkan mode pribadi tanpa login melalui pengaturan eksplisit, dengan profil lokal tetap untuk audit.
4. Tambahkan tes integrasi SQLite untuk alur tulis dan migrasi.
5. Lanjutkan backup/restore, arsip rekap manual, serta impor/ekspor dengan pemetaan data.

Mode tanpa login belum merupakan perilaku baseline. Jangan membuat bypass otomatis ketika login gagal atau ketika password hilang.

Dokumen arsitektur/database di direktori docs sengaja tidak di-commit menurut aturan proyek. Jika salinan lokal dokumen itu tersedia di komputer pengembang, gunakan sebagai pelengkap sebelum mengubah arsitektur/skema; jangan menganggap isi yang tidak ada sudah dibaca.

## 13. Pemecahan masalah

| Gejala | Langkah |
|---|---|
| node/npm/rustc tidak dikenali | Buka terminal baru; periksa PATH dan instalasi alat. |
| npm.ps1 diblokir | Gunakan CMD atau npm.cmd; tidak perlu menonaktifkan kebijakan sistem global. |
| package.json tidak ditemukan | Pastikan CMD berada dalam folder archizin. |
| linker/MSVC/SDK tidak ditemukan | Periksa workload C++ Build Tools dan toolchain MSVC. |
| Halaman browser muncul tetapi database gagal | Jalankan npm run tauri -- dev, bukan hanya Vite. |
| tauri dev gagal sesudah perubahan plugin/Rust | Tutup proses lalu lakukan restart penuh; periksa dependency Rust, paket JS dan registrasi plugin. |
| Fitur baru tidak muncul dari GitHub | Periksa branch dan commit lokal. Perubahan lokal yang belum di-push tidak dapat terlihat dari repository remote. |
| Data tidak terlihat | Periksa identifier, nama database, akun Windows dan folder arsip. Jangan langsung membuat ulang database. |
| Lupa password | Belum tersedia pada baseline. Pertahankan database; jangan membuat jalur reset yang menghapus arsip. |
| Test lulus tetapi installer gagal | Tes TS/frontend berbeda dengan build native Rust/Windows; simpan pesan build lengkap. |

Referensi resmi: https://v2.tauri.app/start/prerequisites/ dan https://v2.tauri.app/distribute/windows-installer/
