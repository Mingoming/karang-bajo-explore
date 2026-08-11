import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PublicContainer } from "@/components/public/public-container";
import { PublicMediaImage } from "@/components/public/public-media-image";
import { PublicShell } from "@/components/public/public-shell";
import { PUBLIC_ENGLISH_CULTURAL_EVENTS_PATH } from "@/config/public-routes";
import { EnglishOfficialContactCta } from "@/features/official-contact/official-contact-cta";
import { getEnglishPublicShellData } from "@/features/official-contact/public-shell-data";
import {
  ENGLISH_CULTURAL_EVENT_COPY,
  formatEnglishCulturalEventSchedule,
  type PublicEnglishCulturalEvent,
} from "@/features/public-cultural-events/english-model";
import {
  getPublishedEnglishCulturalEventBySlug,
  getPublishedEnglishCulturalEventMetadata,
} from "@/features/public-cultural-events/english-data";
import { buildPublicMetadata } from "@/features/seo/public-metadata";
import { PUBLIC_DICTIONARIES } from "@/lib/i18n/dictionaries";

type CulturalEventDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: CulturalEventDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await getPublishedEnglishCulturalEventMetadata(slug);

  if (!event) {
    return buildPublicMetadata({
      title: ENGLISH_CULTURAL_EVENT_COPY.detail.metadataUnavailableTitle,
      description:
        ENGLISH_CULTURAL_EVENT_COPY.detail.metadataUnavailableDescription,
      noIndex: true,
      openGraphLocale: "en_US",
    });
  }

  return buildPublicMetadata({
    title: event.title,
    description: event.description,
    openGraphLocale: "en_US",
  });
}

