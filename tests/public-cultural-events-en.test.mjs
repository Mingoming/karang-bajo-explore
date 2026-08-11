import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import {
  classifyPublishedEnglishCulturalEventDetail,
  formatEnglishCulturalEventSchedule,
  mapPublishedEnglishCulturalEvent,
  PUBLIC_CULTURAL_EVENT_SLUG_PATTERN,
} from "../features/public-cultural-events/english-model.ts";
import {
  createEnglishCulturalEventLoaderRuntime,
  loadEnglishCulturalEventLoaders,
  publishedCulturalEventImageRow,
} from "./public-cultural-event-loader-test-helpers.mjs";

const read = (path) => readFileSync(path, "utf8");
const loaderSource = read("features/public-cultural-events/english-data.ts");
const modelSource = read("features/public-cultural-events/english-model.ts");
const listPage = read("app/en/cultural-events/page.tsx");
const routeConfig = read("config/public-routes.ts");

const row = {
  id: "10000000-0000-4000-8000-000000000001",
  translation_id: "20000000-0000-4000-8000-000000000001",
  slug: "cultural-event-english",
  title: "  English Cultural Event  ",
  summary: "  Approved English event summary.  ",
  description: "  Approved English event description.  ",
  event_type: "  Ceremony  ",
  start_at: "2030-08-17T01:30:00.000Z",
  end_at: "2030-08-17T03:30:00.000Z",
  all_day: false,
  date_note: "  Confirmed date note.  ",
  location_name: "  English event location.  ",
  address: "  English event address.  ",
  latitude: "-8.2",
  longitude: "116.4",
  google_maps_url: "  https://maps.google.com/example  ",
  organizer: "  English organizer.  ",
  contact_phone: "  +628123456789  ",
  visitor_information: "  Approved English visitor information.  ",
  thumbnail_bucket: "tourism-media",
  thumbnail_path:
    "cultural-event/10000000-0000-4000-8000-000000000001/thumbnail.webp",
  is_featured: true,
  published_at: "2030-08-16T00:00:00.000Z",
  translation_published_at: "2030-08-16T01:00:00.000Z",
};

const primaryImageRow = publishedCulturalEventImageRow(row.id);
const primaryImage = {
  id: primaryImageRow.id,
  entityType: "cultural-event",
  parentId: row.id,
  bucket: "tourism-media",
  storagePath: primaryImageRow.storage_path,
  caption: primaryImageRow.caption,
  altText: primaryImageRow.alt_text,
  displayOrder: primaryImageRow.display_order,
  isPrimary: primaryImageRow.is_primary,
  signedUrl: "signed:primary",
};

test("English Cultural Event list and route manifest entries exist", () => {
  assert.equal(existsSync("app/en/cultural-events/page.tsx"), true);
  assert.equal(existsSync("app/en/cultural-events/[slug]/page.tsx"), true);
  assert.match(routeConfig, /PUBLIC_ENGLISH_CULTURAL_EVENTS_PATH/);
  assert.match(routeConfig, /PUBLIC_ENGLISH_CULTURAL_EVENT_DETAIL_PATH/);
  assert.match(routeConfig, /\/en\/cultural-events/);
  assert.match(routeConfig, /\/en\/cultural-events\/\[slug\]/);
});

test("English Cultural Event mapping uses translated fields and WITA formatting", () => {
  const event = mapPublishedEnglishCulturalEvent(row, [primaryImage]);

  assert.equal(event.title, "English Cultural Event");
  assert.equal(event.summary, "Approved English event summary.");
  assert.equal(event.description, "Approved English event description.");
  assert.equal(event.eventType, "Ceremony");
  assert.equal(event.dateNote, "Confirmed date note.");
  assert.equal(event.latitude, -8.2);
  assert.equal(event.longitude, 116.4);
  assert.equal(
    event.primaryImage?.altText,
    "Approved English event image alt text",
  );
  assert.equal(
    formatEnglishCulturalEventSchedule(event.startAt, event.allDay),
    "August 17, 2030 at 9:30 AM",
  );
  assert.equal(
    formatEnglishCulturalEventSchedule("2030-08-17T01:30:00.000Z", true),
    "August 17, 2030",
  );
  assert.equal(formatEnglishCulturalEventSchedule(null, false), null);
});

test("malformed required English projection fields are rejected by the mapper", () => {
  for (const [field, value] of [
    ["title", ""],
    ["title", "   "],
    ["description", ""],
    ["description", "   "],
    ["title", null],
    ["description", null],
  ]) {
    assert.equal(
      mapPublishedEnglishCulturalEvent({ ...row, [field]: value }, [
        primaryImage,
      ]),
      null,
      `${field}=${JSON.stringify(value)} must fail closed`,
    );
  }
});

