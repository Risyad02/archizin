// src/modules/permit-records/pages/PermitRecordFormPage.tsx
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  getPermitRecordDetail,
  createPermitRecord,
  updatePermitRecord,
  checkPermitRecordFolderRename,
} from "../service";
import { getActivePermitTypes } from "../../permit-types/service";
import { getFieldsForPermitType } from "../../custom-fields/service";
import { getStatusOptions } from "../../permit-status/service";
import { DynamicFieldInput } from "../components/DynamicFieldInput";
import { useAuthStore } from "../../../store/authStore";
import type { PermitRecordFormInput } from "../types";
import type { PermitRecord, CustomFieldValueRow } from "../types";
import type { FolderRenamePlan } from "../folderSync";
import { confirm } from "@tauri-apps/plugin-dialog";

const emptyForm: PermitRecordFormInput = {
  permitTypeId: 0,
  nomorIzin: "",
  namaPemohon: "",
  namaUsaha: "",
  tanggalDokumen: null,
  tanggalTerbit: null,
  tanggalMulaiBerlaku: null,
  tanggalBerakhir: null,
  statusId: 0,
  keterangan: "",
  customFieldValues: {},
};

function buildFormFromDetail(
  record: PermitRecord,
  customValues: CustomFieldValueRow[]
): PermitRecordFormInput {
  const customFieldValues: Record<number, string | boolean | null> = {};
  for (const cv of customValues) {
    const key = cv.custom_field_definition_id;
    if (cv.field_type === "boolean") {
      customFieldValues[key] = Boolean(cv.value_boolean);
    } else if (cv.field_type === "integer" || cv.field_type === "decimal") {
      customFieldValues[key] =
        cv.value_integer !== null
          ? String(cv.value_integer)
          : cv.value_decimal !== null
          ? String(cv.value_decimal)
          : null;
    } else if (cv.field_type === "date" || cv.field_type === "datetime") {
      customFieldValues[key] = cv.value_date;
    } else {
      customFieldValues[key] = cv.value_text;
    }
  }

  return {
    permitTypeId: record.permit_type_id,
    nomorIzin: record.nomor_izin ?? "",
    namaPemohon: record.nama_pemohon ?? "",
    namaUsaha: record.nama_usaha ?? "",
    tanggalDokumen: record.tanggal_dokumen,
    tanggalTerbit: record.tanggal_terbit,
    tanggalMulaiBerlaku: record.tanggal_mulai_berlaku,
    tanggalBerakhir: record.tanggal_berakhir,
    statusId: record.status_id ?? 0,
    keterangan: record.keterangan ?? "",
    customFieldValues,
  };
}

export function PermitRecordFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const recordId = id ? Number(id) : null;

  const { data: detail, isLoading } = useQuery({
    queryKey: ["permit-record", recordId],
    queryFn: () => getPermitRecordDetail(recordId as number),
    enabled: isEdit && recordId !== null,
  });

  if (isEdit && isLoading) {
    return <div className="panel">Memuat...</div>;
  }
  if (isEdit && !detail?.record) {
    return <div className="panel">Data izin tidak ditemukan.</div>;
  }

  return (
    <PermitRecordFormInner
      key={id ?? "new"}
      isEdit={isEdit}
      recordId={recordId}
      initialForm={
        isEdit && detail?.record
          ? buildFormFromDetail(detail.record, detail.customValues)
          : emptyForm
      }
    />
  );
}

