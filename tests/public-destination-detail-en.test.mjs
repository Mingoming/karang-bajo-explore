import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");
const detailPage = read("app/en/destinations/[slug]/page.tsx");
const loaderSource = read("features/public-destinations/english-data.ts");
const gallerySource = read("components/public/destination-gallery.tsx");
const locationSource = read(
  "components/public/destination-location-summary.tsx",
);
const indonesianLoaderSource = read("features/public-destinations/data.ts");
const modelSource = read("features/public-destinations/english-model.ts");

test("English destination detail route is implemented with the English loader", () => {
  assert.equal(existsSync("app/en/destinations/[slug]/page.tsx"), true);
  assert.match(detailPage, /getPublishedEnglishDestinationBySlug/);
  assert.match(detailPage, /getPublishedEnglishDestinationMetadata/);
  assert.match(detailPage, /ENGLISH_DESTINATION_COPY/);
  assert.doesNotMatch(
    detailPage,
    /getPublishedDestinations|getPublishedDestinationBySlug|getDestinationBySlug|from ["']@\/features\/public-destinations\/data["']/,
  );
});

test("English detail has no Indonesian fallback or direct translation-table access", () => {
  assert.doesNotMatch(
    detailPage,
    /getPublishedDestinations|getPublishedDestinationBySlug|\/destinasi|\/peta-wisata|Galeri|Lokasi|Gambar utama|Tanpa kategori|Belum ada destinasi|Gratis/,
  );
  assert.doesNotMatch(
    `${detailPage}\n${loaderSource}\n${indonesianLoaderSource}`,
    /destination_translations|destination_image_translations/,
  );
  assert.match(loaderSource, /published_english_destinations/);
  assert.match(loaderSource, /published_english_destination_images/);
});

test("shared destination presentation components expose their current contract", () => {
  assert.match(gallerySource, /copy = INDONESIAN_DESTINATION_GALLERY_COPY/);
  assert.match(gallerySource, /copy\?: DestinationGalleryCopy/);
  assert.match(locationSource, /copy\?: DestinationLocationSummaryCopy/);
  assert.match(detailPage, /<DestinationGallery[\s\S]*copy=\{\{/);
  assert.match(detailPage, /<DestinationLocationSummary[\s\S]*copy=\{\{/);
  for (const englishCopy of [
    "locationEyebrow",
    "locationHeading",
    "locationLatitudeLabel",
    "locationLongitudeLabel",
    "locationDescription",
    "mapLabel",
    "googleMapsLabel",
    "googleMapsAccessibleLabel",
    "galleryHeading",
    "primaryImageLabel",
  ]) {
    assert.match(
      detailPage,
      new RegExp(`ENGLISH_DESTINATION_COPY\\.detail\\.${englishCopy}`),
    );
  }
  assert.match(modelSource, /locationEyebrow: "Location"/);
  assert.match(modelSource, /galleryHeading: "Gallery"/);
});

test("English detail remains fail-closed through the English public result", () => {
  assert.match(detailPage, /result\.kind !== "ready"/);
  assert.match(detailPage, /result\.kind === "not-found"/);
  assert.match(detailPage, /notFound\(\)/);
  assert.match(detailPage, /PUBLIC_ENGLISH_DESTINATION_DETAIL_UNAVAILABLE/);
  assert.match(
    modelSource,
    /if \(!destination\.primaryImage\) return \{ kind: "not-found" \}/,
  );
  assert.match(modelSource, /destinations\.length > 1/);
});
