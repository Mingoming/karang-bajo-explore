import { EmptyContentState } from "@/components/public/empty-content-state";
import { PublicContainer } from "@/components/public/public-container";
import { PublicShell } from "@/components/public/public-shell";
import { ExternalTourismLinksSection } from "@/features/official-contact/external-tourism-links";
import { EnglishOfficialContactCta } from "@/features/official-contact/official-contact-cta";
import { getEnglishPublicShellData } from "@/features/official-contact/public-shell-data";
import { buildPublicMetadata } from "@/features/seo/public-metadata";
import { PUBLIC_DICTIONARIES } from "@/lib/i18n/dictionaries";

const dictionary = PUBLIC_DICTIONARIES.en;
const copy = {
  metadataTitle: "Contact",
  metadataDescription:
    "Use Karang Bajo Village's approved official channels for tourism questions.",
  eyebrow: "Official information",
  title: "Contact Karang Bajo Village",
  description:
    "Use the official channels listed here for questions about visiting Karang Bajo.",
  emptyTitle: "Official contact information is not available yet",
  emptyDescription:
    "Approved official channels will appear here when they are configured and published.",
  primaryEyebrow: "Primary official channel",
  primaryTitle: "Village WhatsApp",
} as const;

export const metadata = buildPublicMetadata({
  title: copy.metadataTitle,
  description: copy.metadataDescription,
  openGraphLocale: "en_US",
});

export default async function EnglishContactPage() {
  const result = await getEnglishPublicShellData();
  if (result.kind === "error") {
    throw new Error("PUBLIC_ENGLISH_CONTACT_UNAVAILABLE");
  }

  const { externalLinks, whatsappHref } = result.data;
  const hasContacts = Boolean(whatsappHref || externalLinks.length);

  return (
    <PublicShell locale="en" englishContactData={result}>
      <div className="py-14 sm:py-20">
        <PublicContainer>
          <div className="mx-auto max-w-4xl">
            <p className="text-sm font-bold tracking-[0.16em] text-emerald-800 uppercase">
              {copy.eyebrow}
            </p>
            <h1 className="mt-3 font-serif text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
              {copy.title}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              {copy.description}
            </p>

            {!hasContacts ? (
              <div className="mt-10">
                <EmptyContentState
                  title={copy.emptyTitle}
                  description={copy.emptyDescription}
                />
              </div>
            ) : whatsappHref ? (
              <section className="mt-10 rounded-3xl bg-emerald-900 p-6 text-white sm:p-8">
                <p className="text-sm font-bold tracking-wide text-emerald-200 uppercase">
                  {copy.primaryEyebrow}
                </p>
                <h2 className="mt-2 font-serif text-2xl font-bold">
                  {copy.primaryTitle}
                </h2>
                <div className="mt-5">
                  <EnglishOfficialContactCta
                    whatsappHref={whatsappHref}
                    copy={dictionary.home.contact}
                    className="bg-white text-emerald-950 focus-visible:outline-amber-300"
                  />
                </div>
              </section>
            ) : null}
          </div>
        </PublicContainer>

        {hasContacts ? (
          <ExternalTourismLinksSection
            links={externalLinks}
            copy={dictionary.home.externalTourism}
          />
        ) : null}
      </div>
    </PublicShell>
  );
}