function PermitRecordFormInner({
  isEdit,
  recordId,
  initialForm,
}: {
  isEdit: boolean;
  recordId: number | null;
  initialForm: PermitRecordFormInput;
}) {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.currentUser);

  const [form, setForm] = useState<PermitRecordFormInput>(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: permitTypes = [] } = useQuery({
    queryKey: ["permit-types", "active"],
    queryFn: getActivePermitTypes,
  });

  const { data: statuses = [] } = useQuery({
    queryKey: ["permit-status"],
    queryFn: getStatusOptions,
  });

  const { data: fieldDefinitions = [] } = useQuery({
    queryKey: ["custom-field-defs", form.permitTypeId],
    queryFn: () => getFieldsForPermitType(form.permitTypeId),
    enabled: form.permitTypeId > 0,
  });

  function updateField<K extends keyof PermitRecordFormInput>(
    key: K,
    value: PermitRecordFormInput[K]
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function updateCustomField(definitionId: number, value: string | boolean | null) {
    setForm((f) => ({
      ...f,
      customFieldValues: { ...f.customFieldValues, [definitionId]: value },
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser) return;
    setError(null);
    setSaving(true);
    try {
      if (isEdit && recordId !== null) {
        const renamePlan = await checkPermitRecordFolderRename(recordId, form);
        let confirmedRename: FolderRenamePlan | null = null;

        if (renamePlan) {
          const userConfirmed = await confirm(
            `Perubahan data membuat folder izin ini tidak lagi sesuai namanya.\n\n` +
              `Folder lama:\n${renamePlan.oldFolderPath}\n\n` +
              `Folder baru:\n${renamePlan.newFolderPath}\n\n` +
              `Pindahkan folder fisik sekarang? (Jika tidak, data tetap tersimpan tapi folder tidak dipindah.)`,
            { title: "Konfirmasi Pindah Folder", kind: "warning" }
          );
          if (userConfirmed) {
            confirmedRename = renamePlan;
          }
        }

        await updatePermitRecord(recordId, form, currentUser, confirmedRename);
      } else {
        await createPermitRecord(form, currentUser);
      }
      navigate("/permit-records");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan data");
    } finally {
      setSaving(false);
    }
  }

    return (
    <div className="panel mx-auto max-w-3xl">
      <h1 className="mb-6 text-xl font-semibold">
        {isEdit ? "Edit Data Izin" : "Tambah Data Izin"}
      </h1>

      {error && (
        <p role="alert" className="mb-4 text-sm text-danger">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <section>
          <h2 className="section-title mb-3">Informasi Izin</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="permitTypeId" className="field-label">
                Jenis Izin <span className="text-danger">*</span>
              </label>
              <select
                id="permitTypeId"
                className="field-input w-full"
                value={form.permitTypeId || ""}
                onChange={(e) => updateField("permitTypeId", Number(e.target.value))}
                disabled={isEdit}
                required
              >
                <option value="">Pilih jenis izin</option>
                {permitTypes.map((pt) => (
                  <option key={pt.id} value={pt.id}>
                    {pt.name}
                  </option>
                ))}
              </select>
              {isEdit && (
                <p className="mt-1 text-xs text-ink-muted">
                  Jenis izin tidak dapat diubah setelah data dibuat.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="nomorIzin" className="field-label">
                Nomor Izin <span className="text-danger">*</span>
              </label>
              <input
                id="nomorIzin"
                className="field-input data-code w-full"
                value={form.nomorIzin}
                onChange={(e) => updateField("nomorIzin", e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="namaPemohon" className="field-label">
                Nama Pemohon <span className="text-danger">*</span>
              </label>
              <input
                id="namaPemohon"
                className="field-input w-full"
                value={form.namaPemohon}
                onChange={(e) => updateField("namaPemohon", e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="namaUsaha" className="field-label">
                Nama Usaha
              </label>
              <input
                id="namaUsaha"
                className="field-input w-full"
                value={form.namaUsaha}
                onChange={(e) => updateField("namaUsaha", e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="statusId" className="field-label">
                Status <span className="text-danger">*</span>
              </label>
              <select
                id="statusId"
                className="field-input w-full sm:w-auto sm:min-w-64"
                value={form.statusId || ""}
                onChange={(e) => updateField("statusId", Number(e.target.value))}
                required
              >
                <option value="">Pilih status</option>
                {statuses.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section>
          <h2 className="section-title mb-3">Masa Berlaku</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="tanggalDokumen" className="field-label">
                Tanggal Dokumen
              </label>
              <input
                id="tanggalDokumen"
                type="date"
                className="field-input w-full"
                value={form.tanggalDokumen ?? ""}
                onChange={(e) => updateField("tanggalDokumen", e.target.value || null)}
              />
            </div>

            <div>
              <label htmlFor="tanggalTerbit" className="field-label">
                Tanggal Terbit
              </label>
              <input
                id="tanggalTerbit"
                type="date"
                className="field-input w-full"
                value={form.tanggalTerbit ?? ""}
                onChange={(e) => updateField("tanggalTerbit", e.target.value || null)}
              />
            </div>

            <div>
              <label htmlFor="tanggalMulaiBerlaku" className="field-label">
                Tanggal Mulai Berlaku
              </label>
              <input
                id="tanggalMulaiBerlaku"
                type="date"
                className="field-input w-full"
                value={form.tanggalMulaiBerlaku ?? ""}
                onChange={(e) => updateField("tanggalMulaiBerlaku", e.target.value || null)}
              />
            </div>

            <div>
              <label htmlFor="tanggalBerakhir" className="field-label">
                Tanggal Berakhir
              </label>
              <input
                id="tanggalBerakhir"
                type="date"
                className="field-input w-full"
                value={form.tanggalBerakhir ?? ""}
                onChange={(e) => updateField("tanggalBerakhir", e.target.value || null)}
              />
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="keterangan" className="field-label">
              Keterangan
            </label>
            <textarea
              id="keterangan"
              className="field-input w-full"
              value={form.keterangan}
              onChange={(e) => updateField("keterangan", e.target.value)}
              rows={3}
            />
          </div>
        </section>

        {fieldDefinitions.length > 0 && (
          <section>
            <h2 className="section-title mb-3">Field Tambahan</h2>
            <div className="space-y-4">
              {fieldDefinitions.map((def) => (
                <div key={def.id}>
                  <label htmlFor={`field-${def.id}`} className="field-label">
                    {def.label}
                    {Boolean(def.is_required) && <span className="text-danger"> *</span>}
                  </label>
                  <DynamicFieldInput
                    definition={def}
                    value={form.customFieldValues[def.id] ?? null}
                    onChange={(v) => updateCustomField(def.id, v)}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
          <button type="button" className="btn-secondary" onClick={() => navigate("/permit-records")}>
            Batal
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default PermitRecordFormPage;