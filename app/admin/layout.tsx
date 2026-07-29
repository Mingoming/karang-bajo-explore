import type { Metadata } from "next";

import { logoutAction } from "@/app/(auth)/actions";
import { requireAdministrator } from "@/lib/auth/admin";

export const metadata: Metadata = {
  title: "Dashboard Administrator",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const administrator = await requireAdministrator();

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-800">
              Dashboard Administrator
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {administrator.email ?? "Email administrator tidak tersedia"}
            </p>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="min-h-11 cursor-pointer rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
            >
              Keluar
            </button>
          </form>
        </div>
      </header>
      {children}
    </div>
  );
}
