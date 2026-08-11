import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  createEnglishCulturalEventLoaderRuntime,
  loadEnglishCulturalEventLoaders,
  publishedCulturalEventImageRow,
} from "./public-cultural-event-loader-test-helpers.mjs";

const read = (path) => readFileSync(path, "utf8");
const detailPage = read("app/en/cultural-events/[slug]/page.tsx");
const loaderSource = read("features/public-cultural-events/english-data.ts");
const modelSource = read("features/public-cultural-events/english-model.ts");

const detailRow = {
  id: "10000000-0000-4000-8000-000000000001",
  translation_id: "20000000-0000-4000-8000-000000000001",
  slug: "cultural-event-english",
  title: "English Cultural Event",
  summary: null,
  description: "Approved English event description",
  event_type: null,
  start_at: "2030-08-17T01:30:00.000Z",
  end_at: null,
  all_day: true,
  date_note: "Date confirmed by the event owner",
  location_name: null,
  address: null,
  latitude: null,
  longitude: null,
  google_maps_url: null,
  organizer: null,
  contact_phone: null,
  visitor_information: null,
  thumbnail_bucket: "tourism-media",
  thumbnail_path:
    "cultural-event/10000000-0000-4000-8000-000000000001/thumbnail.webp",
  is_featured: false,
  published_at: "2030-08-16T00:00:00.000Z",
  translation_published_at: "2030-08-16T01:00:00.000Z",
};

test("English detail uses only the English event loaders and localized copy", () => {
  assert.match(detailPage, /getPublishedEnglishCulturalEventBySlug/);
  assert.match(detailPage, /getPublishedEnglishCulturalEventMetadata/);
  assert.match(detailPage, /ENGLISH_CULTURAL_EVENT_COPY/);
  assert.match(detailPage, /<PublicShell locale="en"/);
  assert.doesNotMatch(
    `${detailPage}\n${loaderSource}`,
    /getPublishedCulturalEvents|getPublishedCulturalEvent|public-domains|\/acara-budaya/,
  );
});

test("English detail is fail-closed and missing metadata is noindexed", () => {
  assert.match(detailPage, /result\.kind === "not-found"/);
  assert.match(detailPage, /notFound\(\)/);
  assert.match(detailPage, /PUBLIC_ENGLISH_CULTURAL_EVENT_DETAIL_UNAVAILABLE/);
  assert.match(detailPage, /noIndex: true/);
  assert.match(loaderSource, /published_english_cultural_events/);
  assert.match(loaderSource, /published_english_cultural_event_images/);
});

test("English detail renders translated media and source-owned WITA schedule only", () => {
  assert.match(detailPage, /formatEnglishCulturalEventSchedule/);
  assert.match(modelSource, /timeZone: "Asia\/Makassar"/);
  assert.match(detailPage, /alt=\{event\.primaryImage\.altText\}/);
  assert.match(detailPage, /alt=\{image\.altText\}/);
  assert.match(detailPage, /\{image\.caption\}/);
  assert.doesNotMatch(
    `${detailPage}\n${loaderSource}`,
    /\.from\(["']cultural_event_translations["']\)|\.from\(["']cultural_event_image_translations["']\)|\.from\(["']cultural_events["']\)|\.from\(["']cultural_event_images["']\)/,
  );
  assert.doesNotMatch(
    `${detailPage}\n${modelSource}`,
    /Acara Budaya|acara budaya|Semua acara|Pertanyaan acara|Buka lokasi acara/,
  );
  assert.doesNotMatch(
    detailPage,
    /canonical|hreflang|alternates|metadataBase|sitemap|production-origin/,
  );
});

test("English detail loader resolves source slug against the public English projection", async () => {
  const runtime = createEnglishCulturalEventLoaderRuntime({
    parentRows: [detailRow],
    imageRows: [publishedCulturalEventImageRow(detailRow.id)],
  });
  const loaders = await loadEnglishCulturalEventLoaders(runtime);

  const result = await loaders.getPublishedEnglishCulturalEventBySlug(
    detailRow.slug,
  );
  assert.equal(result.kind, "ready");
  if (result.kind !== "ready") return;
  assert.equal(result.event.title, "English Cultural Event");
  assert.equal(result.event.summary, null);
  assert.equal(
    result.event.primaryImage?.altText,
    "Approved English event image alt text",
  );
  assert.deepEqual(runtime.tables, [
    "published_english_cultural_events",
    "published_english_cultural_event_images",
  ]);
  assert.equal(runtime.signedReferences.length, 1);
  assert.equal(
    runtime.signedReferences[0].storagePath,
    `cultural-event/${detailRow.id}/00000000-0000-4000-8000-000000000002.webp`,
  );
});

test("English detail and metadata fail closed for unavailable or ineligible rows", async () => {
  const missing = await loadEnglishCulturalEventLoaders(
    createEnglishCulturalEventLoaderRuntime(),
  );
  assert.deepEqual(
    await missing.getPublishedEnglishCulturalEventBySlug(detailRow.slug),
    { kind: "not-found" },
  );
  assert.equal(
    await missing.getPublishedEnglishCulturalEventMetadata(detailRow.slug),
    null,
  );

  const missingPrimary = await loadEnglishCulturalEventLoaders(
    createEnglishCulturalEventLoaderRuntime({
      parentRows: [detailRow],
      imageRows: [],
    }),
  );
  assert.deepEqual(
    await missingPrimary.getPublishedEnglishCulturalEventBySlug(detailRow.slug),
    { kind: "not-found" },
  );

  for (const field of ["title", "description"]) {
    const malformed = await loadEnglishCulturalEventLoaders(
      createEnglishCulturalEventLoaderRuntime({
        parentRows: [{ ...detailRow, [field]: "   " }],
        imageRows: [publishedCulturalEventImageRow(detailRow.id)],
      }),
    );
    assert.deepEqual(
      await malformed.getPublishedEnglishCulturalEventBySlug(detailRow.slug),
      { kind: "not-found" },
      `${field} whitespace must not render as an English detail`,
    );
    assert.equal(
      await malformed.getPublishedEnglishCulturalEventMetadata(detailRow.slug),
      null,
      `${field} whitespace must not produce metadata`,
    );
  }
});

test("metadata uses translated description when the projected English summary is empty", async () => {
  const runtime = createEnglishCulturalEventLoaderRuntime({
    parentRows: [detailRow],
  });
  const loaders = await loadEnglishCulturalEventLoaders(runtime);
  assert.deepEqual(
    await loaders.getPublishedEnglishCulturalEventMetadata(detailRow.slug),
    {
      title: "English Cultural Event",
      description: "Approved English event description",
    },
  );
  assert.deepEqual(runtime.tables, ["published_english_cultural_events"]);
});

test("malformed English metadata cannot fall back to Indonesian site copy", () => {
  assert.doesNotMatch(
    `${detailPage}\n${loaderSource}`,
    /SITE_CONFIG\.tagline|Jelajahi Alam, Budaya, dan Tradisi/,
  );
  assert.match(detailPage, /metadataUnavailableDescription/);
  assert.match(detailPage, /noIndex: true/);
});
