import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import {
  mapPublishedEnglishHomestay,
  PUBLIC_HOMESTAY_SLUG_PATTERN,
} from "../features/public-homestays/english-model.ts";
import {
  createEnglishHomestayLoaderRuntime,
  loadEnglishHomestayLoaders,
  publishedHomestayImageRow,
} from "./public-homestay-loader-test-helpers.mjs";

const read = (path) => readFileSync(path, "utf8");
const PARENT_ID = "10000000-0000-4000-8000-000000000001";
const row = {
  id: PARENT_ID,
  translation_id: "20000000-0000-4000-8000-000000000001",
  slug: "homestay-english",
  name: "  English Homestay  ",
  description: "  Approved English homestay description.  ",
  address: "  English address.  ",
  price_note: "  Breakfast included.  ",
  facilities: ["Wi-Fi", "Kitchen"],
  price_per_night: "250000",
  latitude: "-8.2",
  longitude: "116.4",
  google_maps_url: "https://maps.google.com/homestay",
  owner_name: "Host Name",
  phone: "+628123456789",
  thumbnail_bucket: "tourism-media",
  thumbnail_path: "homestay/thumbnail.webp",
  is_featured: true,
  display_order: 0,
  published_at: "2030-08-16T00:00:00.000Z",
  translation_published_at: "2030-08-16T01:00:00.000Z",
};

test("English Homestay routes and manifest entries exist", () => {
  assert.equal(existsSync("app/en/homestays/page.tsx"), true);
  assert.equal(existsSync("app/en/homestays/[slug]/page.tsx"), true);
  const config = read("config/public-routes.ts");
  assert.match(config, /PUBLIC_ENGLISH_HOMESTAYS_PATH/);
  assert.match(config, /PUBLIC_ENGLISH_HOMESTAY_DETAIL_PATH/);
  assert.match(config, /\/en\/homestays/);
  assert.match(
    config,
    /homestays: \{ id: PUBLIC_HOMESTAYS_PATH, en: PUBLIC_ENGLISH_HOMESTAYS_PATH \}/,
  );
});

test("English Homestay mapping preserves translated fields and source numeric values", () => {
  const image = {
    id: "00000000-0000-4000-8000-000000000002",
    entityType: "homestay",
    parentId: PARENT_ID,
    bucket: "tourism-media",
    storagePath: `homestay/${PARENT_ID}/00000000-0000-4000-8000-000000000002.webp`,
    altText: "Approved English alt text",
    caption: "Approved English caption",
    displayOrder: 0,
    isPrimary: true,
    signedUrl: "https://signed.invalid/image",
  };
  const homestay = mapPublishedEnglishHomestay(row, [image]);
  assert.equal(homestay.name, "English Homestay");
  assert.equal(homestay.description, "Approved English homestay description.");
  assert.equal(homestay.pricePerNight, 250000);
  assert.deepEqual(homestay.facilities, ["Wi-Fi", "Kitchen"]);
  assert.equal(homestay.primaryImage?.altText, "Approved English alt text");
});

test("English Homestay mapping fails closed for malformed translated content and media", () => {
  const image = {
    id: "00000000-0000-4000-8000-000000000002",
    entityType: "homestay",
    parentId: PARENT_ID,
    bucket: "tourism-media",
    storagePath: `homestay/${PARENT_ID}/00000000-0000-4000-8000-000000000002.webp`,
    altText: "Approved English alt text",
    caption: null,
    displayOrder: 0,
    isPrimary: true,
    signedUrl: "https://signed.invalid/image",
  };

  for (const name of [null, undefined, "", " \t"]) {
    assert.equal(mapPublishedEnglishHomestay({ ...row, name }, [image]), null);
  }
  for (const description of [null, undefined, "", " \n"]) {
    assert.equal(
      mapPublishedEnglishHomestay({ ...row, description }, [image]),
      null,
    );
  }
  for (const slug of ["", " ", "../attacker", "bad slug", "Upper-case"]) {
    assert.equal(mapPublishedEnglishHomestay({ ...row, slug }, [image]), null);
  }
  for (const pricePerNight of [
    undefined,
    "NaN",
    "not-a-number",
    Infinity,
    -1,
  ]) {
    assert.equal(
      mapPublishedEnglishHomestay({ ...row, price_per_night: pricePerNight }, [
        image,
      ]),
      null,
    );
  }
  assert.equal(
    mapPublishedEnglishHomestay(
      { ...row, latitude: "not-a-number", longitude: "116.4" },
      [image],
    ),
    null,
  );
  assert.equal(
    mapPublishedEnglishHomestay(
      { ...row, latitude: "-91", longitude: "116.4" },
      [image],
    ),
    null,
  );

  const unsafeUrl = mapPublishedEnglishHomestay(
    { ...row, google_maps_url: "javascript:alert(1)" },
    [image],
  );
  assert.equal(unsafeUrl?.googleMapsUrl, null);

  const malformedMedia = mapPublishedEnglishHomestay({ ...row }, [
    { ...image, storagePath: `homestay/${PARENT_ID}/../attacker.webp` },
  ]);
  assert.equal(malformedMedia?.primaryImage, null);

  const malformedMediaOrder = mapPublishedEnglishHomestay({ ...row }, [
    { ...image, displayOrder: -1 },
  ]);
  assert.equal(malformedMediaOrder?.primaryImage, null);
});

