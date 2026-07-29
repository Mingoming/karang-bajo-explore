import { AdminLogoutControl } from "@/components/admin/admin-logout-control";
import { AdminNavigationLinks } from "@/components/admin/admin-navigation-links";

export function AdminSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col bg-slate-950 text-white lg:flex">
      <div className="border-b border-slate-800 px-6 py-6">
        <p className="text-lg font-bold tracking-tight">Karang Bajo Explore</p>
        <p className="mt-1 text-sm text-slate-400">Administrator</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
        <AdminNavigationLinks label="Navigasi administrator" />
      </div>

      <div className="border-t border-slate-800 p-4">
        <AdminLogoutControl />
      </div>
    </aside>
  );
}
