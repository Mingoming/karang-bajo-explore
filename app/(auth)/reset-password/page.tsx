import Link from "next/link";

import { resetPasswordAction } from "@/app/(auth)/actions";
import { getAuthenticationState } from "@/lib/auth/admin";

type ResetPasswordPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getErrorMessage(value: string | undefined) {
  switch (value) {
    case "password-mismatch":
      return "Kata sandi dan konfirmasi harus sama.";
    case "password-policy":
      return "Kata sandi tidak memenuhi kebijakan keamanan. Gunakan kata sandi yang lebih kuat.";
    case "invalid-recovery-session":
      return "Tautan pemulihan tidak valid atau telah kedaluwarsa. Minta tautan baru.";
    default:
      return null;
  }
}

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const params = await searchParams;
  const errorValue = Array.isArray(params.error)
    ? params.error[0]
    : params.error;
  const errorMessage = getErrorMessage(errorValue);
  const authenticationState = await getAuthenticationState();

  if (authenticationState.kind !== "administrator") {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold text-slate-950">
          Tautan Pemulihan Tidak Valid
        </h1>
        <p role="alert" className="mt-3 text-sm leading-6 text-slate-600">
          Sesi pemulihan tidak tersedia atau telah kedaluwarsa. Minta tautan
          baru untuk melanjutkan.
        </p>
        <Link
          href="/lupa-password"
          className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-emerald-800 px-4 py-2 font-semibold text-white hover:bg-emerald-900 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
        >
          Minta Tautan Baru
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <h1 className="text-2xl font-bold text-slate-950">
        Atur Kata Sandi Baru
      </h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Masukkan kata sandi baru untuk akun administrator.
      </p>

      {errorMessage ? (
        <p
          role="alert"
          className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800"
        >
          {errorMessage}
        </p>
      ) : null}

      <form action={resetPasswordAction} className="mt-6 space-y-5">
        <div>
          <label
            htmlFor="new-password"
            className="block text-sm font-semibold text-slate-800"
          >
            Kata sandi baru
          </label>
          <input
            id="new-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-200"
          />
        </div>
        <div>
          <label
            htmlFor="password-confirmation"
            className="block text-sm font-semibold text-slate-800"
          >
            Konfirmasi kata sandi
          </label>
          <input
            id="password-confirmation"
            name="passwordConfirmation"
            type="password"
            autoComplete="new-password"
            required
            className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-200"
          />
        </div>
        <button
          type="submit"
          className="min-h-11 w-full cursor-pointer rounded-lg bg-emerald-800 px-4 py-3 font-semibold text-white hover:bg-emerald-900 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
        >
          Perbarui Kata Sandi
        </button>
      </form>

      {errorValue === "invalid-recovery-session" ? (
        <p className="mt-6 text-center text-sm">
          <Link
            href="/lupa-password"
            className="font-semibold text-emerald-800 underline-offset-4 hover:underline"
          >
            Minta tautan pemulihan baru
          </Link>
        </p>
      ) : null}
    </section>
  );
}
