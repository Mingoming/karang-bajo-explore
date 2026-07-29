type AdminPlaceholderPageProps = Readonly<{
  title: string;
  description: string;
}>;

export function AdminPlaceholderPage({
  title,
  description,
}: AdminPlaceholderPageProps) {
  return (
    <section
      aria-labelledby="admin-module-title"
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <p className="text-sm font-semibold tracking-wide text-emerald-800 uppercase">
        Modul Administrator
      </p>
      <h1
        id="admin-module-title"
        className="mt-2 text-3xl font-bold tracking-tight text-slate-950"
      >
        {title}
      </h1>
      <p className="mt-4 max-w-2xl leading-7 text-slate-600">{description}</p>
      <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
        Fungsi modul ini belum diimplementasikan. Halaman ini hanya menyiapkan
        struktur navigasi dashboard.
      </p>
    </section>
  );
}
