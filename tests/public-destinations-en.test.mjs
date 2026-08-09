import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import {
  classifyPublishedEnglishDestinationDetail,
  mapPublishedEnglishDestination,
} from "../features/public-destinations/english-model.ts";
import { PUBLIC_DESTINATION_SLUG_PATTERN } from "../features/public-destinations/model.ts";

const read = (path) => readFileSync(path, "utf8");
const loaderSource = read("features/public-destinations/english-data.ts");
const modelSource = read("features/public-destinations/english-model.ts");
const listPage = read("app/en/destinations/page.tsx");
const detailPage = read("app/en/destinations/[slug]/page.tsx");
const routeConfig = read("config/public-routes.ts");

const row = {
  id: "10000000-0000-4000-8000-000000000001",
  category_id: "10000000-0000-4000-8000-000000000001",
  name: "  Bukit English  ",
  slug: "bukit-english",
  summary: "  An approved English summary.  ",
  description: "  An approved English description.  ",
  history: "  A translated history.  ",
  latitude: "-8.2",
  longitude: "116.4",
  google_maps_url: "  https://maps.google.com/example  ",
  opening_hours: "  Every day 08:00-17:00  ",
  entrance_fee: "25000",
  price_note: "  Children enter free.  ",
  facilities: ["  Parking  ", "Restrooms"],
  contact_name: "  English contact  ",
  contact_phone: "  +628123456789  ",
  thumbnail_bucket: "tourism-media",
  thumbnail_path:
    "destination/10000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000002.jpg",
  is_featured: true,
  display_order: 0,
  source_published_at: "2026-08-08T00:00:00.000Z",
  english_published_at: "2026-08-09T00:00:00.000Z",
};

const primaryImage = {
  id: "00000000-0000-4000-8000-000000000002",
  entityType: "destination",
  parentId: row.id,
  bucket: "tourism-media",
  storagePath: row.thumbnail_path,
  caption: "  Approved image caption.  ",
  altText: "  Approved English image alt text.  ",
  displayOrder: 0,
  isPrimary: true,
  signedUrl: "https://example.test/signed-image",
};

test("English destination list and dynamic detail routes exist", () => {
  assert.equal(existsSync("app/en/destinations/page.tsx"), true);
  assert.equal(existsSync("app/en/destinations/[slug]/page.tsx"), true);
  assert.match(routeConfig, /PUBLIC_ENGLISH_DESTINATIONS_PATH/);
  assert.match(routeConfig, /PUBLIC_ENGLISH_DESTINATION_DETAIL_PATH/);
  assert.match(routeConfig, /\/en\/destinations/);
  assert.match(routeConfig, /\/en\/destinations\/\[slug\]/);
});

test("English destination mapping uses translated safe-view fields", () => {
  const destination = mapPublishedEnglishDestination(row, "alam", [
    primaryImage,
  ]);

  assert.equal(destination.name, "Bukit English");
  assert.equal(destination.summary, "An approved English summary.");
  assert.equal(destination.description, "An approved English description.");
  assert.equal(destination.categoryName, "Nature");
  assert.equal(destination.latitude, -8.2);
  assert.equal(destination.longitude, 116.4);
  assert.equal(destination.entranceFee, 25000);
  assert.equal(destination.openingHours, "Every day 08:00-17:00");
  assert.equal(destination.primaryImage?.altText, primaryImage.altText);
  assert.equal(destination.publishedAt, row.english_published_at);
  assert.equal("thumbnailAltText" in destination, false);
});

test("English detail classification is fail-closed", () => {
  assert.deepEqual(classifyPublishedEnglishDestinationDetail([]), {
    kind: "not-found",
  });

  const destination = mapPublishedEnglishDestination(row, "alam", [
    primaryImage,
  ]);
  assert.equal(
    classifyPublishedEnglishDestinationDetail([destination]).kind,
    "ready",
  );

  assert.deepEqual(
    classifyPublishedEnglishDestinationDetail([
      mapPublishedEnglishDestination(row, "alam", []),
    ]),
    { kind: "not-found" },
  );

  assert.deepEqual(
    classifyPublishedEnglishDestinationDetail([destination, destination]),
    { kind: "error" },
  );

  for (const unavailableCase of [
    "missing",
    "unpublished",
    "archived",
    "stale",
  ]) {
    assert.deepEqual(
      classifyPublishedEnglishDestinationDetail([]),
      { kind: "not-found" },
      unavailableCase,
    );
  }
});

