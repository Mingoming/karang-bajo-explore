import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  createEnglishTraditionalHouseLoaderRuntime,
  loadEnglishTraditionalHouseLoaders,
  publishedTraditionalHouseImageRow,
} from "./public-traditional-house-loader-test-helpers.mjs";

const read = (path) => readFileSync(path, "utf8");
const detailPage = read("app/en/traditional-houses/[slug]/page.tsx");
const loaderSource = read("features/public-traditional-houses/english-data.ts");
const modelSource = read("features/public-traditional-houses/english-model.ts");

const detailRow = {
  id: "10000000-0000-4000-8000-000000000001",
  translation_id: "20000000-0000-4000-8000-000000000001",
  slug: "rumah-adat-english",
  name: "English Traditional House",
  summary: "Approved English summary",
  description: "Approved English description",
  history: null,
  cultural_significance: null,
  location_name: null,
  visitor_information: null,
  latitude: null,
  longitude: null,
  google_maps_url: null,
  thumbnail_bucket: "tourism-media",
  thumbnail_path: "traditional-house/thumbnail.webp",
  is_featured: false,
  display_order: 0,
  published_at: "2026-08-10T00:00:00.000Z",
  translation_published_at: "2026-08-10T01:00:00.000Z",
};

test("English Traditional House detail uses English public loaders", () => {
  assert.match(detailPage, /getPublishedEnglishTraditionalHouseBySlug/);
  assert.match(detailPage, /getPublishedEnglishTraditionalHouseMetadata/);
  assert.match(detailPage, /ENGLISH_TRADITIONAL_HOUSE_COPY/);
  assert.match(detailPage, /<PublicShell locale="en"/);
  assert.doesNotMatch(
    detailPage,
    /getPublishedTraditionalHouses|getPublishedTraditionalHouse|public-domains|\/rumah-adat/,
  );
});

test("English Traditional House detail is fail-closed and noindexes missing metadata", () => {
  assert.match(detailPage, /result\.kind !== "ready"/);
  assert.match(detailPage, /result\.kind === "not-found"/);
  assert.match(detailPage, /notFound\(\)/);
  assert.match(
    detailPage,
    /PUBLIC_ENGLISH_TRADITIONAL_HOUSE_DETAIL_UNAVAILABLE/,
  );
  assert.match(detailPage, /noIndex: true/);
  assert.match(loaderSource, /published_english_traditional_houses/);
  assert.match(loaderSource, /published_english_traditional_house_images/);
  assert.match(
    modelSource,
    /if \(!house\.primaryImage\) return \{ kind: "not-found" \}/,
  );
});

test("English detail renders translated image text without Indonesian fallback", () => {
  assert.match(detailPage, /alt=\{house\.primaryImage\.altText\}/);
  assert.match(detailPage, /alt=\{image\.altText\}/);
  assert.match(detailPage, /\{image\.caption\}/);
  assert.doesNotMatch(
    detailPage + "\n" + loaderSource,
    /\.from\(["']traditional_house_translations["']\)|\.from\(["']traditional_house_image_translations["']\)|\.from\(["']traditional_houses["']\)|\.from\(["']traditional_house_images["']\)/,
  );
  assert.doesNotMatch(
    detailPage + "\n" + modelSource,
    /Rumah Adat|rumah adat|Gambar utama|Galeri|Lokasi|\/destinasi|\/rumah-adat/,
  );
});

test("English detail uses source slugs only and keeps SEO work scoped", () => {
  assert.match(detailPage, /params: Promise<\{ slug: string \}>/);
  assert.match(loaderSource, /\.eq\("slug", slug\)/);
  assert.doesNotMatch(
    detailPage + "\n" + loaderSource,
    /canonical|hreflang|alternates|metadataBase|sitemap|production-origin/,
  );
});

test("English Traditional House detail loader returns translated parent and media data", async () => {
  const runtime = createEnglishTraditionalHouseLoaderRuntime({
    parentRows: [detailRow],
    imageRows: [publishedTraditionalHouseImageRow(detailRow.id)],
  });
  const loaders = await loadEnglishTraditionalHouseLoaders(runtime);

  const result = await loaders.getPublishedEnglishTraditionalHouseBySlug(
    detailRow.slug,
  );

  assert.equal(result.kind, "ready");
  if (result.kind !== "ready") return;
  assert.equal(result.house.name, "English Traditional House");
  assert.equal(result.house.primaryImage?.altText, "Approved English alt text");
  assert.equal(result.house.primaryImage?.caption, "Approved English caption");
  assert.equal(runtime.signedReferences.length, 1);
  assert.deepEqual(runtime.tables, [
    "published_english_traditional_houses",
    "published_english_traditional_house_images",
  ]);
  assert.equal(
    runtime.signedReferences[0].storagePath,
    `${detailRow.id}/image.webp`,
  );
});

test("English Traditional House detail and metadata loaders fail closed for missing or ineligible rows", async () => {
  const missingRuntime = createEnglishTraditionalHouseLoaderRuntime();
  const missingLoaders =
    await loadEnglishTraditionalHouseLoaders(missingRuntime);
  assert.deepEqual(
    await missingLoaders.getPublishedEnglishTraditionalHouseBySlug(
      detailRow.slug,
    ),
    { kind: "not-found" },
  );
  assert.equal(
    await missingLoaders.getPublishedEnglishTraditionalHouseMetadata(
      detailRow.slug,
    ),
    null,
  );

  const missingPrimaryRuntime = createEnglishTraditionalHouseLoaderRuntime({
    parentRows: [detailRow],
    imageRows: [],
  });
  const missingPrimaryLoaders = await loadEnglishTraditionalHouseLoaders(
    missingPrimaryRuntime,
  );
  assert.deepEqual(
    await missingPrimaryLoaders.getPublishedEnglishTraditionalHouseBySlug(
      detailRow.slug,
    ),
    { kind: "not-found" },
  );
});

test("English Traditional House metadata reads the published English projection only", async () => {
  const runtime = createEnglishTraditionalHouseLoaderRuntime({
    parentRows: [detailRow],
  });
  const loaders = await loadEnglishTraditionalHouseLoaders(runtime);

  assert.deepEqual(
    await loaders.getPublishedEnglishTraditionalHouseMetadata(detailRow.slug),
    {
      name: "English Traditional House",
      summary: "Approved English summary",
    },
  );
  assert.deepEqual(runtime.tables, ["published_english_traditional_houses"]);
});
