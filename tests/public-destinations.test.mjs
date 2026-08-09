import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import {
  orderPublishedDestinationImages,
  selectPrimaryDestinationImage,
} from "../features/public-destinations/model.ts";

const read = (path) => readFileSync(path, "utf8");
const dataSource = read("features/public-destinations/data.ts");
const listPage = read("app/(public)/destinasi/page.tsx");
const detailPage = read("app/(public)/destinasi/[slug]/page.tsx");
const destinationImage = read("components/public/destination-image.tsx");
const nextConfig = read("next.config.ts");
const destinationCard = read("components/public/destination-card.tsx");
const destinationLocationSummary = read(
  "components/public/destination-location-summary.tsx",
);
const destinationGallery = read("components/public/destination-gallery.tsx");

const images = [
  {
    id: "00000000-0000-4000-8000-000000000002",
    destination_id: "10000000-0000-4000-8000-000000000001",
    storage_bucket: "tourism-media",
    storage_path:
      "destination/10000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000002.jpg",
    caption: null,
    alt_text: "Gambar kedua",
    display_order: 1,
    is_primary: true,
  },
  {
    id: "00000000-0000-4000-8000-000000000001",
    destination_id: "10000000-0000-4000-8000-000000000001",
    storage_bucket: "tourism-media",
    storage_path:
      "destination/10000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000001.jpg",
    caption: null,
    alt_text: "Gambar pertama",
    display_order: 0,
    is_primary: false,
  },
];

test("destination list and dynamic detail routes exist", () => {
  assert.equal(existsSync("app/(public)/destinasi/page.tsx"), true);
  assert.equal(existsSync("app/(public)/destinasi/[slug]/page.tsx"), true);
});

test("queries use published-safe views and detail combines the view with slug", () => {
  assert.match(dataSource, /PUBLISHED_DESTINATIONS_VIEW/);
  assert.match(dataSource, /PUBLISHED_DESTINATION_IMAGES_VIEW/);
  assert.match(dataSource, /\.eq\("slug", slug\)/);
  assert.match(
    read("supabase/migrations/20260728113434_initial_application_schema.sql"),
    /create view public\.published_destinations[\s\S]*?where status = 'published';/,
  );
});

test("draft and archived destinations are excluded by the database projection", () => {
  const initialMigration = read(
    "supabase/migrations/20260728113434_initial_application_schema.sql",
  );
  assert.match(
    initialMigration,
    /create view public\.published_destination_images[\s\S]*?where destination\.status = 'published';/,
  );
  assert.doesNotMatch(dataSource, /\.from\("destinations"\)/);
});

test("empty lists render a clear empty state", () => {
  assert.match(listPage, /destinations\.length === 0/);
  assert.match(listPage, /Belum ada destinasi yang dipublikasikan/);
});

test("unknown or unpublished detail results use notFound", () => {
  assert.match(detailPage, /result\.kind === "not-found"/);
  assert.match(detailPage, /notFound\(\)/);
});

test("primary image and gallery ordering are deterministic", () => {
  assert.equal(selectPrimaryDestinationImage(images)?.id, images[0].id);
  assert.deepEqual(
    orderPublishedDestinationImages(images).map(
      ({ display_order }) => display_order,
    ),
    [0, 1],
  );
});

test("signed destination images bypass optimizer caching beyond their TTL", () => {
  assert.match(destinationImage, /<Image[\s\S]*?unoptimized/);
});

test("Next Image host and path are narrow while signed token queries remain allowed", () => {
  assert.match(nextConfig, /hostname: parsedSupabaseUrl\.hostname/);
  assert.match(
    nextConfig,
    /pathname: `\/storage\/v1\/object\/sign\/tourism-media\/\$\{entity\.pathPrefix\}\/\*\*`/,
  );
  assert.doesNotMatch(nextConfig, /search:/);
});

test("destination queries use the shared public Media signer", () => {
  assert.match(dataSource, /@\/features\/public-media\/server/);
  assert.match(dataSource, /signPublishedMedia/);
  assert.doesNotMatch(dataSource, /signPublishedDestinationImages/);
});

test("the entire destination card remains linked", () => {
  assert.match(destinationCard, /return \(\s*<Link[\s\S]*?<article/);
  assert.match(destinationCard, /<Link[\s\S]*?href=\{href\}/);
  assert.match(
    listPage,
    /<DestinationCard[\s\S]*?href=\{`\/destinasi\/\$\{encodeURIComponent\(destination\.slug\)\}`\}/,
  );
});

test("destination location summary links to the implemented tourism map", () => {
  assert.match(destinationLocationSummary, /href="\/peta-wisata"/);
  assert.match(destinationLocationSummary, />\s*Lihat peta wisata\s*</);

  assert.doesNotMatch(
    destinationLocationSummary,
    /milestone berikutnya|peta interaktif akan tersedia/i,
  );

  assert.match(destinationLocationSummary, /destination\.googleMapsUrl/);
  assert.match(destinationLocationSummary, /Buka Google Maps/);
  assert.match(destinationLocationSummary, /target="_blank"/);
});

test("public destination code contains no mutations or service-role secrets", () => {
  const sources = [
    dataSource,
    read("features/public-media/server.ts"),
    listPage,
    detailPage,
  ].join("\n");
  assert.doesNotMatch(sources, /SERVICE_ROLE|service-role|service_role/i);
  assert.doesNotMatch(sources, /\.insert\(|\.update\(|\.delete\(|\.rpc\(/);
  assert.doesNotMatch(sources, /@\/lib\/auth\/admin/);
});

test("above-the-fold destination images receive explicit browser priority", () => {
  assert.match(
    destinationImage,
    /loading=\{highPriority \? "eager" : "lazy"\}/,
  );
  assert.match(
    destinationImage,
    /fetchPriority=\{highPriority \? "high" : "auto"\}/,
  );

  assert.match(destinationCard, /highPriority=\{highPriority\}/);

  assert.match(listPage, /destinations\.map\(\(destination, index\) =>/);
  assert.match(listPage, /highPriority=\{index === 0\}/);

  assert.match(detailPage, /<DestinationImage[\s\S]*?highPriority/);
});

test("destination detail does not repeat its primary image in the gallery", () => {
  assert.match(
    detailPage,
    /primaryImageId=\{destination\.primaryImage\?\.id \?\? null\}/,
  );

  assert.match(destinationGallery, /image\.id !== primaryImageId/);
});