test("English list loader reads only fail-closed event projections", async () => {
  assert.match(loaderSource, /published_english_cultural_events/);
  assert.match(loaderSource, /published_english_cultural_event_images/);
  assert.match(loaderSource, /signPublishedMedia/);
  assert.match(loaderSource, /server-only/);
  for (const forbiddenPath of [
    '.from("cultural_events")',
    '.from("cultural_event_translations")',
    '.from("cultural_event_images")',
    '.from("cultural_event_image_translations")',
    "getPublishedCulturalEvents",
  ]) {
    assert.doesNotMatch(loaderSource, new RegExp(forbiddenPath));
  }

  const runtime = createEnglishCulturalEventLoaderRuntime({
    parentRows: [row],
    imageRows: [
      primaryImageRow,
      publishedCulturalEventImageRow(row.id, {
        id: "00000000-0000-4000-8000-000000000003",
        storage_path: `cultural-event/${row.id}/00000000-0000-4000-8000-000000000003.webp`,
        alt_text: "Approved English gallery alt text",
        caption: "Approved English gallery caption",
        display_order: 1,
        is_primary: false,
      }),
    ],
  });
  const loaders = await loadEnglishCulturalEventLoaders(runtime);
  const result = await loaders.getPublishedEnglishCulturalEvents();

  assert.equal(result.kind, "ready");
  if (result.kind !== "ready") return;
  assert.equal(result.events.length, 1);
  assert.equal(
    result.events[0].primaryImage?.altText,
    "Approved English event image alt text",
  );
  assert.equal(
    result.events[0].gallery[1]?.caption,
    "Approved English gallery caption",
  );
  assert.deepEqual(runtime.tables, [
    "published_english_cultural_events",
    "published_english_cultural_event_images",
  ]);
  assert.deepEqual(
    runtime.signedReferences.map((reference) => ({
      entityType: reference.entityType,
      parentId: reference.parentId,
      storagePath: reference.storagePath,
      altText: reference.altText,
      caption: reference.caption,
    })),
    [
      {
        entityType: "cultural-event",
        parentId: row.id,
        storagePath: primaryImageRow.storage_path,
        altText: primaryImageRow.alt_text,
        caption: primaryImageRow.caption,
      },
      {
        entityType: "cultural-event",
        parentId: row.id,
        storagePath: `cultural-event/${row.id}/00000000-0000-4000-8000-000000000003.webp`,
        altText: "Approved English gallery alt text",
        caption: "Approved English gallery caption",
      },
    ],
  );
});

test("English list distinguishes empty, blocked, and projection-error results", async () => {
  const empty = await loadEnglishCulturalEventLoaders(
    createEnglishCulturalEventLoaderRuntime(),
  );
  assert.deepEqual(await empty.getPublishedEnglishCulturalEvents(), {
    kind: "ready",
    events: [],
  });

  const blocked = await loadEnglishCulturalEventLoaders(
    createEnglishCulturalEventLoaderRuntime(),
  );
  assert.deepEqual(await blocked.getPublishedEnglishCulturalEvents(), {
    kind: "ready",
    events: [],
  });

  const failed = await loadEnglishCulturalEventLoaders(
    createEnglishCulturalEventLoaderRuntime({
      parentError: { code: "projection-read-failed" },
    }),
  );
  assert.deepEqual(await failed.getPublishedEnglishCulturalEvents(), {
    kind: "error",
  });

  const malformed = await loadEnglishCulturalEventLoaders(
    createEnglishCulturalEventLoaderRuntime({
      parentRows: [{ ...row, title: "   " }],
      imageRows: [primaryImageRow],
    }),
  );
  assert.deepEqual(await malformed.getPublishedEnglishCulturalEvents(), {
    kind: "ready",
    events: [],
  });
});

test("English list fails closed for a missing primary while gallery is optional", async () => {
  const runtime = createEnglishCulturalEventLoaderRuntime({
    parentRows: [row],
    imageRows: [
      publishedCulturalEventImageRow(row.id, {
        is_primary: false,
      }),
    ],
  });
  const loaders = await loadEnglishCulturalEventLoaders(runtime);
  assert.deepEqual(await loaders.getPublishedEnglishCulturalEvents(), {
    kind: "ready",
    events: [],
  });

  const primaryOnly = await loadEnglishCulturalEventLoaders(
    createEnglishCulturalEventLoaderRuntime({
      parentRows: [row],
      imageRows: [primaryImageRow],
    }),
  );
  const result = await primaryOnly.getPublishedEnglishCulturalEvents();
  assert.equal(result.kind, "ready");
  if (result.kind !== "ready") return;
  assert.equal(result.events[0].gallery.length, 1);
});

test("English list route is localized and has no Indonesian fallback", () => {
  assert.match(listPage, /getPublishedEnglishCulturalEvents/);
  assert.match(listPage, /<PublicShell locale="en"/);
  assert.match(listPage, /EmptyContentState/);
  assert.match(listPage, /ENGLISH_CULTURAL_EVENT_COPY/);
  assert.match(listPage, /getPublicEnglishCulturalEventPath/);
  assert.doesNotMatch(
    `${listPage}\n${loaderSource}\n${modelSource}`,
    /getPublishedCulturalEvents|getPublishedCulturalEvent|\/acara-budaya|Acara Budaya|Belum ada acara/,
  );
});

test("source slugs are validated before detail lookup", () => {
  assert.equal(
    PUBLIC_CULTURAL_EVENT_SLUG_PATTERN.test("cultural-event-english"),
    true,
  );
  assert.equal(
    PUBLIC_CULTURAL_EVENT_SLUG_PATTERN.test("Cultural-Event"),
    false,
  );
  assert.match(
    loaderSource,
    /PUBLIC_CULTURAL_EVENT_SLUG_PATTERN\.test\(slug\)/,
  );
});

test("detail classification requires an eligible translated primary image", () => {
  const event = mapPublishedEnglishCulturalEvent(row, [primaryImage]);
  assert.equal(
    classifyPublishedEnglishCulturalEventDetail([event]).kind,
    "ready",
  );
  assert.deepEqual(
    classifyPublishedEnglishCulturalEventDetail([
      mapPublishedEnglishCulturalEvent(row, []),
    ]),
    { kind: "not-found" },
  );
});
