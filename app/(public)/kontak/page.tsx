import type { Metadata } from "next";

import { EmptyContentState } from "@/components/public/empty-content-state";
import { PublicContainer } from "@/components/public/public-container";
import { getPublicOfficialContacts } from "@/features/official-contact/data";
import { buildPublicMetadata } from "@/features/seo/public-metadata";

export const metadata: Metadata = buildPublicMetadata({
  title: "Kontak Resmi",
  description:
    "Kanal resmi untuk pertanyaan mengenai pariwisata Desa Karang Bajo.",
});

export default async function OfficialContactPage() {
  const result = await getPublicOfficialContacts();
  if (result.kind === "error")
    throw new Error("PUBLIC_OFFICIAL_CONTACT_UNAVAILABLE");
  const hasContacts = Boolean(result.primaryWhatsapp || result.contacts.length);
  return (
    <div className="py-14 sm:py-20">
      <PublicContainer>
        <div className="mx-auto max-w-4xl">
          <p className="text-sm font-bold tracking-[0.16em] text-emerald-800 uppercase">
            Informasi resmi
          </p>
          <h1 className="mt-3 font-serif text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
            Kontak Desa
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            Gunakan hanya kanal yang tercantum pada halaman ini untuk pertanyaan
            resmi.
          </p>
          {!hasContacts ? (
            <div className="mt-10">
              <EmptyContentState
                title="Kontak resmi belum tersedia"
                description="Kanal resmi akan ditampilkan setelah dikonfigurasi dan disetujui."
              />
            </div>
          ) : (
            <div className="mt-10 grid gap-5 sm:grid-cols-2">
              {result.primaryWhatsapp ? (
                <section className="rounded-2xl bg-emerald-900 p-6 text-white sm:col-span-2">
                  <p className="text-sm font-bold tracking-wide text-emerald-200 uppercase">
                    Kanal utama
                  </p>
                  <h2 className="mt-2 font-serif text-2xl font-bold">
                    WhatsApp Desa
                  </h2>
                  <a
                    href={result.primaryWhatsapp.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 inline-flex min-h-11 items-center rounded-full bg-white px-5 py-2.5 font-bold text-emerald-950 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-amber-300"
                    aria-label={`Hubungi desa melalui WhatsApp ${result.primaryWhatsapp.displayValue}`}
                  >
                    Hubungi WhatsApp Desa
                  </a>
                </section>
              ) : null}
              {result.contacts.map((contact) => (
                <section
                  key={contact.id}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <h2 className="font-serif text-2xl font-bold text-slate-950">
                    {contact.label}
                  </h2>
                  {contact.type !== "url" ? (
                    <p className="mt-2 text-sm font-semibold text-slate-500">
                      {contact.value}
                    </p>
                  ) : null}
                  {contact.description ? (
                    <p className="mt-3 leading-7 text-slate-600">
                      {contact.description}
                    </p>
                  ) : null}
                  <a
                    href={contact.href}
                    target={contact.external ? "_blank" : undefined}
                    rel={contact.external ? "noopener noreferrer" : undefined}
                    className="mt-5 inline-flex min-h-11 items-center rounded-full border border-emerald-800 px-5 py-2.5 font-bold text-emerald-900 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-emerald-700"
                  >
                    Buka {contact.label}
                  </a>
                </section>
              ))}
            </div>
          )}
        </div>
      </PublicContainer>
    </div>
  );
}
