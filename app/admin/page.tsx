import { requireAdministrator } from "@/lib/auth/admin";

export default async function AdminPage() {
  const administrator = await requireAdministrator();

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-sm font-semibold tracking-wide text-emerald-800 uppercase">
        Selamat datang
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
        Dashboard Administrator
      </h1>
      <p className="mt-4 max-w-2xl leading-7 text-slate-600">
        Anda masuk sebagai administrator Karang Bajo Explore dengan email:
      </p>
      <p className="mt-2 font-semibold break-all text-slate-900">
        {administrator.email ?? "Email administrator tidak tersedia"}
      </p>
      <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
        Gunakan navigasi untuk mengelola konten publik, terjemahan Inggris,
        media, dan pengaturan yang tersedia.
      </p>
    </section>
  );
}
