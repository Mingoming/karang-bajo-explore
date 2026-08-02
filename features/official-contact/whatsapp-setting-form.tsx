"use client";

import { useActionState, useEffect, useRef } from "react";

import { savePrimaryWhatsapp } from "./actions";
import { PRIMARY_WHATSAPP_KEY, type WhatsappSettingActionState } from "./model";

export function WhatsappSettingForm({
  initialValue,
}: Readonly<{ initialValue: string }>) {
  const initialState: WhatsappSettingActionState = {
    kind: "idle",
    value: initialValue,
    error: null,
    message: null,
    revision: 0,
  };
  const [state, action, pending] = useActionState(
    savePrimaryWhatsapp,
    initialState,
  );
  const feedbackRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!state.revision) return;
    if (state.kind === "validation-error") inputRef.current?.focus();
    else feedbackRef.current?.focus();
  }, [state.kind, state.revision]);

  return (
    <form
      key={state.revision}
      action={action}
      noValidate
      className="mt-8 space-y-6"
    >
      {state.message ? (
        <div
          ref={feedbackRef}
          tabIndex={-1}
          role={state.kind === "success" ? "status" : "alert"}
          className={`rounded-xl border px-4 py-3 text-sm outline-none ${
            state.kind === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-red-200 bg-red-50 text-red-900"
          }`}
        >
          {state.message}
        </div>
      ) : null}
      <div>
        <label
          htmlFor={PRIMARY_WHATSAPP_KEY}
          className="block text-sm font-semibold text-slate-800"
        >
          Nomor WhatsApp utama
        </label>
        <input
          ref={inputRef}
          id={PRIMARY_WHATSAPP_KEY}
          name={PRIMARY_WHATSAPP_KEY}
          type="tel"
          inputMode="tel"
          defaultValue={state.value}
          disabled={pending}
          aria-invalid={Boolean(state.error)}
          aria-describedby="primary-whatsapp-help"
          placeholder="Contoh format: 6281234567890"
          className="mt-2 block min-h-11 w-full max-w-xl rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-950 outline-none focus:border-emerald-700 focus:ring-3 focus:ring-emerald-100 disabled:bg-slate-100"
        />
        <p
          id="primary-whatsapp-help"
          className={`mt-2 text-sm leading-6 ${state.error ? "font-medium text-red-700" : "text-slate-600"}`}
        >
          {state.error ??
            "Gunakan kode negara tanpa awalan nol lokal. Kosongkan untuk menonaktifkan CTA utama tanpa menghapus pengaturan."}
        </p>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-700 px-5 py-2.5 font-semibold text-white hover:bg-emerald-800 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-wait disabled:bg-slate-400"
      >
        {pending ? "Menyimpan…" : "Simpan pengaturan"}
      </button>
    </form>
  );
}
