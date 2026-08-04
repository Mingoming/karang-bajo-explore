"use client";

import { useActionState, useEffect, useRef } from "react";

import { manageEnglishVillageProfileTranslation } from "./actions";
import {
  getEnglishVillageProfileTranslationStatusLabel,
  isEnglishVillageProfileTranslationEditable,
  type EnglishVillageProfileTranslationActionState,
  type EnglishVillageProfileTranslationField,
  type EnglishVillageProfileTranslationSource,
} from "./model";

type EnglishVillageProfileTranslationFormProps = {
  initialState: EnglishVillageProfileTranslationActionState;
  sourceReference: EnglishVillageProfileTranslationSource | null;
};

type FieldMessageProps = {
  error?: string;
  helper?: string;
  id: string;
};

const SOURCE_STATUS_LABELS = {
  draft: "Draf",
  published: "Diterbitkan",
  archived: "Diarsipkan",
} as const;

const FIELD_CONFIG = [
  {
    field: "name",
    label: "Village name",
    rows: null,
  },
  {
    field: "summary",
    label: "Summary",
    rows: 3,
  },
  {
    field: "description",
    label: "Description",
    rows: 7,
  },
  {
    field: "history",
    label: "History",
    rows: 6,
  },
  {
    field: "vision",
    label: "Vision",
    rows: 4,
  },
  {
    field: "mission",
    label: "Mission",
    rows: 5,
  },
  {
    field: "address",
    label: "Address",
    rows: 3,
  },
] as const satisfies readonly {
  field: EnglishVillageProfileTranslationField;
  label: string;
  rows: number | null;
}[];

const SOURCE_FIELD_CONFIG = [
  ["name", "Nama desa"],
  ["summary", "Ringkasan"],
  ["description", "Deskripsi"],
  ["history", "Sejarah"],
  ["vision", "Visi"],
  ["mission", "Misi"],
  ["address", "Alamat"],
] as const satisfies readonly [EnglishVillageProfileTranslationField, string][];

function FieldMessage({ error, helper, id }: FieldMessageProps) {
  if (error) {
    return (
      <p id={id} className="mt-2 text-sm font-medium text-red-700">
        {error}
      </p>
    );
  }

  if (helper) {
    return (
      <p id={id} className="mt-2 text-sm leading-6 text-slate-500">
        {helper}
      </p>
    );
  }

  return null;
}

function sourceRequiresTranslation(
  source: EnglishVillageProfileTranslationSource,
  field: EnglishVillageProfileTranslationField,
) {
  if (field === "name" || field === "description") {
    return true;
  }

  const value = source[field];
  return typeof value === "string" && value.trim() !== "";
}

function statusClasses(state: EnglishVillageProfileTranslationActionState) {
  if (state.status === "published" && state.freshness === "current") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (state.status === "published" && state.freshness === "stale") {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }

  if (state.status === "archived") {
    return "border-slate-300 bg-slate-100 text-slate-700";
  }

  return "border-blue-200 bg-blue-50 text-blue-800";
}

