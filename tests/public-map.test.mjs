import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const data = readFileSync("features/public-map/data.ts", "utf8");

const {
  PUBLIC_MAP_ENTITY_TYPES,
  buildPublicMapMarkers,
  createPublicMapCoordinateKey,
  createPublicMapItem,
  isValidPublicMapCoordinate,
} = await import("../features/public-map/model.ts");

function mapItem(overrides = {}) {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    entityType: "destination",
    title: "Kampung Adat",
    slug: "kampung-adat",
    href: "/destinasi/kampung-adat",
    categorySlug: "budaya",
    categoryName: "Budaya",
    summary: "Destinasi budaya.",
    latitude: -8.351234,
    longitude: 116.271234,
    googleMapsUrl: null,
    thumbnailUrl: null,
    ...overrides,
  };
}

test("public map entity allowlist contains only approved mappable domains", () => {
  assert.deepEqual(PUBLIC_MAP_ENTITY_TYPES, [
    "destination",
    "traditional-house",
    "homestay",
    "umkm",
  ]);
});

test("coordinate validation accepts only finite in-range pairs", () => {
  assert.equal(isValidPublicMapCoordinate(-8.351234, 116.271234), true);
  assert.equal(isValidPublicMapCoordinate(-90, -180), true);
  assert.equal(isValidPublicMapCoordinate(90, 180), true);

  assert.equal(isValidPublicMapCoordinate(Number.NaN, 116), false);
  assert.equal(isValidPublicMapCoordinate(-8, Number.POSITIVE_INFINITY), false);
  assert.equal(isValidPublicMapCoordinate(-90.000001, 116), false);
  assert.equal(isValidPublicMapCoordinate(90.000001, 116), false);
  assert.equal(isValidPublicMapCoordinate(-8, -180.000001), false);
  assert.equal(isValidPublicMapCoordinate(-8, 180.000001), false);
});

test("coordinate keys are deterministic and normalize negative zero", () => {
  assert.equal(
    createPublicMapCoordinateKey(-8.351234, 116.271234),
    "-8.351234|116.271234",
  );

  assert.equal(
    createPublicMapCoordinateKey(-0, 0),
    createPublicMapCoordinateKey(0, -0),
  );
});

test("co-located records become one combined marker", () => {
  const markers = buildPublicMapMarkers([
    mapItem(),
    mapItem({
      id: "00000000-0000-4000-8000-000000000002",
      entityType: "umkm",
      title: "UMKM Tenun",
      slug: "umkm-tenun",
      href: "/umkm/umkm-tenun",
      categorySlug: null,
      categoryName: null,
    }),
  ]);

  assert.equal(markers.length, 1);
  assert.equal(markers[0].items.length, 2);
  assert.deepEqual(
    markers[0].items.map((item) => item.title),
    ["Kampung Adat", "UMKM Tenun"],
  );
});

test("nearby but different coordinate pairs remain separate markers", () => {
  const markers = buildPublicMapMarkers([
    mapItem(),
    mapItem({
      id: "00000000-0000-4000-8000-000000000002",
      longitude: 116.271235,
    }),
  ]);

  assert.equal(markers.length, 2);
});

test("invalid coordinates are omitted without breaking valid markers", () => {
  const markers = buildPublicMapMarkers([
    mapItem(),
    mapItem({
      id: "00000000-0000-4000-8000-000000000002",
      latitude: Number.NaN,
    }),
    mapItem({
      id: "00000000-0000-4000-8000-000000000003",
      longitude: 181,
    }),
  ]);

  assert.equal(markers.length, 1);
  assert.equal(markers[0].items.length, 1);
});

