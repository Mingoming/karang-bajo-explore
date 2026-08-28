import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { mapPublishedEnglishTourismPackageItinerary } from "../features/public-tourism-packages/english-model.ts";
import {
  createEnglishTourismPackageLoaderRuntime,
  loadEnglishTourismPackageLoaders,
  publishedEnglishTourismPackageDestinationRow,
  publishedEnglishTourismPackageImageRow,
  publishedEnglishTourismPackageRow,
} from "./public-tourism-package-loader-test-helpers.mjs";

const read = (path) => readFileSync(path, "utf8");
const detailPage = read("app/en/tourism-packages/[slug]/page.tsx");
const loaderSource = read("features/public-tourism-packages/english-data.ts");
const modelSource = read("features/public-tourism-packages/english-model.ts");
const row = publishedEnglishTourismPackageRow({ summary: null });
const primaryImage = publishedEnglishTourismPackageImageRow(row.id);
const itineraryRow = publishedEnglishTourismPackageDestinationRow(row.id);

test("English Tourism Package detail uses the English loader and localized route copy", () => {
  assert.match(detailPage, /getPublishedEnglishTourismPackageBySlug/);
  assert.match(detailPage, /getPublishedEnglishTourismPackageMetadata/);
  assert.match(detailPage, /ENGLISH_TOURISM_PACKAGE_COPY/);
  assert.match(detailPage, /<PublicShell locale="en"/);
  assert.match(detailPage, /params: Promise<{ slug: string }>/);
  assert.doesNotMatch(
    `${detailPage}\n${loaderSource}`,
    /getPublishedTourismPackage|getTourismPackage|\/paket-wisata(?!\/\[slug\])/,
  );
  assert.doesNotMatch(detailPage, /\/en\/tour-packages/);
});

test("English Tourism Package detail renders translated media and itinerary without relation notes", () => {
  assert.match(detailPage, /alt={tourismPackage\.primaryImage\.altText}/);
  assert.match(detailPage, /alt={image\.altText}/);
  assert.match(detailPage, /getPublicEnglishDestinationPath/);
  assert.doesNotMatch(detailPage, /destination\.notes|relation\.notes/);
  assert.doesNotMatch(modelSource, /notes/);
  assert.doesNotMatch(
    `${detailPage}\n${modelSource}`,
    /Paket Wisata|Paket wisata|paket wisata|Jadwal perjalanan|Catatan/,
  );
  assert.doesNotMatch(
    detailPage,
    /canonical|hreflang|alternates|metadataBase|sitemap|production-origin/,
  );
});

test("English itinerary mapper is strict, ordered, and never exposes source notes", () => {
  const second = publishedEnglishTourismPackageDestinationRow(row.id, {
    id: "30000000-0000-4000-8000-000000000002",
    destination_id: "40000000-0000-4000-8000-000000000002",
    display_order: 1,
    destination_name: "Second English Destination",
    destination_slug: "second-english-destination",
    notes: "private source note",
  });
  const itinerary = mapPublishedEnglishTourismPackageItinerary(
    [second, { ...itineraryRow, notes: "private source note" }],
    row.id,
  );
  assert.deepEqual(
    itinerary?.map((item) => [
      item.destinationName,
      item.destinationSlug,
      item.displayOrder,
      "notes" in item,
    ]),
    [
      ["English Destination", "english-destination", 0, false],
      ["Second English Destination", "second-english-destination", 1, false],
    ],
  );

  for (const malformed of [
    [{ ...itineraryRow, destination_name: "   " }],
    [{ ...itineraryRow, destination_slug: "not a slug" }],
    [{ ...itineraryRow, package_id: "50000000-0000-4000-8000-000000000001" }],
    [{ ...itineraryRow, destination_id: "not-a-uuid" }],
  ]) {
    assert.equal(
      mapPublishedEnglishTourismPackageItinerary(malformed, row.id),
      null,
    );
  }
});

