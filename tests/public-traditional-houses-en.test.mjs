import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import {
  classifyPublishedEnglishTraditionalHouseDetail,
  isNonBlankEnglishTraditionalHouseText,
  mapPublishedEnglishTraditionalHouse,
  PUBLIC_TRADITIONAL_HOUSE_SLUG_PATTERN,
} from "../features/public-traditional-houses/english-model.ts";
import {
  createEnglishTraditionalHouseLoaderRuntime,
  loadEnglishTraditionalHouseLoaders,
  publishedTraditionalHouseImageRow,
} from "./public-traditional-house-loader-test-helpers.mjs";

const read = (path) => readFileSync(path, "utf8");
const loaderSource = read("features/public-traditional-houses/english-data.ts");
const modelSource = read("features/public-traditional-houses/english-model.ts");
const listPage = read("app/en/traditional-houses/page.tsx");
const routeConfig = read("config/public-routes.ts");

const row = {
  id: "10000000-0000-4000-8000-000000000001",
  translation_id: "20000000-0000-4000-8000-000000000001",
  slug: "rumah-adat-english",
  name: "  English Traditional House  ",
  summary: "  Approved English summary.  ",
  description: "  Approved English description.  ",
  history: "  Approved English history.  ",
  cultural_significance: "  Approved English cultural significance.  ",
  location_name: "  English location.  ",
  visitor_information: "  Approved English visitor information.  ",
  latitude: "-8.2",
  longitude: "116.4",
  google_maps_url: "  https://maps.google.com/example  ",
  thumbnail_bucket: "tourism-media",
  thumbnail_path:
    "traditional-house/10000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000002.jpg",
  is_featured: true,
  display_order: 0,
  published_at: "2026-08-10T00:00:00.000Z",
  translation_published_at: "2026-08-10T01:00:00.000Z",
};

const primaryImage = {
  id: "00000000-0000-4000-8000-000000000002",
  entityType: "traditional-house",
  parentId: row.id,
  bucket: "tourism-media",
  storagePath: row.thumbnail_path,
  caption: "Approved English caption.",
  altText: "Approved English alt text.",
  displayOrder: 0,
  isPrimary: true,
  signedUrl: "https://example.test/signed-image",
};

test("English Traditional House list route and public route configuration exist", () => {
  assert.equal(existsSync("app/en/traditional-houses/page.tsx"), true);
  assert.equal(existsSync("app/en/traditional-houses/[slug]/page.tsx"), true);
  assert.match(routeConfig, /PUBLIC_ENGLISH_TRADITIONAL_HOUSES_PATH/);
  assert.match(routeConfig, /PUBLIC_ENGLISH_TRADITIONAL_HOUSE_DETAIL_PATH/);
  assert.match(routeConfig, /\/en\/traditional-houses/);
  assert.match(routeConfig, /\/en\/traditional-houses\/\[slug\]/);
});

test("English Traditional House mapping uses only translated public fields", () => {
  const house = mapPublishedEnglishTraditionalHouse(row, [primaryImage]);

  assert.equal(house.name, "English Traditional House");
  assert.equal(house.summary, "Approved English summary.");
  assert.equal(house.description, "Approved English description.");
  assert.equal(house.history, "Approved English history.");
  assert.equal(
    house.culturalSignificance,
    "Approved English cultural significance.",
  );
  assert.equal(house.locationName, "English location.");
  assert.equal(house.latitude, -8.2);
  assert.equal(house.longitude, 116.4);
  assert.equal(house.primaryImage?.altText, "Approved English alt text.");
  assert.equal(house.primaryImage?.caption, "Approved English caption.");
  assert.equal(house.translationPublishedAt, row.translation_published_at);
  assert.equal("thumbnailAltText" in house, false);
});

test("English Traditional House public result is fail-closed", () => {
  assert.deepEqual(classifyPublishedEnglishTraditionalHouseDetail([]), {
    kind: "not-found",
  });

  const eligible = mapPublishedEnglishTraditionalHouse(row, [primaryImage]);
  assert.equal(
    classifyPublishedEnglishTraditionalHouseDetail([eligible]).kind,
    "ready",
  );

  assert.deepEqual(
    classifyPublishedEnglishTraditionalHouseDetail([
      mapPublishedEnglishTraditionalHouse(row, []),
    ]),
    { kind: "not-found" },
  );

  assert.deepEqual(
    classifyPublishedEnglishTraditionalHouseDetail([eligible, eligible]),
    { kind: "error" },
  );
});

