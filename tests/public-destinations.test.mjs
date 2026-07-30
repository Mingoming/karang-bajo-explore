import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import test from "node:test";

import { signPublishedDestinationImages } from "../features/public-destinations/media.ts";
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
const migrationName = readdirSync("supabase/migrations").find((name) =>
  name.endsWith("_public_destination_signed_media.sql"),
);
const migration = read(`supabase/migrations/${migrationName}`);

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

test("signing accepts only trusted database-shaped destination records", async () => {
  const calls = [];
  const supabase = {
    storage: {
      from(bucket) {
        assert.equal(bucket, "tourism-media");
        return {
          async createSignedUrls(paths, ttl) {
            calls.push({ paths, ttl });
            return {
              data: paths.map((path) => ({
                path,
                signedUrl: `https://storage.invalid/signed?item=${paths.indexOf(path)}`,
                error: null,
              })),
              error: null,
            };
          },
        };
      },
    },
  };
  const injected = {
    ...images[0],
    storage_path: "homestay/arbitrary/private.jpg",
  };
  const result = await signPublishedDestinationImages(supabase, [
    images[0],
    injected,
  ]);
  assert.equal(result.length, 1);
  assert.deepEqual(calls, [{ paths: [images[0].storage_path], ttl: 600 }]);
});

test("batch signing maps reordered and partial results by exact path", async () => {
  const supabase = {
    storage: {
      from() {
        return {
          async createSignedUrls(paths, ttl) {
            assert.equal(ttl, 600);
            return {
              data: [
                { path: paths[1], signedUrl: "https://storage.invalid/second" },
                { path: paths[0], signedUrl: "https://storage.invalid/first" },
              ],
              error: null,
            };
          },
        };
      },
    },
  };
  const result = await signPublishedDestinationImages(supabase, images);
  assert.equal(result[0].signedUrl, "https://storage.invalid/first");
  assert.equal(result[1].signedUrl, "https://storage.invalid/second");
});

test("complete signing failure returns null fallbacks without logging paths", async () => {
  const messages = [];
  const originalConsoleError = console.error;
  console.error = (...values) => messages.push(values);
  try {
    const supabase = {
      storage: {
        from() {
          return {
            async createSignedUrls() {
              return { data: null, error: new Error("safe test failure") };
            },
          };
        },
      },
    };
    const result = await signPublishedDestinationImages(supabase, images);
    assert.deepEqual(
      result.map(({ signedUrl }) => signedUrl),
      [null, null],
    );
    assert.equal(messages.length, 1);
    assert.doesNotMatch(JSON.stringify(messages), /destination\//);
  } finally {
    console.error = originalConsoleError;
  }
});

test("signed destination images bypass optimizer caching beyond their TTL", () => {
  assert.match(destinationImage, /<Image[\s\S]*?unoptimized/);
});

test("Next Image host and path are narrow while signed token queries remain allowed", () => {
  assert.match(nextConfig, /hostname: parsedSupabaseUrl\.hostname/);
  assert.match(
    nextConfig,
    /pathname: "\/storage\/v1\/object\/sign\/tourism-media\/\*\*"/,
  );
  assert.doesNotMatch(nextConfig, /search:/);
});

test("Storage policy authorizes only referenced published destination objects", () => {
  assert.match(migration, /security definer/);
  assert.match(migration, /set search_path = ''/);
  assert.match(migration, /destination\.status = 'published'/);
  assert.match(migration, /image\.storage_path = object_name/);
  assert.match(migration, /bucket_id = 'tourism-media'/);
  assert.doesNotMatch(migration, /update|insert into|delete from/i);
});

test("public destination code contains no mutations or service-role secrets", () => {
  const sources = [
    dataSource,
    read("features/public-destinations/media.ts"),
    listPage,
    detailPage,
  ].join("\n");
  assert.doesNotMatch(sources, /SERVICE_ROLE|service-role|service_role/i);
  assert.doesNotMatch(sources, /\.insert\(|\.update\(|\.delete\(|\.rpc\(/);
  assert.doesNotMatch(sources, /@\/lib\/auth\/admin/);
});