function CulturalEventSchedule({
  event,
}: Readonly<{ event: PublicEnglishCulturalEvent }>) {
  const start = formatEnglishCulturalEventSchedule(event.startAt, event.allDay);
  const end = formatEnglishCulturalEventSchedule(event.endAt, event.allDay);

  return (
    <section aria-labelledby="cultural-event-schedule">
      <h2
        id="cultural-event-schedule"
        className="font-serif text-3xl font-bold"
      >
        {ENGLISH_CULTURAL_EVENT_COPY.detail.scheduleHeading}
      </h2>
      <dl className="mt-5 space-y-3 leading-7 text-slate-700">
        <div>
          <dt className="font-bold text-slate-950">
            {ENGLISH_CULTURAL_EVENT_COPY.detail.startLabel}
          </dt>
          <dd>
            {start ?? ENGLISH_CULTURAL_EVENT_COPY.detail.scheduleUnavailable}
          </dd>
        </div>
        {end ? (
          <div>
            <dt className="font-bold text-slate-950">
              {ENGLISH_CULTURAL_EVENT_COPY.detail.endLabel}
            </dt>
            <dd>{end}</dd>
          </div>
        ) : null}
        {event.dateNote ? (
          <div>
            <dt className="font-bold text-slate-950">
              {ENGLISH_CULTURAL_EVENT_COPY.detail.dateNoteLabel}
            </dt>
            <dd>{event.dateNote}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}

function CulturalEventLocation({
  event,
}: Readonly<{ event: PublicEnglishCulturalEvent }>) {
  const hasCoordinates = event.latitude !== null && event.longitude !== null;

  return (
    <section aria-labelledby="cultural-event-location">
      <h2
        id="cultural-event-location"
        className="font-serif text-3xl font-bold"
      >
        {ENGLISH_CULTURAL_EVENT_COPY.detail.locationHeading}
      </h2>
      {event.locationName ? (
        <p className="mt-5 font-bold text-slate-950">{event.locationName}</p>
      ) : null}
      {event.address ? (
        <p className="mt-2 whitespace-pre-line leading-7 text-slate-700">
          <span className="font-bold text-slate-950">
            {ENGLISH_CULTURAL_EVENT_COPY.detail.addressLabel}:{" "}
          </span>
          {event.address}
        </p>
      ) : null}
      {hasCoordinates ? (
        <p className="mt-3 text-slate-700">
          <span className="font-bold text-slate-950">
            {ENGLISH_CULTURAL_EVENT_COPY.detail.coordinatesLabel}:{" "}
          </span>
          {event.latitude}, {event.longitude}
        </p>
      ) : null}
      {event.googleMapsUrl ? (
        <a
          href={event.googleMapsUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-block font-bold text-emerald-800 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-emerald-700"
        >
          {ENGLISH_CULTURAL_EVENT_COPY.detail.googleMapsLabel}
        </a>
      ) : null}
    </section>
  );
}

function CulturalEventGallery({
  event,
}: Readonly<{ event: PublicEnglishCulturalEvent }>) {
  const gallery = event.gallery.filter(
    (image) => image.id !== event.primaryImage?.id,
  );

  if (gallery.length === 0) return null;

  return (
    <section aria-labelledby="cultural-event-gallery">
      <h2 id="cultural-event-gallery" className="font-serif text-3xl font-bold">
        {ENGLISH_CULTURAL_EVENT_COPY.detail.galleryHeading}
      </h2>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        {gallery.map((image) => (
          <figure key={image.id}>
            <PublicMediaImage
              src={image.signedUrl}
              alt={image.altText}
              sizes="(max-width: 639px) 100vw, 50vw"
              className="aspect-[4/3] rounded-2xl"
            />
            {image.caption ? (
              <figcaption className="mt-2 text-sm leading-6 text-slate-600">
                {image.caption}
              </figcaption>
            ) : null}
          </figure>
        ))}
      </div>
    </section>
  );
}

function CulturalEventDetails({
  event,
}: Readonly<{ event: PublicEnglishCulturalEvent }>) {
  return (
    <div className="space-y-12">
      <section aria-labelledby="cultural-event-about">
        <h2 id="cultural-event-about" className="font-serif text-3xl font-bold">
          {ENGLISH_CULTURAL_EVENT_COPY.detail.aboutHeading}
        </h2>
        <p className="mt-5 whitespace-pre-line text-lg leading-8 text-slate-700">
          {event.description}
        </p>
      </section>

      <CulturalEventSchedule event={event} />
      <CulturalEventLocation event={event} />

      {event.visitorInformation || event.organizer || event.contactPhone ? (
        <section aria-labelledby="cultural-event-visitor-information">
          <h2
            id="cultural-event-visitor-information"
            className="font-serif text-3xl font-bold"
          >
            {ENGLISH_CULTURAL_EVENT_COPY.detail.visitorHeading}
          </h2>
          {event.visitorInformation ? (
            <p className="mt-5 whitespace-pre-line leading-7 text-slate-700">
              {event.visitorInformation}
            </p>
          ) : null}
          {event.organizer ? (
            <p className="mt-4 text-slate-700">
              <span className="font-bold text-slate-950">
                {ENGLISH_CULTURAL_EVENT_COPY.detail.organizerLabel}:{" "}
              </span>
              {event.organizer}
            </p>
          ) : null}
          {event.contactPhone ? (
            <p className="mt-2 text-slate-700">
              <span className="font-bold text-slate-950">
                {ENGLISH_CULTURAL_EVENT_COPY.detail.contactLabel}:{" "}
              </span>
              {event.contactPhone}
            </p>
          ) : null}
        </section>
      ) : null}

      <CulturalEventGallery event={event} />
    </div>
  );
}

export default async function EnglishCulturalEventDetailPage({
  params,
}: CulturalEventDetailPageProps) {
  const { slug } = await params;
  const result = await getPublishedEnglishCulturalEventBySlug(slug);

  if (result.kind !== "ready") {
    if (result.kind === "not-found") notFound();
    throw new Error("PUBLIC_ENGLISH_CULTURAL_EVENT_DETAIL_UNAVAILABLE");
  }

  const event = result.event;
  if (!event.primaryImage) notFound();

  const contactResult = await getEnglishPublicShellData();
  const contactData =
    contactResult.kind === "ready"
      ? contactResult.data
      : { whatsappHref: null, externalLinks: [] };

  return (
    <PublicShell locale="en" englishContactData={contactResult}>
      <article>
        <header className="bg-emerald-950 py-10 text-white sm:py-14">
          <PublicContainer>
            <nav
              aria-label="Breadcrumb"
              className="text-sm text-emerald-100/75"
            >
              <Link
                href={PUBLIC_ENGLISH_CULTURAL_EVENTS_PATH}
                className="rounded-sm hover:text-white focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-amber-300"
              >
                {ENGLISH_CULTURAL_EVENT_COPY.detail.breadcrumb}
              </Link>
              <span aria-hidden="true" className="mx-2">
                /
              </span>
              <span aria-current="page">{event.title}</span>
            </nav>
            <p className="mt-8 text-sm font-bold tracking-[0.18em] text-amber-300 uppercase">
              {event.eventType ?? ENGLISH_CULTURAL_EVENT_COPY.list.eyebrow}
            </p>
            <h1 className="mt-3 max-w-4xl font-serif text-4xl font-bold tracking-tight sm:text-6xl">
              {event.title}
            </h1>
            {event.summary ? (
              <p className="mt-5 max-w-3xl text-lg leading-8 text-emerald-50/80">
                {event.summary}
              </p>
            ) : null}
          </PublicContainer>
        </header>

        <PublicContainer className="py-10 sm:py-14">
          <PublicMediaImage
            src={event.primaryImage.signedUrl}
            alt={event.primaryImage.altText}
            sizes="(max-width: 1279px) 100vw, 1200px"
            priority
            className="aspect-[16/9] rounded-3xl"
          />

          <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <CulturalEventDetails event={event} />

            <aside className="h-fit rounded-2xl bg-emerald-50 p-6">
              <h2 className="font-serif text-2xl font-bold text-slate-950">
                {ENGLISH_CULTURAL_EVENT_COPY.detail.questionsHeading}
              </h2>
              <p className="mt-2 text-slate-600">
                {ENGLISH_CULTURAL_EVENT_COPY.detail.questionsDescription}
              </p>
              <div className="mt-5">
                <EnglishOfficialContactCta
                  whatsappHref={contactData.whatsappHref}
                  copy={PUBLIC_DICTIONARIES.en.home.contact}
                  className="bg-emerald-900 text-white focus-visible:outline-emerald-700"
                />
              </div>
            </aside>
          </div>
        </PublicContainer>
      </article>
    </PublicShell>
  );
}
