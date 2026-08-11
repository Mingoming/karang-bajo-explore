import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  createEnglishHomestayLoaderRuntime,
  loadEnglishHomestayLoaders,
  publishedHomestayImageRow,
} from "./public-homestay-loader-test-helpers.mjs";

const read = (path) => readFileSync(path, "utf8");
const detailPage = read("app/en/homestays/[slug]/page.tsx");
const loaderSource = read("features/public-homestays/english-data.ts");
const modelSource = read("features/public-homestays/english-model.ts");
const row = {
  id: "10000000-0000-4000-8000-000000000001",
  translation_id: "20000000-0000-4000-8000-000000000001",
  slug: "homestay-english",
  name: "English Homestay",
  description: "Approved English description",
  address: null,
  price_note: null,
  facilities: [],
  price_per_night: 250000,
  latitude: null,
  longitude: null,
  google_maps_url: null,
  owner_name: null,
  phone: null,
  thumbnail_bucket: "tourism-media",
  thumbnail_path: "homestay/thumbnail.webp",
  is_featured: false,
  display_order: 0,
  published_at: "2030-08-16T00:00:00.000Z",
  translation_published_at: "2030-08-16T01:00:00.000Z",
};

test("English Homestay detail uses English loader, source slug, and no-index fallback metadata", () => {
  assert.match(detailPage, /getPublishedEnglishHomestayBySlug/);
  assert.match(detailPage, /getPublishedEnglishHomestayMetadata/);
  assert.match(detailPage, /params: Promise<\{ slug: string \}>/);
  assert.match(detailPage, /notFound\(\)/);
  assert.match(detailPage, /noIndex: true/);
  assert.match(loaderSource, /\.eq\("slug", slug\)/);
  assert.doesNotMatch(
    detailPage + loaderSource,
    /getPublishedHomestay|\.from\(["']homestays["']\)|\.from\(["']homestay_translations["']\)|\.from\(["']homestay_images["']\)|\.from\(["']homestay_image_translations["']\)/,
  );
  assert.doesNotMatch(
    detailPage + loaderSource + modelSource,
    /\/homestay(?:\/|\b)|Homestay tidak tersedia|Belum tersedia/,
  );
});

test("English Homestay detail loader returns translated parent and signed translated media", async () => {
  const runtime = createEnglishHomestayLoaderRuntime({
    parentRows: [row],
    imageRows: [publishedHomestayImageRow(row.id)],
  });
  const loaders = await loadEnglishHomestayLoaders(runtime);
  const result = await loaders.getPublishedEnglishHomestayBySlug(row.slug);
  assert.equal(result.kind, "ready");
  if (result.kind !== "ready") return;
  assert.equal(result.homestay.name, "English Homestay");
  assert.equal(
    result.homestay.primaryImage?.altText,
    "Approved English alt text",
  );
  assert.deepEqual(runtime.tables, [
    "published_english_homestays",
    "published_english_homestay_images",
  ]);
});

test("missing, stale, or source-blocked English detail is not rendered", async () => {
  const missing = await loadEnglishHomestayLoaders(
    createEnglishHomestayLoaderRuntime(),
  );
  assert.deepEqual(await missing.getPublishedEnglishHomestayBySlug(row.slug), {
    kind: "not-found",
  });
  assert.equal(
    await missing.getPublishedEnglishHomestayMetadata(row.slug),
    null,
  );

  const noPrimary = await loadEnglishHomestayLoaders(
    createEnglishHomestayLoaderRuntime({ parentRows: [row], imageRows: [] }),
  );
  assert.deepEqual(
    await noPrimary.getPublishedEnglishHomestayBySlug(row.slug),
    { kind: "not-found" },
  );
});
