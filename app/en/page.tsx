import { PublicContainer } from "@/components/public/public-container";
import { PublicHero } from "@/components/public/public-hero";
import { PublicShell } from "@/components/public/public-shell";
import { SectionHeading } from "@/components/public/section-heading";
import { ExternalTourismLinksSection } from "@/features/official-contact/external-tourism-links";
import { EnglishOfficialContactCta } from "@/features/official-contact/official-contact-cta";
import { getEnglishPublicShellData } from "@/features/official-contact/public-shell-data";
import { buildPublicMetadata } from "@/features/seo/public-metadata";
import { PUBLIC_DICTIONARIES } from "@/lib/i18n/dictionaries";

const dictionary = PUBLIC_DICTIONARIES.en;

export const metadata = buildPublicMetadata({
  title: dictionary.home.metadataTitle,
  description: dictionary.home.metadataDescription,
  openGraphLocale: "en_US",
});

export default async function EnglishHomePage() {
  const contactResult = await getEnglishPublicShellData();
  const contactData =
    contactResult.kind === "ready"
      ? contactResult.data
      : { whatsappHref: null, externalLinks: [] };

  return (
    <PublicShell locale="en" englishContactData={contactResult}>
      <PublicHero locale="en" dictionary={dictionary} />

      <section id="english-information" className="py-16 sm:py-20">
        <PublicContainer>
          <div className="rounded-3xl border border-amber-900/15 bg-amber-50 px-6 py-10 sm:px-10">
            <SectionHeading
              eyebrow={dictionary.home.availability.eyebrow}
              title={dictionary.home.availability.title}
              description={dictionary.home.availability.description}
            />
          </div>
        </PublicContainer>
      </section>

      <ExternalTourismLinksSection
        links={contactData.externalLinks}
        copy={dictionary.home.externalTourism}
      />

      <section id="contact" className="py-16 sm:py-24">
        <PublicContainer>
          <div className="rounded-3xl bg-emerald-900 px-6 py-12 text-center text-white">
            <p className="text-sm font-bold tracking-[0.18em] text-emerald-200 uppercase">
              {dictionary.home.contact.eyebrow}
            </p>
            <h2 className="mx-auto mt-4 max-w-3xl font-serif text-3xl font-bold">
              {dictionary.home.contact.title}
            </h2>
            <div className="mt-8">
              <EnglishOfficialContactCta
                whatsappHref={contactData.whatsappHref}
                copy={dictionary.home.contact}
                className="bg-white text-emerald-950 focus-visible:outline-amber-300"
              />
            </div>
          </div>
        </PublicContainer>
      </section>
    </PublicShell>
  );
}
