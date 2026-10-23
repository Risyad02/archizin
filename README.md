# ArchIzin

Aplikasi desktop offline untuk mengelola data perizinan, kolom dinamis, dokumen lokal, pencarian, dashboard dan rekapitulasi.

**Stack:** Tauri 2 · React 19 · TypeScript · Tailwind CSS 4 · SQLite.

Mulai dari [panduan Windows lengkap](TUTORIAL-WINDOWS.md) untuk persiapan alat, menjalankan aplikasi, alur pertama, pengujian dan build installer.

```sh
npm ci
npm test
npm run lint
npm run typecheck
npm run tauri -- dev
```

`npm run build` membangun frontend; `npm run tauri -- build` membangun bundle desktop sesuai platform.

Status fitur dan tahap berikutnya: [ROADMAP.md](ROADMAP.md). Aturan pengembangan: [CLAUDE.md](CLAUDE.md). Kriteria penyelesaian: [DEFINITION_OF_DONE.md](DEFINITION_OF_DONE.md).

Pemulihan password, mode tanpa login, backup/restore terpadu, serta impor/ekspor lengkap belum tersedia pada baseline. Nama tampilan sementara yang diusulkan adalah Archive Izin; pemusatan nama belum diimplementasikan.

Jangan menyertakan database, arsip dokumen, kredensial atau data produksi dalam Git.
