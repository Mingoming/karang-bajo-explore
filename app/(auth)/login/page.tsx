import Link from "next/link";

import { loginAction } from "@/app/(auth)/actions";

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getErrorMessage(error: string | undefined) {
  switch (error) {
    case "invalid-input":
      return "Masukkan alamat email yang valid dan kata sandi Anda.";
    case "not-authorized":
      return "Akun ini tidak memiliki akses ke dashboard.";
    case "session-required":
      return "Sesi Anda telah berakhir. Silakan masuk kembali.";
    case "invalid-credentials":
      return "Email atau kata sandi tidak valid.";
    default:
      return null;
  }
}

function getSuccessMessage(message: string | undefined) {
  switch (message) {
    case "password-updated":
      return "Kata sandi berhasil diperbarui. Silakan masuk kembali.";
    case "signed-out":
      return "Anda telah keluar dari sesi administrator.";
    default:
      return null;
  }
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const errorMessage = getErrorMessage(firstValue(params.error));
  const successMessage = getSuccessMessage(firstValue(params.message));
  const nextPath = firstValue(params.next) ?? "/admin";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <h1 className="text-2xl font-bold text-slate-950">Masuk Administrator</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Gunakan akun administrator Karang Bajo Explore.
      </p>

      {errorMessage ? (
        <p
          role="alert"
          className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {errorMessage}
        </p>
      ) : null}
      {successMessage ? (
        <p
          role="status"
          className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          {successMessage}
        </p>
      ) : null}

      <form action={loginAction} className="mt-6 space-y-5">
        <input type="hidden" name="next" value={nextPath} />
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-semibold text-slate-800"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-200"
          />
        </div>
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-semibold text-slate-800"
          >
            Kata sandi
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-200"
          />
        </div>
        <button
          type="submit"
          className="min-h-11 w-full cursor-pointer rounded-lg bg-emerald-800 px-4 py-3 font-semibold text-white hover:bg-emerald-900 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
        >
          Masuk
        </button>
      </form>

      <p className="mt-6 text-center text-sm">
        <Link
          href="/lupa-password"
          className="font-semibold text-emerald-800 underline-offset-4 hover:underline"
        >
          Lupa kata sandi?
        </Link>
      </p>
    </section>
  );
}
