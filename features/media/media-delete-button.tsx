"use client";

import { useActionState } from "react";

import type { MediaActionState } from "./model";

export function MediaDeleteButton({
  action,
  initialState,
}: {
  action: (state: MediaActionState) => Promise<MediaActionState>;
  initialState: MediaActionState;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  return (
    <form
      action={formAction}
      className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4"
    >
      <h2 className="font-bold text-red-950">Hapus gambar</h2>
      <p className="mt-1 text-sm leading-6 text-red-900">
        Metadata dan objek Storage akan dihapus. Jika gambar ini utama, gambar
        tersisa dengan urutan terendah akan menggantikannya.
      </p>
      {state.message ? (
        <p role="alert" className="mt-3 text-sm font-semibold text-red-900">
          {state.message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="mt-4 min-h-11 rounded-lg bg-red-700 px-4 font-semibold text-white disabled:bg-slate-400"
      >
        {pending ? "Menghapus…" : "Hapus gambar"}
      </button>
    </form>
  );
}
