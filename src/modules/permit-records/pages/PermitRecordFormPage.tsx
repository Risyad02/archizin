// src/modules/permit-records/pages/PermitRecordFormPage.tsx
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  getPermitRecordDetail,
  createPermitRecord,
  updatePermitRecord,
} from "../service";
import { getActivePermitTypes } from "../../permit-types/service";
import { getFieldsForPermitType } from "../../custom-fields/service";
import { getStatusOptions } from "../../permit-status/service";
import { DynamicFieldInput } from "../components/DynamicFieldInput";
import { useAuthStore } from "../../../store/authStore";
import type { PermitRecordFormInput } from "../types";
import type { PermitRecord, CustomFieldValueRow } from "../types";

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
        await updatePermitRecord(recordId, form, currentUser.id);
      } else {
        await createPermitRecord(form, currentUser.id);
      }
      navigate("/permit-records");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan data");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="panel">
      <h1 className="text-xl font-semibold mb-4">
        {isEdit ? "Edit Data Izin" : "Tambah Data Izin"}
      </h1>

      {error && <p className="text-red-600 mb-3">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="permitTypeId">Jenis Izin</label>
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
        </div>

        <div>
          <label htmlFor="nomorIzin">Nomor Izin</label>
          <input
            id="nomorIzin"
            className="field-input w-full"
            value={form.nomorIzin}
            onChange={(e) => updateField("nomorIzin", e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="namaPemohon">Nama Pemohon</label>
          <input
            id="namaPemohon"
            className="field-input w-full"
            value={form.namaPemohon}
            onChange={(e) => updateField("namaPemohon", e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="namaUsaha">Nama Usaha</label>
          <input
            id="namaUsaha"
            className="field-input w-full"
            value={form.namaUsaha}
            onChange={(e) => updateField("namaUsaha", e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="tanggalDokumen">Tanggal Dokumen</label>
          <input
            id="tanggalDokumen"
            type="date"
            className="field-input w-full"
            value={form.tanggalDokumen ?? ""}
            onChange={(e) => updateField("tanggalDokumen", e.target.value || null)}
          />
        </div>

        <div>
          <label htmlFor="tanggalTerbit">Tanggal Terbit</label>
          <input
            id="tanggalTerbit"
            type="date"
            className="field-input w-full"
            value={form.tanggalTerbit ?? ""}
            onChange={(e) => updateField("tanggalTerbit", e.target.value || null)}
          />
        </div>

        <div>
          <label htmlFor="tanggalMulaiBerlaku">Tanggal Mulai Berlaku</label>
          <input
            id="tanggalMulaiBerlaku"
            type="date"
            className="field-input w-full"
            value={form.tanggalMulaiBerlaku ?? ""}
            onChange={(e) => updateField("tanggalMulaiBerlaku", e.target.value || null)}
          />
        </div>

        <div>
          <label htmlFor="tanggalBerakhir">Tanggal Berakhir</label>
          <input
            id="tanggalBerakhir"
            type="date"
            className="field-input w-full"
            value={form.tanggalBerakhir ?? ""}
            onChange={(e) => updateField("tanggalBerakhir", e.target.value || null)}
          />
        </div>

        <div>
          <label htmlFor="statusId">Status</label>
          <select
            id="statusId"
            className="field-input w-full"
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

        <div>
          <label htmlFor="keterangan">Keterangan</label>
          <textarea
            id="keterangan"
            className="field-input w-full"
            value={form.keterangan}
            onChange={(e) => updateField("keterangan", e.target.value)}
            rows={3}
          />
        </div>

        {fieldDefinitions.length > 0 && (
          <fieldset className="space-y-3">
            <legend className="font-medium">Field Tambahan</legend>
            {fieldDefinitions.map((def) => (
              <div key={def.id}>
                <label htmlFor={`field-${def.id}`}>
                  {def.label}
                  {def.is_required ? " *" : ""}
                </label>
                <DynamicFieldInput
                  definition={def}
                  value={form.customFieldValues[def.id] ?? null}
                  onChange={(v) => updateCustomField(def.id, v)}
                />
              </div>
            ))}
          </fieldset>
        )}

        <div className="flex gap-2">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
          <button type="button" onClick={() => navigate("/permit-records")}>
            Batal
          </button>
        </div>
      </form>
    </div>
  );
}

export default PermitRecordFormPage;