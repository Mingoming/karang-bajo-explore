import type { Metadata } from "next";

import { SITE_CONFIG } from "@/config/site";

export const metadata: Metadata = {
  title: "Autentikasi Administrator",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6 py-12">
      <div className="w-full max-w-md">
        <p className="mb-4 text-center text-sm font-semibold tracking-wide text-emerald-800 uppercase">
          {SITE_CONFIG.name}
        </p>
        {children}
      </div>
    </main>
  );
}