test("English Homestay loader reads only fail-closed English projections", async () => {
  const loaderSource = read("features/public-homestays/english-data.ts");
  const listPage = read("app/en/homestays/page.tsx");
  assert.match(loaderSource, /published_english_homestays/);
  assert.match(loaderSource, /published_english_homestay_images/);
  assert.match(loaderSource, /signPublishedMedia/);
  assert.match(loaderSource, /server-only/);
  for (const forbidden of [
    '.from("homestays")',
    '.from("homestay_translations")',
    '.from("homestay_images")',
    '.from("homestay_image_translations")',
    "getPublishedHomestays",
  ])
    assert.doesNotMatch(loaderSource, new RegExp(forbidden));
  assert.match(listPage, /getPublishedEnglishHomestays/);
  assert.match(listPage, /EmptyContentState/);
  assert.match(listPage, /<PublicShell locale="en"/);
  assert.doesNotMatch(
    listPage + loaderSource,
    /\/homestay(?:\/|\b)|Homestay tidak tersedia|Belum tersedia/,
  );

  const runtime = createEnglishHomestayLoaderRuntime({
    parentRows: [row],
    imageRows: [
      publishedHomestayImageRow(PARENT_ID),
      publishedHomestayImageRow(PARENT_ID, {
        id: "00000000-0000-4000-8000-000000000003",
        storage_path: `homestay/${PARENT_ID}/00000000-0000-4000-8000-000000000003.webp`,
        alt_text: "Approved gallery alt text",
        caption: "Approved gallery caption",
        display_order: 1,
        is_primary: false,
      }),
    ],
  });
  const loaders = await loadEnglishHomestayLoaders(runtime);
  const result = await loaders.getPublishedEnglishHomestays();
  assert.equal(result.kind, "ready");
  if (result.kind !== "ready") return;
  assert.equal(result.homestays.length, 1);
  assert.equal(
    result.homestays[0].gallery[1].caption,
    "Approved gallery caption",
  );
  assert.deepEqual(runtime.tables, [
    "published_english_homestays",
    "published_english_homestay_images",
  ]);
  assert.ok(
    runtime.signedReferences.every(
      (reference) => reference.entityType === "homestay",
    ),
  );
});

test("empty eligible list is distinct from projection failure and missing primary is fail-closed", async () => {
  const emptyLoaders = await loadEnglishHomestayLoaders(
    createEnglishHomestayLoaderRuntime(),
  );
  assert.deepEqual(await emptyLoaders.getPublishedEnglishHomestays(), {
    kind: "ready",
    homestays: [],
  });

  const blockedLoaders = await loadEnglishHomestayLoaders(
    createEnglishHomestayLoaderRuntime({ parentRows: [row], imageRows: [] }),
  );
  assert.deepEqual(await blockedLoaders.getPublishedEnglishHomestays(), {
    kind: "ready",
    homestays: [],
  });

  const failedLoaders = await loadEnglishHomestayLoaders(
    createEnglishHomestayLoaderRuntime({
      parentError: { code: "projection-failed" },
    }),
  );
  assert.deepEqual(await failedLoaders.getPublishedEnglishHomestays(), {
    kind: "error",
  });

  const imageFailedLoaders = await loadEnglishHomestayLoaders(
    createEnglishHomestayLoaderRuntime({
      parentRows: [row],
      imageError: { code: "media-projection-failed" },
    }),
  );
  assert.deepEqual(await imageFailedLoaders.getPublishedEnglishHomestays(), {
    kind: "error",
  });

  const signingFailedLoaders = await loadEnglishHomestayLoaders(
    createEnglishHomestayLoaderRuntime({
      parentRows: [row],
      imageRows: [publishedHomestayImageRow(PARENT_ID)],
      signingFailure: true,
    }),
  );
  assert.deepEqual(await signingFailedLoaders.getPublishedEnglishHomestays(), {
    kind: "ready",
    homestays: [],
  });
});

test("Homestay source slugs are validated without introducing a language-specific slug", () => {
  assert.equal(PUBLIC_HOMESTAY_SLUG_PATTERN.test("homestay-english"), true);
  assert.equal(PUBLIC_HOMESTAY_SLUG_PATTERN.test("Homestay-English"), false);
});
