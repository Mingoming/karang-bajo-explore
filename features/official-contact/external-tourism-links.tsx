import { PublicContainer } from "@/components/public/public-container";

import { getPublicOfficialContacts } from "./data";
import { selectExternalTourismLinks, type ExternalTourismLink } from "./model";

const PLATFORM_CONTENT: Record<
  ExternalTourismLink["platform"],
  { label: string; accessibleLabel: string }
> = {
  "google-maps": {
    label: "Buka di Google Maps",
    accessibleLabel: "Buka Karang Bajo Explore di Google Maps (tab baru)",
  },
  tripadvisor: {
    label: "Buka Tripadvisor",
    accessibleLabel: "Buka informasi Karang Bajo di Tripadvisor (tab baru)",
  },
};

export function ExternalTourismLinksSection({
  links,
}: Readonly<{ links: readonly ExternalTourismLink[] }>) {
  if (links.length === 0) return null;

  return (
    <section
      aria-labelledby="platform-wisata-title"
      className="border-b border-slate-200 bg-white py-12 sm:py-16"
    >
      <PublicContainer>
        <div className="rounded-3xl border border-emerald-900/15 bg-emerald-50/60 px-6 py-8 sm:px-8">
          <p className="text-sm font-bold tracking-[0.16em] text-emerald-800 uppercase">
            Jelajahi lebih lanjut
          </p>
          <h2
            id="platform-wisata-title"
            className="mt-3 max-w-3xl font-serif text-2xl font-bold text-slate-950 sm:text-3xl"
          >
            Temukan Karang Bajo di platform pilihan Anda
          </h2>
          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            Buka peta wisata melalui Google Maps atau temukan informasi Karang
            Bajo di Tripadvisor.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {links.map((link) => {
              const content = PLATFORM_CONTENT[link.platform];
              return (
                <a
                  key={link.platform}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={content.accessibleLabel}
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-emerald-800 bg-white px-5 py-2.5 text-center font-bold text-emerald-900 hover:bg-emerald-100 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-emerald-700"
                >
                  {content.label}
                </a>
              );
            })}
          </div>
        </div>
      </PublicContainer>
    </section>
  );
}

export async function ExternalTourismLinks() {
  const result = await getPublicOfficialContacts();
  if (result.kind === "error") return null;

  return (
    <ExternalTourismLinksSection
      links={selectExternalTourismLinks(result.contacts)}
    />
  );
}