export function EnglishVillageProfileTranslationForm({
  initialState,
  sourceReference,
}: EnglishVillageProfileTranslationFormProps) {
  const [state, formAction, isPending] = useActionState(
    manageEnglishVillageProfileTranslation,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.revision === 0) {
      return;
    }

    if (state.kind === "validation-error") {
      const firstInvalidField = formRef.current?.querySelector<HTMLElement>(
        "[aria-invalid='true']",
      );

      if (firstInvalidField) {
        firstInvalidField.focus();
        return;
      }
    }

    feedbackRef.current?.focus();
  }, [state.kind, state.revision]);

  const editable = isEnglishVillageProfileTranslationEditable(state.status);
  const statusLabel = getEnglishVillageProfileTranslationStatusLabel(
    state.status,
    state.freshness,
  );
  const inputClasses =
    "mt-2 block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-950 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-700 focus:ring-3 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600";
  const labelClasses = "block text-sm font-semibold text-slate-800";

  if (!sourceReference) {
    return (
      <section className="mt-10 border-t border-slate-200 pt-8">
        <p className="text-sm font-semibold tracking-wide text-blue-800 uppercase">
          English translation
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
          Terjemahan Profil Desa
        </h2>
        <div
          role="status"
          className="mt-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900"
        >
          Buat dan simpan profil desa Indonesia terlebih dahulu sebelum
          mengelola terjemahan Inggris.
        </div>
      </section>
    );
  }

  const sourceStatusLabel = SOURCE_STATUS_LABELS[sourceReference.status];

  return (
    <section className="mt-10 border-t border-slate-200 pt-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-wide text-blue-800 uppercase">
            English translation
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            Terjemahan Profil Desa
          </h2>
          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            Gunakan konten Indonesia sebagai referensi. Sistem tidak
            menerjemahkan, menyalin, atau menerbitkan konten secara otomatis.
          </p>
        </div>

        <span
          className={`inline-flex w-fit rounded-full border px-3 py-1 text-sm font-semibold ${statusClasses(
            state,
          )}`}
        >
          {statusLabel}
        </span>
      </div>

      {state.status === "published" && state.freshness === "stale" ? (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950"
        >
          Profil Indonesia telah berubah setelah terjemahan diterbitkan.
          Terjemahan ini tidak tampil pada halaman publik. Arsipkan, pulihkan
          menjadi draf, tinjau ulang, lalu terbitkan kembali.
        </div>
      ) : null}

      {sourceReference.status !== "published" ? (
        <div
          role="status"
          className="mt-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-950"
        >
          Status sumber Indonesia saat ini: <strong>{sourceStatusLabel}</strong>
          . Draf terjemahan tetap dapat disimpan, tetapi tidak dapat diterbitkan
          hingga sumber Indonesia berstatus diterbitkan.
        </div>
      ) : null}

      <div className="mt-8 grid gap-8 xl:grid-cols-2">
        <aside className="rounded-xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
          <h3 className="text-lg font-bold text-slate-950">
            Referensi Indonesia
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Konten ini hanya ditampilkan sebagai referensi dan tidak dapat
            diedit dari formulir terjemahan.
          </p>

          <dl className="mt-6 space-y-5">
            {SOURCE_FIELD_CONFIG.map(([field, label]) => {
              const value = sourceReference[field];

              return (
                <div key={field}>
                  <dt className="text-sm font-semibold text-slate-700">
                    {label}
                  </dt>
                  <dd className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-900">
                    {typeof value === "string" && value.trim() !== ""
                      ? value
                      : "Belum diisi"}
                  </dd>
                </div>
              );
            })}
          </dl>
        </aside>

        <form
          key={state.revision}
          ref={formRef}
          action={formAction}
          noValidate
          className="space-y-6"
        >
          {state.kind !== "idle" && state.message ? (
            <div
              ref={feedbackRef}
              tabIndex={-1}
              role={state.kind === "success" ? "status" : "alert"}
              className={`rounded-xl border px-4 py-3 text-sm leading-6 outline-none focus:ring-3 ${
                state.kind === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900 focus:ring-emerald-200"
                  : "border-red-200 bg-red-50 text-red-900 focus:ring-red-200"
              }`}
            >
              <p className="font-semibold">{state.message}</p>

              {state.kind === "validation-error" &&
              (Object.keys(state.fieldErrors).length > 0 ||
                state.formErrors.length > 0) ? (
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {state.formErrors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                  {Object.entries(state.fieldErrors).map(([field, error]) => (
                    <li key={field}>{error}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <fieldset
            disabled={isPending || !editable}
            className="space-y-6 disabled:opacity-75"
          >
            <legend className="text-lg font-bold text-slate-950">
              Konten bahasa Inggris
            </legend>

            <p className="text-sm leading-6 text-slate-600">
              Draf boleh belum lengkap. Kolom yang ditandai wajib dilengkapi
              sebelum publikasi.
            </p>

            {FIELD_CONFIG.map(({ field, label, rows }) => {
              const requiredForPublish = sourceRequiresTranslation(
                sourceReference,
                field,
              );
              const messageId = `english-${field}-message`;

              return (
                <div key={field}>
                  <label htmlFor={`english-${field}`} className={labelClasses}>
                    {label}
                    {requiredForPublish ? (
                      <>
                        {" "}
                        <span aria-hidden="true" className="text-red-700">
                          *
                        </span>
                        <span className="sr-only">
                          {" "}
                          (wajib sebelum publikasi)
                        </span>
                      </>
                    ) : null}
                  </label>

                  {rows === null ? (
                    <input
                      id={`english-${field}`}
                      name={field}
                      type="text"
                      defaultValue={state.values[field]}
                      aria-invalid={Boolean(state.fieldErrors[field])}
                      aria-describedby={messageId}
                      className={inputClasses}
                    />
                  ) : (
                    <textarea
                      id={`english-${field}`}
                      name={field}
                      rows={rows}
                      defaultValue={state.values[field]}
                      aria-invalid={Boolean(state.fieldErrors[field])}
                      aria-describedby={messageId}
                      className={inputClasses}
                    />
                  )}

                  <FieldMessage
                    id={messageId}
                    error={state.fieldErrors[field]}
                    helper={
                      requiredForPublish
                        ? "Wajib diisi sebelum terjemahan diterbitkan."
                        : "Boleh dikosongkan karena bagian sumber Indonesia juga kosong."
                    }
                  />
                </div>
              );
            })}
          </fieldset>

          <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:flex-wrap sm:justify-end">
            {editable ? (
              <>
                <button
                  type="submit"
                  name="intent"
                  value="save-draft"
                  disabled={isPending}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-2.5 font-semibold text-slate-800 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-wait disabled:text-slate-400"
                >
                  {isPending ? "Memproses..." : "Simpan draf"}
                </button>
                <button
                  type="submit"
                  name="intent"
                  value="publish"
                  disabled={isPending}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-700 px-5 py-2.5 font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-wait disabled:bg-slate-400"
                >
                  {isPending ? "Memproses..." : "Simpan dan terbitkan"}
                </button>
              </>
            ) : null}

            {state.status === "published" ? (
              <button
                type="submit"
                name="intent"
                value="archive"
                disabled={isPending}
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-amber-300 bg-amber-50 px-5 py-2.5 font-semibold text-amber-950 shadow-sm transition-colors hover:bg-amber-100 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-amber-700 disabled:cursor-wait disabled:opacity-60"
              >
                {isPending ? "Memproses..." : "Arsipkan terjemahan"}
              </button>
            ) : null}

            {state.status === "archived" ? (
              <button
                type="submit"
                name="intent"
                value="restore"
                disabled={isPending}
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-700 px-5 py-2.5 font-semibold text-white shadow-sm transition-colors hover:bg-blue-800 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-wait disabled:bg-slate-400"
              >
                {isPending ? "Memproses..." : "Pulihkan menjadi draf"}
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </section>
  );
}