test("English Traditional House mapping rejects malformed required content", () => {
  for (const field of ["name", "description", "slug"]) {
    for (const value of [null, undefined, "", "   "]) {
      assert.equal(
        mapPublishedEnglishTraditionalHouse({ ...row, [field]: value }, [
          primaryImage,
        ]),
        null,
        `${field}:${String(value)}`,
      );
    }
  }
  for (const slug of ["bad slug", "../x", "x/y"]) {
    assert.equal(
      mapPublishedEnglishTraditionalHouse({ ...row, slug }, [primaryImage]),
      null,
      slug,
    );
  }
  assert.ok(
    mapPublishedEnglishTraditionalHouse(
      { ...row, slug: "valid-canonical-slug" },
      [primaryImage],
    ),
  );
  assert.equal(isNonBlankEnglishTraditionalHouseText(null), false);
  assert.equal(isNonBlankEnglishTraditionalHouseText("  English text  "), true);

  const withoutSummary = mapPublishedEnglishTraditionalHouse(
    { ...row, summary: null },
    [primaryImage],
  );
  assert.equal(withoutSummary?.summary, null);

  for (const googleMapsUrl of [
    "http://maps.example.test/place",
    "https://maps.example.test/place",
  ]) {
    assert.equal(
      mapPublishedEnglishTraditionalHouse(
        { ...row, google_maps_url: `  ${googleMapsUrl}  ` },
        [primaryImage],
      )?.googleMapsUrl,
      googleMapsUrl,
    );
  }
  for (const googleMapsUrl of [
    null,
    "",
    "   ",
    "javascript:alert(1)",
    "data:text/plain,unsafe",
    "not-a-url",
  ]) {
    assert.equal(
      mapPublishedEnglishTraditionalHouse(
        { ...row, google_maps_url: googleMapsUrl },
        [primaryImage],
      )?.googleMapsUrl,
      null,
      String(googleMapsUrl),
    );
  }
  assert.equal(
    mapPublishedEnglishTraditionalHouse(
      { ...row, google_maps_url: undefined },
      [primaryImage],
    ),
    null,
    "undefined Google Maps URL is a malformed projection field",
  );

  assert.equal(
    mapPublishedEnglishTraditionalHouse({ ...row }, [
      { ...primaryImage, signedUrl: null },
    ])?.primaryImage,
    null,
  );
  assert.deepEqual(
    mapPublishedEnglishTraditionalHouse({ ...row }, [
      primaryImage,
      {
        ...primaryImage,
        id: "00000000-0000-4000-8000-000000000003",
        storagePath: `traditional-house/${row.id}/00000000-0000-4000-8000-000000000003.webp`,
        isPrimary: false,
        signedUrl: null,
      },
    ])?.gallery.map((image) => image.id),
    [primaryImage.id],
  );
});

test("English loader reads only fail-closed Traditional House projections", () => {
  assert.match(loaderSource, /published_english_traditional_houses/);
  assert.match(loaderSource, /published_english_traditional_house_images/);
  for (const forbiddenPath of [
    '.from("traditional_houses")',
    '.from("traditional_house_translations")',
    '.from("traditional_house_images")',
    '.from("traditional_house_image_translations")',
    "getPublishedTraditionalHouses",
    "getPublishedTraditionalHouse",
  ]) {
    assert.doesNotMatch(loaderSource, new RegExp(forbiddenPath));
  }
  assert.match(loaderSource, /signPublishedMedia/);
  assert.match(loaderSource, /server-only/);
  assert.match(loaderSource, /house !== null && house\.primaryImage !== null/);
});

test("English list route has localized empty state and no Indonesian fallback", () => {
  assert.match(listPage, /getPublishedEnglishTraditionalHouses/);
  assert.match(listPage, /<PublicShell locale="en"/);
  assert.match(listPage, /EmptyContentState/);
  assert.match(listPage, /ENGLISH_TRADITIONAL_HOUSE_COPY/);
  assert.match(listPage, /getPublicEnglishTraditionalHousePath/);
  assert.doesNotMatch(
    listPage + "\n" + loaderSource + "\n" + modelSource,
    /getPublishedTraditionalHouses|getPublishedTraditionalHouse|\/rumah-adat|Rumah Adat|Belum ada rumah adat/,
  );
});

test("Traditional House slugs use source-route validation", () => {
  assert.equal(
    PUBLIC_TRADITIONAL_HOUSE_SLUG_PATTERN.test("rumah-adat-english"),
    true,
  );
  assert.equal(
    PUBLIC_TRADITIONAL_HOUSE_SLUG_PATTERN.test("Rumah-Adat-English"),
    false,
  );
  assert.match(
    loaderSource,
    /PUBLIC_TRADITIONAL_HOUSE_SLUG_PATTERN\.test\(slug\)/,
  );
});

