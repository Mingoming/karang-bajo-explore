import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  isPublicMediaEntityType,
  isUsableSignedPublicMedia,
  isValidPublicSignedUrl,
  isTrustedPublicMediaReference,
  mapPublicMediaSigningResults,
  PUBLIC_MEDIA_BUCKET,
  PUBLIC_MEDIA_ENTITY_CONFIG,
  PUBLIC_MEDIA_TTL_SECONDS,
} from "../features/public-media/model.ts";

const parentId = "10000000-0000-4000-8000-000000000001";
const imageId = "20000000-0000-4000-8000-000000000001";
const replacementObjectId = "30000000-0000-4000-8000-000000000001";
const entities = Object.entries(PUBLIC_MEDIA_ENTITY_CONFIG);
const reference = (entityType, overrides = {}) => ({
  id: imageId,
  entityType,
  parentId,
  bucket: PUBLIC_MEDIA_BUCKET,
  storagePath: `${PUBLIC_MEDIA_ENTITY_CONFIG[entityType].pathPrefix}/${parentId}/${imageId}.jpg`,
  altText: "Media publik",
  caption: null,
  displayOrder: 0,
  isPrimary: true,
  ...overrides,
});

test("the public Media entity allowlist is closed and maps exact schema names", () => {
  assert.deepEqual(
    entities.map(([entityType]) => entityType),
    [
      "destination",
      "tourism-package",
      "homestay",
      "umkm",
      "traditional-house",
      "cultural-event",
    ],
  );
  assert.equal(isPublicMediaEntityType("gallery"), false);
  assert.deepEqual(PUBLIC_MEDIA_ENTITY_CONFIG.destination, {
    pathPrefix: "destination",
    parentTable: "destinations",
    imageTable: "destination_images",
    parentForeignKey: "destination_id",
    publishedView: "published_destination_images",
  });
});

test("all six entity prefixes produce trusted exact paths", () => {
  for (const [entityType, config] of entities) {
    const media = reference(entityType);
    assert.equal(media.storagePath.startsWith(`${config.pathPrefix}/`), true);
    assert.equal(isTrustedPublicMediaReference(media), true);
  }
});

test("bucket, parent path, row identity, object UUID, and extension are enforced", () => {
  const valid = reference("destination");
  assert.equal(
    isTrustedPublicMediaReference({ ...valid, bucket: "public-media" }),
    false,
  );
  assert.equal(
    isTrustedPublicMediaReference({ ...valid, parentId: "not-a-uuid" }),
    false,
  );
  assert.equal(
    isTrustedPublicMediaReference({ ...valid, id: "not-a-uuid" }),
    false,
  );
  assert.equal(
    isTrustedPublicMediaReference({
      ...valid,
      storagePath: `homestay/${parentId}/${imageId}.jpg`,
    }),
    false,
  );
  assert.equal(
    isTrustedPublicMediaReference({
      ...valid,
      storagePath: `destination/10000000-0000-4000-8000-000000000002/${imageId}.jpg`,
    }),
    false,
  );
  assert.equal(
    isTrustedPublicMediaReference({
      ...valid,
      storagePath: `destination/${parentId}/${imageId}.gif`,
    }),
    false,
  );
  assert.equal(
    isTrustedPublicMediaReference({
      ...valid,
      storagePath: `destination/${parentId}/not-a-uuid.jpg`,
    }),
    false,
  );
});

test("malformed media references fail closed without throwing", () => {
  const valid = reference("destination");
  for (const malformed of [
    null,
    { ...valid, id: undefined },
    { ...valid, parentId: undefined },
    { ...valid, storagePath: undefined },
  ]) {
    assert.doesNotThrow(() => isTrustedPublicMediaReference(malformed));
    assert.equal(isTrustedPublicMediaReference(malformed), false);
  }
});

test("slashes, traversal, encoded separators, and extra segments are rejected", () => {
  const valid = reference("destination");
  for (const storagePath of [
    `/${valid.storagePath}`,
    `${valid.storagePath}/`,
    `destination/${parentId}/../${imageId}.jpg`,
    `destination/${parentId}%2f${imageId}.jpg`,
    `destination/${parentId}%5c${imageId}.jpg`,
    `destination\\${parentId}\\${imageId}.jpg`,
    `destination//${parentId}/${imageId}.jpg`,
    `destination/${parentId}/${imageId}.JPG`,
    `destination/${parentId}/extra/${imageId}.jpg`,
  ]) {
    assert.equal(
      isTrustedPublicMediaReference({ ...valid, storagePath }),
      false,
    );
  }
});

test("reordered and partial results map by exact path in input order", () => {
  const first = reference("destination");
  const second = reference("homestay", {
    id: "20000000-0000-4000-8000-000000000002",
    storagePath: `homestay/${parentId}/20000000-0000-4000-8000-000000000002.webp`,
  });
  const mapped = mapPublicMediaSigningResults(
    [first, second],
    [{ path: second.storagePath, signedUrl: "https://signed.invalid/second" }],
  );
  assert.deepEqual(
    mapped.map(({ id, signedUrl }) => ({ id, signedUrl })),
    [{ id: second.id, signedUrl: "https://signed.invalid/second" }],
  );
});

test("duplicate paths remain deterministic and signing failures are suppressed", () => {
  const media = reference("destination");
  const mapped = mapPublicMediaSigningResults([media, media], []);
  assert.deepEqual(mapped, []);
});

test("metadata, signed URL, and media-model validity fail closed", () => {
  const valid = reference("destination");
  assert.equal(
    isUsableSignedPublicMedia({
      ...valid,
      signedUrl: "https://signed.invalid/image",
    }),
    true,
  );
  for (const malformed of [
    { ...valid, altText: null },
    { ...valid, altText: "   " },
    { ...valid, caption: "" },
    { ...valid, caption: 42 },
    { ...valid, displayOrder: 1.5 },
    { ...valid, displayOrder: -1 },
    { ...valid, isPrimary: "true" },
  ]) {
    assert.equal(isTrustedPublicMediaReference(malformed), false);
  }
  for (const signedUrl of [
    null,
    "",
    "   ",
    "not-a-url",
    "javascript:alert(1)",
  ]) {
    assert.equal(isValidPublicSignedUrl(signedUrl), false);
    assert.equal(isUsableSignedPublicMedia({ ...valid, signedUrl }), false);
  }
  assert.deepEqual(
    mapPublicMediaSigningResults(
      [{ ...valid, altText: "" }],
      [{ path: valid.storagePath, signedUrl: "https://signed.invalid/image" }],
    ),
    [],
  );
});

test("server signer has a fixed secure contract", () => {
  const source = readFileSync("features/public-media/server.ts", "utf8");
  assert.equal(PUBLIC_MEDIA_TTL_SECONDS, 600);
  assert.match(source, /import "server-only"/);
  assert.match(source, /new Set\(/);
  assert.match(
    source,
    /createSignedUrls\(uniquePaths, PUBLIC_MEDIA_TTL_SECONDS\)/,
  );
  assert.doesNotMatch(source, /service.?role|SERVICE_ROLE/i);
  assert.doesNotMatch(source, /console\.(?:log|error)[\s\S]*storagePath/);
});

test("replacement objects remain trusted when their UUID differs from the media row ID", () => {
  const replaced = reference("destination", {
    storagePath: `destination/${parentId}/${replacementObjectId}.webp`,
  });

  assert.notEqual(replaced.id, replacementObjectId);
  assert.equal(isTrustedPublicMediaReference(replaced), true);
});
