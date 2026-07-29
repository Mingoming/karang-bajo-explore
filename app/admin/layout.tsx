import type { Metadata } from "next";

import { AdminHeader } from "@/components/admin/admin-header";
import { AdminLogoutControl } from "@/components/admin/admin-logout-control";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
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
  const administratorEmail =
    administrator.email ?? "Email administrator tidak tersedia";

  return (
    <div className="min-h-screen bg-slate-100">
      <a
        href="#admin-main-content"
        className="fixed top-3 left-3 z-50 -translate-y-24 rounded-lg bg-white px-4 py-3 font-semibold text-slate-950 shadow-lg focus:translate-y-0 focus:outline-3 focus:outline-offset-2 focus:outline-emerald-600"
      >
        Lewati ke konten utama
      </a>

      <AdminSidebar />

      <div className="min-h-screen lg:pl-72">
        <AdminHeader
          administratorEmail={administratorEmail}
          mobileLogoutControl={<AdminLogoutControl />}
        />
        <main
          id="admin-main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