test("English Traditional House list loader returns only eligible translated view data", async () => {
  const runtime = createEnglishTraditionalHouseLoaderRuntime({
    parentRows: [row],
    imageRows: [
      publishedTraditionalHouseImageRow(row.id),
      publishedTraditionalHouseImageRow(row.id, {
        id: "00000000-0000-4000-8000-000000000003",
        storage_path: `traditional-house/${row.id}/00000000-0000-4000-8000-000000000003.webp`,
        alt_text: "Approved English gallery alt text",
        caption: "Approved English gallery caption",
        display_order: 1,
        is_primary: false,
      }),
    ],
  });
  const loaders = await loadEnglishTraditionalHouseLoaders(runtime);

  const result = await loaders.getPublishedEnglishTraditionalHouses();

  assert.equal(result.kind, "ready");
  if (result.kind !== "ready") return;
  assert.equal(result.houses.length, 1);
  assert.equal(
    result.houses[0].primaryImage?.altText,
    "Approved English alt text",
  );
  assert.equal(
    result.houses[0].gallery[1]?.caption,
    "Approved English gallery caption",
  );
  assert.deepEqual(runtime.tables, [
    "published_english_traditional_houses",
    "published_english_traditional_house_images",
  ]);
  assert.deepEqual(
    runtime.signedReferences.map((reference) => ({
      entityType: reference.entityType,
      altText: reference.altText,
      caption: reference.caption,
    })),
    [
      {
        entityType: "traditional-house",
        altText: "Approved English alt text",
        caption: "Approved English caption",
      },
      {
        entityType: "traditional-house",
        altText: "Approved English gallery alt text",
        caption: "Approved English gallery caption",
      },
    ],
  );
});

test("English Traditional House list loader distinguishes empty, blocked, and database-error results", async () => {
  const emptyRuntime = createEnglishTraditionalHouseLoaderRuntime();
  const emptyLoaders = await loadEnglishTraditionalHouseLoaders(emptyRuntime);
  assert.deepEqual(await emptyLoaders.getPublishedEnglishTraditionalHouses(), {
    kind: "ready",
    houses: [],
  });

  for (const blockedState of [
    "stale",
    "unpublished",
    "archived",
    "source-blocked",
  ]) {
    const blockedRuntime = createEnglishTraditionalHouseLoaderRuntime();
    const blockedLoaders =
      await loadEnglishTraditionalHouseLoaders(blockedRuntime);
    const result = await blockedLoaders.getPublishedEnglishTraditionalHouses();
    assert.deepEqual(result, { kind: "ready", houses: [] }, blockedState);
  }

  const errorRuntime = createEnglishTraditionalHouseLoaderRuntime({
    parentError: { code: "projection-read-failed" },
  });
  const errorLoaders = await loadEnglishTraditionalHouseLoaders(errorRuntime);
  assert.deepEqual(await errorLoaders.getPublishedEnglishTraditionalHouses(), {
    kind: "error",
  });

  const malformedRuntime = createEnglishTraditionalHouseLoaderRuntime({
    parentRows: [{ ...row, description: "   " }],
    imageRows: [primaryImage],
  });
  const malformedLoaders =
    await loadEnglishTraditionalHouseLoaders(malformedRuntime);
  assert.deepEqual(
    await malformedLoaders.getPublishedEnglishTraditionalHouses(),
    { kind: "ready", houses: [] },
  );
});

test("English Traditional House list loader fails closed when the primary is absent and keeps gallery optional", async () => {
  const missingPrimaryRuntime = createEnglishTraditionalHouseLoaderRuntime({
    parentRows: [row],
    imageRows: [
      publishedTraditionalHouseImageRow(row.id, {
        id: "00000000-0000-4000-8000-000000000003",
        is_primary: false,
      }),
    ],
  });
  const missingPrimaryLoaders = await loadEnglishTraditionalHouseLoaders(
    missingPrimaryRuntime,
  );
  assert.deepEqual(
    await missingPrimaryLoaders.getPublishedEnglishTraditionalHouses(),
    { kind: "ready", houses: [] },
  );

  const primaryOnlyRuntime = createEnglishTraditionalHouseLoaderRuntime({
    parentRows: [row],
    imageRows: [publishedTraditionalHouseImageRow(row.id)],
  });
  const primaryOnlyLoaders =
    await loadEnglishTraditionalHouseLoaders(primaryOnlyRuntime);
  const result =
    await primaryOnlyLoaders.getPublishedEnglishTraditionalHouses();
  assert.equal(result.kind, "ready");
  if (result.kind !== "ready") return;
  assert.equal(result.houses.length, 1);
  assert.equal(result.houses[0].primaryImage?.isPrimary, true);
});

test("English Traditional House loader rejects malformed media projections at the public boundary", async () => {
  const runtime = createEnglishTraditionalHouseLoaderRuntime({
    parentRows: [row],
    imageRows: [
      null,
      publishedTraditionalHouseImageRow(row.id, {
        storage_path: null,
      }),
    ],
  });
  const loaders = await loadEnglishTraditionalHouseLoaders(runtime);

  assert.deepEqual(await loaders.getPublishedEnglishTraditionalHouses(), {
    kind: "ready",
    houses: [],
  });
  assert.deepEqual(runtime.signedReferences, []);

  const signingFailureRuntime = createEnglishTraditionalHouseLoaderRuntime({
    parentRows: [row],
    imageRows: [publishedTraditionalHouseImageRow(row.id)],
    signingFailure: true,
  });
  const signingFailureLoaders = await loadEnglishTraditionalHouseLoaders(
    signingFailureRuntime,
  );
  assert.deepEqual(
    await signingFailureLoaders.getPublishedEnglishTraditionalHouses(),
    { kind: "ready", houses: [] },
  );
});
