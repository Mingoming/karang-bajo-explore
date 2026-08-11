import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  createEnglishUmkmLoaderRuntime,
  loadEnglishUmkmLoaders,
  publishedUmkmImageRow,
} from "./public-umkm-loader-test-helpers.mjs";

const read = (path) => readFileSync(path, "utf8");
const detailPage = read("app/en/local-businesses/[slug]/page.tsx");
const loaderSource = read("features/public-umkms/english-data.ts");
const modelSource = read("features/public-umkms/english-model.ts");
const row = {
  id: "10000000-0000-4000-8000-000000000001",
  translation_id: "20000000-0000-4000-8000-000000000001",
  slug: "usaha-karang-bajo",
  business_name: "English Local Business",
  category: "Handicrafts",
  description: "Approved English business description",
  address: null,
  latitude: null,
  longitude: null,
  google_maps_url: null,
  owner_name: null,
  contact_name: null,
  contact_phone: null,
  contact_whatsapp: null,
  thumbnail_bucket: "tourism-media",
  thumbnail_path: "umkm/thumbnail.webp",
  is_featured: false,
  display_order: 0,
  published_at: "2030-08-12T00:00:00.000Z",
  translation_published_at: "2030-08-12T01:00:00.000Z",
};

test("English local-business detail uses English loader, source slug, and no-index fallback metadata", () => {
  assert.match(detailPage, /getPublishedEnglishUmkmBySlug/);
  assert.match(detailPage, /getPublishedEnglishUmkmMetadata/);
  assert.match(detailPage, /params: Promise<\{ slug: string \}>/);
  assert.match(detailPage, /notFound\(\)/);
  assert.match(detailPage, /noIndex: true/);
  assert.match(loaderSource, /\.eq\("slug", slug\)/);
  assert.doesNotMatch(
    detailPage + loaderSource,
    /getPublishedUmkm|\.from\(["']umkms["']\)|\.from\(["']umkm_translations["']\)|\.from\(["']umkm_images["']\)|\.from\(["']umkm_image_translations["']\)/,
  );
  assert.doesNotMatch(
    detailPage + loaderSource + modelSource,
    /\/umkm(?:\/|\b)|UMKM tidak tersedia|Belum tersedia/,
  );
});

test("English local-business detail returns translated content and translated media only", async () => {
  const runtime = createEnglishUmkmLoaderRuntime({
    parentRows: [row],
    imageRows: [publishedUmkmImageRow(row.id)],
  });
  const loaders = await loadEnglishUmkmLoaders(runtime);
  const result = await loaders.getPublishedEnglishUmkmBySlug(row.slug);
  assert.equal(result.kind, "ready");
  if (result.kind !== "ready") return;
  assert.equal(result.umkm.businessName, "English Local Business");
  assert.equal(result.umkm.primaryImage?.altText, "Approved English alt text");
  assert.deepEqual(runtime.tables, [
    "published_english_umkms",
    "published_english_umkm_images",
  ]);
});

test("missing, invalid, or primary-blocked English detail is not rendered", async () => {
  const missing = await loadEnglishUmkmLoaders(
    createEnglishUmkmLoaderRuntime(),
  );
  assert.deepEqual(await missing.getPublishedEnglishUmkmBySlug(row.slug), {
    kind: "not-found",
  });
  assert.deepEqual(
    await missing.getPublishedEnglishUmkmBySlug("not a valid slug"),
    { kind: "not-found" },
  );
  assert.equal(await missing.getPublishedEnglishUmkmMetadata(row.slug), null);

  const noPrimary = await loadEnglishUmkmLoaders(
    createEnglishUmkmLoaderRuntime({ parentRows: [row], imageRows: [] }),
  );
  assert.deepEqual(await noPrimary.getPublishedEnglishUmkmBySlug(row.slug), {
    kind: "not-found",
  });
});
