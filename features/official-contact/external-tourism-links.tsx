import { PublicContainer } from "@/components/public/public-container";
import {
  PUBLIC_DICTIONARIES,
  type PublicDictionary,
} from "@/lib/i18n/dictionaries";

import { getPublicOfficialContacts } from "./data";
import { selectExternalTourismLinks, type ExternalTourismLink } from "./model";

export function ExternalTourismLinksSection({
  links,
  copy,
}: Readonly<{
  links: readonly ExternalTourismLink[];
  copy: PublicDictionary["home"]["externalTourism"];
}>) {
  if (links.length === 0) return null;

  return (
    <section
      aria-labelledby="platform-wisata-title"
      className="border-b border-slate-200 bg-white py-12 sm:py-16"
    >
      <PublicContainer>
        <div className="rounded-3xl border border-emerald-900/15 bg-emerald-50/60 px-6 py-8 sm:px-8">
          <p className="text-sm font-bold tracking-[0.16em] text-emerald-800 uppercase">
            {copy.eyebrow}
          </p>
          <h2
            id="platform-wisata-title"
            className="mt-3 max-w-3xl font-serif text-2xl font-bold text-slate-950 sm:text-3xl"
          >
            {copy.title}
          </h2>
          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            {copy.description}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {links.map((link) => {
              const content =
                link.platform === "google-maps"
                  ? {
                      label: copy.googleMaps,
                      accessibleLabel: copy.googleMapsAccessible,
                    }
                  : {
                      label: copy.tripadvisor,
                      accessibleLabel: copy.tripadvisorAccessible,
                    };
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
      copy={PUBLIC_DICTIONARIES.id.home.externalTourism}
    />
  );
}