test("invalid slugs are rejected before an English database lookup", () => {
  assert.equal(PUBLIC_DESTINATION_SLUG_PATTERN.test("Bukit-English"), false);
  assert.equal(PUBLIC_DESTINATION_SLUG_PATTERN.test("bukit-english"), true);
  assert.match(loaderSource, /PUBLIC_DESTINATION_SLUG_PATTERN\.test\(slug\)/);
  assert.match(detailPage, /result\.kind === "not-found"/);
  assert.match(detailPage, /notFound\(\)/);
});

test("English loader reads only the Phase 3B English public projections", () => {
  assert.match(loaderSource, /published_english_destinations/);
  assert.match(loaderSource, /published_english_destination_images/);
  for (const column of [
    "id",
    "category_id",
    "name",
    "slug",
    "summary",
    "description",
    "history",
    "latitude",
    "longitude",
    "google_maps_url",
    "opening_hours",
    "entrance_fee",
    "price_note",
    "facilities",
    "contact_name",
    "contact_phone",
    "thumbnail_bucket",
    "thumbnail_path",
    "is_featured",
    "display_order",
    "source_published_at",
    "english_published_at",
  ]) {
    assert.match(loaderSource, new RegExp(`"${column}"`));
  }

  for (const forbiddenPath of [
    '.from("destinations")',
    '.from("destination_translations")',
    '.from("destination_image_translations")',
    '.from("published_destinations")',
    "getPublishedDestinations",
  ]) {
    assert.doesNotMatch(loaderSource, new RegExp(forbiddenPath));
  }

  assert.match(loaderSource, /signPublishedMedia/);
  assert.match(loaderSource, /server-only/);
});

test("English pages provide localized metadata and never use Indonesian fallback", () => {
  assert.match(listPage, /getPublishedEnglishDestinations/);
  assert.match(listPage, /<PublicShell locale="en"/);
  assert.match(listPage, /destinations\.length === 0/);
  assert.match(detailPage, /getPublishedEnglishDestinationBySlug/);
  assert.match(detailPage, /getPublishedEnglishDestinationMetadata/);
  assert.match(detailPage, /openGraphLocale: "en_US"/);
  assert.match(detailPage, /noIndex: true/);
  assert.match(detailPage, /<PublicShell locale="en"/);

  assert.doesNotMatch(
    `${listPage}\n${detailPage}`,
    /getPublishedDestinations|getPublishedDestinationBySlug|formatDestinationPrice|\/destinasi|Tanpa kategori|Gratis|Belum ada destinasi/,
  );
});

test("English destination pages reuse shared components with explicit routes", () => {
  const sources = `${listPage}\n${detailPage}\n${modelSource}`;

  assert.match(listPage, /DestinationCard/);
  assert.match(
    listPage,
    /href=\{`\$\{PUBLIC_ENGLISH_DESTINATIONS_PATH\}\/\$\{encodeURIComponent\(destination\.slug\)\}`\}/,
  );
  assert.doesNotMatch(listPage, /hrefBase|copy=/);
  assert.match(detailPage, /DestinationGallery/);
  assert.match(detailPage, /DestinationLocationSummary/);
  assert.match(detailPage, /heading: "Gallery"/);
  assert.match(detailPage, /heading: "Coordinates"/);
  assert.doesNotMatch(
    sources,
    /\/destinasi|\/peta-wisata|Lihat detail|Galeri|Lokasi|Gambar utama|Gratis|Tanpa kategori/,
  );
});

test("English detail requires an eligible translated primary image", () => {
  assert.match(
    modelSource,
    /if \(!destination\.primaryImage\) return \{ kind: "not-found" \}/,
  );
  assert.match(detailPage, /primaryImage\?\.altText \?\? destination\.name/);
  assert.doesNotMatch(detailPage, /thumbnail_path|thumbnail_bucket/);
  assert.doesNotMatch(
    loaderSource,
    /destination_translations|destination_image_translations/,
  );
});
