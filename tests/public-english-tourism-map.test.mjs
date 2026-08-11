import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");
const route = read("app/en/tourism-map/page.tsx");
const data = read("features/public-map/english-data.ts");
const model = read("features/public-map/english-model.ts");
const copy = read("features/public-map/copy.ts");

const { buildEnglishTourismMapItems } =
  await import("../features/public-map/english-model.ts");
const { buildPublicMapMarkers } =
  await import("../features/public-map/model.ts");
const { getPublicNavigation } = await import("../config/public-navigation.ts");
const { PUBLIC_DICTIONARIES } = await import("../lib/i18n/dictionaries.ts");

function destination(overrides = {}) {
  return {
    id: "destination-1",
    name: "English destination",
    slug: "english-destination",
    categoryName: "Nature",
    summary: "Approved destination summary.",
    latitude: -8.35,
    longitude: 116.27,
    googleMapsUrl: null,
    primaryImage: null,
    ...overrides,
  };
}

function traditionalHouse(overrides = {}) {
  return {
    id: "house-1",
    name: "English traditional house",
    slug: "english-traditional-house",
    summary: "Approved traditional house summary.",
    latitude: -8.36,
    longitude: 116.28,
    googleMapsUrl: null,
    primaryImage: null,
    ...overrides,
  };
}

function culturalEvent(overrides = {}) {
  return {
    id: "event-1",
    title: "English cultural event",
    slug: "english-cultural-event",
    summary: "Approved cultural event summary.",
    latitude: -8.37,
    longitude: 116.29,
    googleMapsUrl: null,
    primaryImage: null,
    ...overrides,
  };
}

function homestay(overrides = {}) {
  return {
    id: "homestay-1",
    name: "English homestay",
    slug: "english-homestay",
    description: "Approved homestay description.",
    latitude: -8.38,
    longitude: 116.3,
    googleMapsUrl: null,
    primaryImage: null,
    ...overrides,
  };
}

function source(overrides = {}) {
  return {
    destinations: [],
    traditionalHouses: [],
    culturalEvents: [],
    homestays: [],
    ...overrides,
  };
}

test("English tourism map route and navigation are registered", () => {
  assert.equal(existsSync("app/en/tourism-map/page.tsx"), true);
  assert.match(route, /getPublishedEnglishTourismMapData\(\)/);
  assert.match(route, /<PublicShell locale="en"/);
  assert.match(route, /ENGLISH_PUBLIC_MAP_COPY/);
  assert.deepEqual(
    getPublicNavigation("en", PUBLIC_DICTIONARIES.en).find(
      (item) => item.key === "tourismMap",
    ),
    { key: "tourismMap", label: "Tourism Map", href: "/en/tourism-map" },
  );
});

test("English map data composes only completed English public loaders", () => {
  for (const loader of [
    "getPublishedEnglishDestinations",
    "getPublishedEnglishTraditionalHouses",
    "getPublishedEnglishCulturalEvents",
    "getPublishedEnglishHomestays",
  ]) {
    assert.match(data, new RegExp(`${loader}\\(`));
  }

  assert.match(data, /Promise\.all/);
  assert.match(data, /kind === "error"/);
  assert.doesNotMatch(data, /features\/public-domains/);
  assert.doesNotMatch(
    data,
    /\.from\(|createClient|SERVICE_ROLE|service.?role/i,
  );

  for (const view of [
    "published_english_destinations",
    "published_english_destination_images",
    "published_english_traditional_houses",
    "published_english_traditional_house_images",
    "published_english_cultural_events",
    "published_english_cultural_event_images",
    "published_english_homestays",
    "published_english_homestay_images",
  ]) {
    const loaderPath = view.includes("destination")
      ? "features/public-destinations/english-data.ts"
      : view.includes("traditional_house")
        ? "features/public-traditional-houses/english-data.ts"
        : view.includes("cultural_event")
          ? "features/public-cultural-events/english-data.ts"
          : "features/public-homestays/english-data.ts";
    assert.match(read(loaderPath), new RegExp(view));
  }
});

test("English map emits canonical English links and keeps supported layers partial", () => {
  const items = buildEnglishTourismMapItems(
    source({
      destinations: [destination()],
      traditionalHouses: [traditionalHouse()],
      culturalEvents: [culturalEvent()],
      homestays: [homestay()],
    }),
  );

  assert.deepEqual(
    items.map((item) => item.href),
    [
      "/en/destinations/english-destination",
      "/en/traditional-houses/english-traditional-house",
      "/en/cultural-events/english-cultural-event",
      "/en/homestays/english-homestay",
    ],
  );
  assert.equal(
    items.every((item) => item.href.startsWith("/en/")),
    true,
  );
  assert.equal(
    items.some((item) => item.entityType === "umkm"),
    false,
  );
  assert.equal(buildEnglishTourismMapItems(source()).length, 0);
  assert.equal(buildPublicMapMarkers(items).length, 4);
});

test("invalid or missing English coordinates are omitted without affecting valid layers", () => {
  const items = buildEnglishTourismMapItems(
    source({
      destinations: [destination({ latitude: null })],
      traditionalHouses: [traditionalHouse()],
      culturalEvents: [culturalEvent({ longitude: 181 })],
      homestays: [homestay({ latitude: Number.NaN })],
    }),
  );

  assert.deepEqual(
    items.map((item) => item.entityType),
    ["traditional-house"],
  );
});

test("English map copy and route do not introduce Indonesian fallback", () => {
  assert.match(copy, /ENGLISH_PUBLIC_MAP_COPY/);
  assert.match(copy, /No locations are available/);
  assert.doesNotMatch(route, /Destinasi|Rumah Adat|Acara Budaya|Homestay/);
  assert.doesNotMatch(
    data,
    /getPublishedDestinations|getPublishedUmkms|getPublishedHomestays\(\)/,
  );
  assert.doesNotMatch(
    model,
    /\/destinasi\/|\/rumah-adat\/|\/acara-budaya\/|\/homestay\//,
  );
});

test("English projection sources retain the published-only boundary", () => {
  assert.doesNotMatch(
    `${route}\n${data}\n${model}`,
    /published_(?:destinations|traditional_houses|cultural_events|homestays)\b(?!.*english)/i,
  );
  assert.doesNotMatch(
    `${route}\n${data}\n${model}`,
    /traditional_house_translations|cultural_event_translations|homestay_translations|destination_translations/,
  );
});
