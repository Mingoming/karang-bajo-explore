import Link from "next/link";

import { EmptyContentState } from "@/components/public/empty-content-state";
import { PublicContainer } from "@/components/public/public-container";
import { PublicMediaImage } from "@/components/public/public-media-image";
import { PublicShell } from "@/components/public/public-shell";
import { getPublicEnglishCulturalEventPath } from "@/config/public-routes";
import { getEnglishPublicShellData } from "@/features/official-contact/public-shell-data";
import {
  ENGLISH_CULTURAL_EVENT_COPY,
  formatEnglishCulturalEventSchedule,
  type PublicEnglishCulturalEvent,
} from "@/features/public-cultural-events/english-model";
import { getPublishedEnglishCulturalEvents } from "@/features/public-cultural-events/english-data";
import { buildPublicMetadata } from "@/features/seo/public-metadata";

export const metadata = buildPublicMetadata({
  title: ENGLISH_CULTURAL_EVENT_COPY.list.metadataTitle,
  description: ENGLISH_CULTURAL_EVENT_COPY.list.metadataDescription,
  openGraphLocale: "en_US",
});

function EnglishCulturalEventCard({
  event,
  highPriority,
}: Readonly<{
  event: PublicEnglishCulturalEvent;
  highPriority: boolean;
}>) {
  if (!event.primaryImage) return null;

  const schedule = formatEnglishCulturalEventSchedule(
    event.startAt,
    event.allDay,
  );

  return (
    <Link
      href={getPublicEnglishCulturalEventPath(event.slug)}
      aria-label={`${ENGLISH_CULTURAL_EVENT_COPY.list.cardAction}: ${event.title}`}
      className="group block h-full rounded-2xl focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-emerald-700"
    >
      <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow group-hover:shadow-lg group-focus-visible:shadow-lg motion-reduce:transition-none">
        <PublicMediaImage
          src={event.primaryImage.signedUrl}
          alt={event.primaryImage.altText}
          sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 33vw"
          priority={highPriority}
          className="aspect-[4/3]"
        />
        <div className="flex flex-1 flex-col p-5 sm:p-6">
          <p className="text-xs font-bold tracking-[0.16em] text-emerald-800 uppercase">
            {event.eventType ?? ENGLISH_CULTURAL_EVENT_COPY.list.eyebrow}
          </p>
          <h2 className="mt-3 font-serif text-2xl font-bold text-slate-950">
            {event.title}
          </h2>
          {event.summary ? (
            <p className="mt-3 line-clamp-3 flex-1 leading-7 text-slate-600">
              {event.summary}
            </p>
          ) : (
            <div className="flex-1" />
          )}
          <p className="mt-4 text-sm font-semibold text-slate-700">
            {schedule ?? ENGLISH_CULTURAL_EVENT_COPY.list.scheduleUnavailable}
          </p>
          {event.dateNote ? (
            <p className="mt-1 line-clamp-2 text-sm text-slate-600">
              {event.dateNote}
            </p>
          ) : null}
          <p className="mt-5 text-sm font-bold text-emerald-800 group-hover:text-emerald-950">
            {ENGLISH_CULTURAL_EVENT_COPY.list.cardAction}{" "}
            <span aria-hidden="true">→</span>
          </p>
        </div>
      </article>
    </Link>
  );
}

export default async function EnglishCulturalEventListPage() {
  const [result, contactResult] = await Promise.all([
    getPublishedEnglishCulturalEvents(),
    getEnglishPublicShellData(),
  ]);

  if (result.kind === "error") {
    throw new Error("PUBLIC_ENGLISH_CULTURAL_EVENT_LIST_UNAVAILABLE");
  }

  return (
    <PublicShell locale="en" englishContactData={contactResult}>
      <section className="border-b border-emerald-950/10 bg-emerald-950 py-16 text-white sm:py-20">
        <PublicContainer>
          <p className="text-sm font-bold tracking-[0.18em] text-amber-300 uppercase">
            {ENGLISH_CULTURAL_EVENT_COPY.list.eyebrow}
          </p>
          <h1 className="mt-4 max-w-4xl font-serif text-4xl font-bold tracking-tight sm:text-5xl">
            {ENGLISH_CULTURAL_EVENT_COPY.list.title}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-emerald-50/80">
            {ENGLISH_CULTURAL_EVENT_COPY.list.description}
          </p>
        </PublicContainer>
      </section>

      <section
        className="py-12 sm:py-16"
        aria-labelledby="english-cultural-events"
      >
        <PublicContainer>
          <div className="border-b border-slate-200 pb-8">
            <p className="text-sm font-bold tracking-[0.14em] text-emerald-800 uppercase">
              {ENGLISH_CULTURAL_EVENT_COPY.list.sectionEyebrow}
            </p>
            <h2
              id="english-cultural-events"
              className="mt-2 font-serif text-3xl font-bold"
            >
              {ENGLISH_CULTURAL_EVENT_COPY.list.sectionTitle}
            </h2>
          </div>

          <div className="mt-8">
            {result.events.length === 0 ? (
              <EmptyContentState
                title={ENGLISH_CULTURAL_EVENT_COPY.list.emptyTitle}
                description={ENGLISH_CULTURAL_EVENT_COPY.list.emptyDescription}
              />
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {result.events.map((event, index) => (
                  <EnglishCulturalEventCard
                    key={event.id}
                    event={event}
                    highPriority={index === 0}
                  />
                ))}
              </div>
            )}
          </div>
        </PublicContainer>
      </section>
    </PublicShell>
  );
}
