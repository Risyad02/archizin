import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { mkdir, exists } from "@tauri-apps/plugin-fs";
import { setupStorage } from "../service";
import { grantStorageScope } from "../../../lib/filesystem";

export function SetupStoragePage({ onDone }: { onDone: () => void }) {
  const [storageRoot, setStorageRoot] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handlePickFolder() {
    const selected = await open({ directory: true, multiple: false });
    if (typeof selected === "string") {
      setStorageRoot(selected);
      setError(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!storageRoot.trim()) {
      setError("Pilih folder lokasi penyimpanan arsip terlebih dahulu");
      return;
    }

    setLoading(true);
    try {
      await grantStorageScope(storageRoot); // BARU — sebelum operasi fs apa pun
      const folderExists = await exists(storageRoot);
      if (!folderExists) {
        await mkdir(storageRoot, { recursive: true });
      }
      await setupStorage({ storageRoot });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan lokasi penyimpanan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form onSubmit={handleSubmit} className="panel w-full max-w-md p-6">
        <h1 className="mb-2 text-lg font-semibold">Setup Lokasi Penyimpanan</h1>
        <p className="mb-4 text-sm opacity-70">
          Tentukan folder utama di komputer ini tempat seluruh arsip/dokumen perizinan akan
          disimpan dan ditata otomatis oleh ArchIzin. Lokasi ini hanya ditentukan sekali di sini.
        </p>

        <label className="mb-1 block text-sm font-medium">Folder Penyimpanan Arsip</label>
        <div className="mb-3 flex gap-2">
          <input
            className="field-input flex-1"
            value={storageRoot}
            readOnly
            placeholder="Belum dipilih"
          />
          <button type="button" className="btn-primary shrink-0" onClick={handlePickFolder}>
            Pilih Folder
          </button>
        </div>

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Menyimpan..." : "Simpan & Lanjutkan"}
        </button>
      </form>
    </div>
  );
}