test("marker and item ordering is deterministic", () => {
  const homestay = mapItem({
    id: "00000000-0000-4000-8000-000000000004",
    entityType: "homestay",
    title: "Homestay Karang Bajo",
    slug: "homestay-karang-bajo",
    href: "/homestay/homestay-karang-bajo",
    categorySlug: null,
    categoryName: null,
  });

  const house = mapItem({
    id: "00000000-0000-4000-8000-000000000003",
    entityType: "traditional-house",
    title: "Rumah Adat",
    slug: "rumah-adat",
    href: "/rumah-adat/rumah-adat",
    categorySlug: null,
    categoryName: null,
  });

  const destination = mapItem();

  const forward = buildPublicMapMarkers([homestay, house, destination]);

  const reversed = buildPublicMapMarkers([destination, house, homestay]);

  assert.deepEqual(forward, reversed);
  assert.deepEqual(
    forward[0].items.map((item) => item.entityType),
    ["destination", "traditional-house", "homestay"],
  );
});

test("building markers does not mutate source items or source ordering", () => {
  const first = mapItem();
  const second = mapItem({
    id: "00000000-0000-4000-8000-000000000002",
    entityType: "umkm",
    title: "UMKM Tenun",
    href: "/umkm/umkm-tenun",
  });
  const source = [second, first];
  const originalIds = source.map((item) => item.id);

  buildPublicMapMarkers(source);

  assert.deepEqual(
    source.map((item) => item.id),
    originalIds,
  );
});

test("map item construction rejects missing and invalid coordinate pairs", () => {
  assert.equal(
    createPublicMapItem(
      mapItem({
        latitude: null,
      }),
    ),
    null,
  );

  assert.equal(
    createPublicMapItem(
      mapItem({
        longitude: null,
      }),
    ),
    null,
  );

  assert.equal(
    createPublicMapItem(
      mapItem({
        latitude: 91,
      }),
    ),
    null,
  );

  const valid = createPublicMapItem(
    mapItem({
      thumbnailUrl: "https://example.test/signed-image",
    }),
  );

  assert.equal(valid?.latitude, -8.351234);
  assert.equal(valid?.longitude, 116.271234);
  assert.equal(valid?.thumbnailUrl, "https://example.test/signed-image");
});

test("map loader reuses published-safe public data loaders", () => {
  for (const functionName of [
    "getPublishedDestinations",
    "getPublishedHomestays",
    "getPublishedUmkms",
    "getPublishedTraditionalHouses",
  ]) {
    assert.match(data, new RegExp(`${functionName}\\(`));
  }

  assert.match(data, /Promise\.all/);
  assert.doesNotMatch(data, /\.from\(/);
  assert.doesNotMatch(data, /createClient/);
  assert.doesNotMatch(data, /SERVICE_ROLE|service.?role/i);
});

test("map loader maps every approved domain and signed thumbnail", () => {
  for (const source of [
    'entityType: "destination"',
    'entityType: "homestay"',
    'entityType: "umkm"',
    'entityType: "traditional-house"',
    "destination.primaryImage?.signedUrl",
    "homestay.primaryImage?.signedUrl",
    "umkm.primaryImage?.signedUrl",
    "house.primaryImage?.signedUrl",
  ]) {
    assert.equal(data.includes(source), true);
  }

  assert.equal(data.includes("href: `/destinasi/${destination.slug}`"), true);
  assert.equal(data.includes("href: `/homestay/${homestay.slug}`"), true);
  assert.equal(data.includes("href: `/umkm/${umkm.slug}`"), true);
  assert.equal(data.includes("href: `/rumah-adat/${house.slug}`"), true);
});

test("map loader fails closed and derives the text list from combined markers", () => {
  for (const resultName of [
    "destinationResult",
    "homestayResult",
    "umkmResult",
    "traditionalHouseResult",
  ]) {
    assert.match(data, new RegExp(`${resultName}\\.kind === "error"`));
  }

  assert.match(data, /buildPublicMapMarkers\(items\)/);
  assert.match(data, /items: markers\.flatMap/);

  assert.doesNotMatch(
    data,
    /\.insert\(|\.update\(|\.delete\(|\.upsert\(|\.rpc\(/,
  );
});
