import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import {
  mapPublishedEnglishUmkm,
  PUBLIC_UMKM_SLUG_PATTERN,
} from "../features/public-umkms/english-model.ts";
import {
  createEnglishUmkmLoaderRuntime,
  loadEnglishUmkmLoaders,
  publishedUmkmImageRow,
} from "./public-umkm-loader-test-helpers.mjs";

const read = (path) => readFileSync(path, "utf8");
const PARENT_ID = "10000000-0000-4000-8000-000000000001";
const row = {
  id: PARENT_ID,
  translation_id: "20000000-0000-4000-8000-000000000001",
  slug: "usaha-karang-bajo",
  business_name: "  English Local Business  ",
  category: "  Handicrafts  ",
  description: "  Approved English business description.  ",
  address: "  English address  ",
  latitude: "-8.2",
  longitude: "116.4",
  google_maps_url: "https://maps.google.com/local-business",
  owner_name: "Consented Owner",
  contact_name: "Consented Contact",
  contact_phone: "+628123456789",
  contact_whatsapp: "+628123456789",
  thumbnail_bucket: "tourism-media",
  thumbnail_path: "umkm/thumbnail.webp",
  is_featured: true,
  display_order: 0,
  published_at: "2030-08-12T00:00:00.000Z",
  translation_published_at: "2030-08-12T01:00:00.000Z",
};

test("English local-business routes and manifest entry exist", () => {
  assert.equal(existsSync("app/en/local-businesses/page.tsx"), true);
  assert.equal(existsSync("app/en/local-businesses/[slug]/page.tsx"), true);
  const config = read("config/public-routes.ts");
  assert.match(config, /PUBLIC_ENGLISH_UMKMS_PATH/);
  assert.match(config, /PUBLIC_ENGLISH_UMKM_DETAIL_PATH/);
  assert.match(config, /\/en\/local-businesses/);
  assert.match(
    config,
    /umkm: \{ id: "\/umkm", en: PUBLIC_ENGLISH_UMKMS_PATH \}/,
  );
});

test("English UMKM mapping uses translated fields and signed translated media", () => {
  const image = {
    id: "00000000-0000-4000-8000-000000000002",
    entityType: "umkm",
    parentId: PARENT_ID,
    bucket: "tourism-media",
    storagePath: `umkm/${PARENT_ID}/00000000-0000-4000-8000-000000000002.webp`,
    altText: "Approved English alt text",
    caption: "Approved English caption",
    displayOrder: 0,
    isPrimary: true,
    signedUrl: "https://signed.invalid/image",
  };
  const umkm = mapPublishedEnglishUmkm(row, [image]);
  assert.equal(umkm.businessName, "English Local Business");
  assert.equal(umkm.category, "Handicrafts");
  assert.equal(umkm.description, "Approved English business description.");
  assert.equal(umkm.address, "English address");
  assert.equal(umkm.primaryImage?.altText, "Approved English alt text");
});

test("English UMKM loader reads only fail-closed English projections", async () => {
  const loaderSource = read("features/public-umkms/english-data.ts");
  const listPage = read("app/en/local-businesses/page.tsx");
  assert.match(loaderSource, /published_english_umkms/);
  assert.match(loaderSource, /published_english_umkm_images/);
  assert.match(loaderSource, /signPublishedMedia/);
  assert.match(loaderSource, /server-only/);
  for (const forbidden of [
    '.from("umkms")',
    '.from("umkm_translations")',
    '.from("umkm_images")',
    '.from("umkm_image_translations")',
    "getPublishedUmkms",
  ]) {
    assert.doesNotMatch(
      loaderSource + listPage,
      new RegExp(forbidden.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    );
  }

  const runtime = createEnglishUmkmLoaderRuntime({
    parentRows: [row],
    imageRows: [
      publishedUmkmImageRow(PARENT_ID),
      publishedUmkmImageRow(PARENT_ID, {
        id: "00000000-0000-4000-8000-000000000003",
        storage_path: `umkm/${PARENT_ID}/00000000-0000-4000-8000-000000000003.webp`,
        alt_text: "Approved gallery alt",
        caption: "Approved gallery caption",
        display_order: 1,
        is_primary: false,
      }),
    ],
  });
  const loaders = await loadEnglishUmkmLoaders(runtime);
  const result = await loaders.getPublishedEnglishUmkms();
  assert.equal(result.kind, "ready");
  if (result.kind !== "ready") return;
  assert.equal(result.umkms.length, 1);
  assert.equal(result.umkms[0].gallery[1].caption, "Approved gallery caption");
  assert.deepEqual(runtime.tables, [
    "published_english_umkms",
    "published_english_umkm_images",
  ]);
  assert.ok(
    runtime.signedReferences.every(
      (reference) => reference.entityType === "umkm",
    ),
  );
});

test("empty eligible list is distinct from projection failure and missing primary is fail-closed", async () => {
  const emptyLoaders = await loadEnglishUmkmLoaders(
    createEnglishUmkmLoaderRuntime(),
  );
  assert.deepEqual(await emptyLoaders.getPublishedEnglishUmkms(), {
    kind: "ready",
    umkms: [],
  });

  const blockedLoaders = await loadEnglishUmkmLoaders(
    createEnglishUmkmLoaderRuntime({ parentRows: [row], imageRows: [] }),
  );
  assert.deepEqual(await blockedLoaders.getPublishedEnglishUmkms(), {
    kind: "ready",
    umkms: [],
  });

  const failedLoaders = await loadEnglishUmkmLoaders(
    createEnglishUmkmLoaderRuntime({
      parentError: { code: "projection-failed" },
    }),
  );
  assert.deepEqual(await failedLoaders.getPublishedEnglishUmkms(), {
    kind: "error",
  });
});

test("English local-business source slugs are validated without an English slug", () => {
  assert.equal(PUBLIC_UMKM_SLUG_PATTERN.test("usaha-karang-bajo"), true);
  assert.equal(PUBLIC_UMKM_SLUG_PATTERN.test("Usaha-Karang-Bajo"), false);
  assert.equal(PUBLIC_UMKM_SLUG_PATTERN.test("usaha karang bajo"), false);
});