test("English detail loader reads parent, itinerary, and image projections", async () => {
  const runtime = createEnglishTourismPackageLoaderRuntime({
    parentRows: [row],
    imageRows: [primaryImage],
    destinationRows: [itineraryRow],
  });
  const loaders = await loadEnglishTourismPackageLoaders(runtime);
  const result = await loaders.getPublishedEnglishTourismPackageBySlug(
    row.slug,
  );

  assert.equal(result.kind, "ready");
  if (result.kind !== "ready") return;
  assert.equal(result.tourismPackage.name, row.name);
  assert.equal(result.tourismPackage.summary, null);
  assert.equal(
    result.tourismPackage.primaryImage?.altText,
    primaryImage.alt_text,
  );
  assert.deepEqual(result.tourismPackage.itinerary, [
    {
      id: itineraryRow.id,
      destinationId: itineraryRow.destination_id,
      destinationName: itineraryRow.destination_name,
      destinationSlug: itineraryRow.destination_slug,
      displayOrder: itineraryRow.display_order,
    },
  ]);
  assert.deepEqual(runtime.tables, [
    "published_english_tourism_packages",
    "published_english_tourism_package_destinations",
    "published_english_tourism_package_images",
  ]);
});

test("English detail and metadata fail closed for unavailable or malformed projections", async () => {
  const missing = await loadEnglishTourismPackageLoaders(
    createEnglishTourismPackageLoaderRuntime(),
  );
  assert.deepEqual(
    await missing.getPublishedEnglishTourismPackageBySlug(row.slug),
    { kind: "not-found" },
  );
  assert.equal(
    await missing.getPublishedEnglishTourismPackageMetadata(row.slug),
    null,
  );

  const invalidSlugRuntime = createEnglishTourismPackageLoaderRuntime({
    parentRows: [row],
  });
  const invalidSlug =
    await loadEnglishTourismPackageLoaders(invalidSlugRuntime);
  assert.deepEqual(
    await invalidSlug.getPublishedEnglishTourismPackageBySlug("bad%2Fslug"),
    { kind: "not-found" },
  );
  assert.deepEqual(invalidSlugRuntime.tables, []);

  const missingPrimary = await loadEnglishTourismPackageLoaders(
    createEnglishTourismPackageLoaderRuntime({
      parentRows: [row],
      imageRows: [],
      destinationRows: [itineraryRow],
    }),
  );
  assert.deepEqual(
    await missingPrimary.getPublishedEnglishTourismPackageBySlug(row.slug),
    { kind: "not-found" },
  );

  const malformedItinerary = await loadEnglishTourismPackageLoaders(
    createEnglishTourismPackageLoaderRuntime({
      parentRows: [row],
      imageRows: [primaryImage],
      destinationRows: [{ ...itineraryRow, destination_name: "   " }],
    }),
  );
  assert.deepEqual(
    await malformedItinerary.getPublishedEnglishTourismPackageBySlug(row.slug),
    { kind: "error" },
  );

  const projectionError = await loadEnglishTourismPackageLoaders(
    createEnglishTourismPackageLoaderRuntime({
      parentRows: [row],
      destinationRows: [itineraryRow],
      destinationError: { code: "destination-projection-failed" },
    }),
  );
  assert.deepEqual(
    await projectionError.getPublishedEnglishTourismPackageBySlug(row.slug),
    { kind: "error" },
  );
});

test("English metadata uses translated description when summary is absent", async () => {
  const runtime = createEnglishTourismPackageLoaderRuntime({
    parentRows: [row],
    imageRows: [primaryImage],
    destinationRows: [itineraryRow],
  });
  const loaders = await loadEnglishTourismPackageLoaders(runtime);
  assert.deepEqual(
    await loaders.getPublishedEnglishTourismPackageMetadata(row.slug),
    {
      title: row.name,
      description: row.description,
    },
  );
});
