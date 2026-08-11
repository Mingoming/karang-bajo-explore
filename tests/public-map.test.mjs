import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";

const data = readFileSync("features/public-map/data.ts", "utf8");

const page = readFileSync("app/(public)/peta-wisata/page.tsx", "utf8");
const shell = readFileSync("features/public-map/public-map.tsx", "utf8");
const leaflet = readFileSync(
  "features/public-map/public-map-leaflet.tsx",
  "utf8",
);
const copy = readFileSync("features/public-map/copy.ts", "utf8");
const {
  PUBLIC_MAP_ENTITY_TYPES,
  buildPublicMapMarkers,
  createPublicMapCoordinateKey,
  createPublicMapItem,
  filterPublicMapMarkersByDestinationCategory,
  getPublicMapNavigationUrl,
  isValidPublicMapCoordinate,
} = await import("../features/public-map/model.ts");
const { PUBLIC_NAVIGATION } = await import("../config/public-navigation.ts");

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
    "cultural-event",
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

test("destination category filtering is deterministic and preserves combined markers for all", () => {
  const markers = buildPublicMapMarkers([
    mapItem(),
    mapItem({
      id: "00000000-0000-4000-8000-000000000002",
      entityType: "umkm",
      title: "UMKM Tenun",
      slug: "umkm-tenun",
      href: "/umkm/umkm-tenun",
      categorySlug: null,
      categoryName: "Kerajinan",
    }),
    mapItem({
      id: "00000000-0000-4000-8000-000000000003",
      title: "Wisata Alam",
      slug: "wisata-alam",
      href: "/destinasi/wisata-alam",
      categorySlug: "alam",
      categoryName: "Alam",
      latitude: -8.36,
      longitude: 116.28,
    }),
  ]);

  const all = filterPublicMapMarkersByDestinationCategory(markers, null);
  const budaya = filterPublicMapMarkersByDestinationCategory(markers, "budaya");

  assert.equal(all.length, 2);
  assert.equal(all.flatMap((marker) => marker.items).length, 3);

  assert.equal(budaya.length, 1);
  assert.deepEqual(
    budaya[0].items.map((item) => item.title),
    ["Kampung Adat"],
  );
});

test("Google Maps navigation uses an approved URL or coordinate fallback", () => {
  assert.equal(
    getPublicMapNavigationUrl(
      mapItem({
        googleMapsUrl: "https://maps.google.com/example",
      }),
    ),
    "https://maps.google.com/example",
  );

  assert.equal(
    getPublicMapNavigationUrl(mapItem()),
    "https://www.google.com/maps/search/?api=1&query=-8.351234,116.271234",
  );
});

test("public tourism map route and navigation use the approved path", () => {
  assert.equal(existsSync("app/(public)/peta-wisata/page.tsx"), true);
  assert.deepEqual(
    PUBLIC_NAVIGATION.find((item) => item.key === "tourismMap"),
    {
      key: "tourismMap",
      label: "Peta Wisata",
      href: "/peta-wisata",
    },
  );
  assert.equal(
    PUBLIC_NAVIGATION.some((item) => item.href === "/peta"),
    false,
  );
});

test("map page loads only the published map data contract", () => {
  assert.match(page, /getPublishedPublicMapData\(\)/);
  assert.match(page, /result\.kind === "error"/);
  assert.match(page, /<PublicMap/);
  assert.match(page, /result\.items\.length > 0/);

  assert.doesNotMatch(page, /\.from\(/);
  assert.doesNotMatch(page, /SERVICE_ROLE|service.?role/i);
  assert.doesNotMatch(
    page,
    /\.insert\(|\.update\(|\.delete\(|\.upsert\(|\.rpc\(/,
  );
});

test("Leaflet is isolated behind a client-only dynamic boundary", () => {
  assert.match(shell, /^"use client";/);
  assert.match(
    shell,
    /dynamic\([\s\S]*?import\("\.\/public-map-leaflet"\)[\s\S]*?ssr: false/,
  );

  assert.match(leaflet, /^"use client";/);
  assert.match(leaflet, /from "react-leaflet"/);
  assert.match(leaflet, /leaflet\/dist\/leaflet\.css/);
});

test("interactive map supports OSM attribution, bounds, marker popups, and tile failure", () => {
  assert.match(leaflet, /<MapContainer/);
  assert.match(leaflet, /<TileLayer/);
  assert.match(leaflet, /openstreetmap\.org\/copyright/);
  assert.match(
    leaflet,
    /https:\/\/\{s\}\.tile\.openstreetmap\.org\/\{z\}\/\{x\}\/\{y\}\.png/,
  );
  assert.match(leaflet, /<CircleMarker/);
  assert.match(leaflet, /<Popup/);
  assert.match(leaflet, /fitBounds\(/);
  assert.match(leaflet, /setView\(/);
  assert.match(leaflet, /invalidateSize\(/);
  assert.match(leaflet, /ResizeObserver/);
  assert.match(leaflet, /tileerror/);
  assert.match(copy, /Peta dasar tidak dapat dimuat/);
});

test("map shell provides category controls and a textual alternative", () => {
  assert.match(shell, /filterPublicMapMarkersByDestinationCategory/);
  assert.match(shell, /aria-pressed=/);
  assert.match(copy, /Filter kategori pada peta wisata/);
  assert.match(copy, /Daftar lokasi/);
  assert.match(copy, /Buka Google Maps/);
  assert.match(copy, /Lihat detail/);
  assert.match(shell, /visibleItems\.length/);
});
