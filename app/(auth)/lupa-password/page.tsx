import Link from "next/link";

import { requestPasswordRecoveryAction } from "@/app/(auth)/actions";

type ForgotPasswordPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps) {
  const params = await searchParams;
  const error = Array.isArray(params.error) ? params.error[0] : params.error;
  const message = Array.isArray(params.message)
    ? params.message[0]
    : params.message;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <h1 className="text-2xl font-bold text-slate-950">Pulihkan Kata Sandi</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Masukkan email administrator untuk meminta tautan pemulihan.
      </p>

      {error === "invalid-email" ? (
        <p
          role="alert"
          className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          Masukkan alamat email yang valid.
        </p>
      ) : null}
      {error === "invalid-recovery-link" ? (
        <p
          role="alert"
          className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800"
        >
          Tautan pemulihan tidak valid atau telah kedaluwarsa. Minta tautan
          baru.
        </p>
      ) : null}
      {message === "recovery-requested" ? (
        <p
          role="status"
          className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800"
        >
          Jika email terdaftar, tautan pemulihan akan dikirim. Periksa kotak
          masuk Anda.
        </p>
      ) : null}

      <form action={requestPasswordRecoveryAction} className="mt-6 space-y-5">
        <div>
          <label
            htmlFor="recovery-email"
            className="block text-sm font-semibold text-slate-800"
          >
            Email administrator
          </label>
          <input
            id="recovery-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-200"
          />
        </div>
        <button
          type="submit"
          className="min-h-11 w-full cursor-pointer rounded-lg bg-emerald-800 px-4 py-3 font-semibold text-white hover:bg-emerald-900 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
        >
          Kirim Tautan Pemulihan
        </button>
      </form>

      <p className="mt-6 text-center text-sm">
        <Link
          href="/login"
          className="font-semibold text-emerald-800 underline-offset-4 hover:underline"
        >
          Kembali ke login
        </Link>
      </p>
    </section>
  );
}
