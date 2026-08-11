import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";
import sharp from "sharp";

import {
  MEDIA_MAX_OUTPUT_EDGE,
  normalizeMediaImage,
} from "../features/media/image-normalization.ts";

import {
  canAddMediaImage,
  classifyMediaDeletion,
  createMediaStoragePath,
  createMediaInitialState,
  getMediaMutationMode,
  getReplacementCompensationDecision,
  getUploadCompensationDecision,
  isMediaRecordOwnedBy,
  isMediaEntityType,
  isValidMediaUuid,
  moveMediaImageToOrder,
  parseMediaRouteIdentity,
  shouldMakeMediaPrimary,
  validateMediaInput,
  validateTrustedMediaFormData,
} from "../features/media/model.ts";
import {
  MEDIA_MAX_FILE_SIZE,
  signatureMatchesMime,
  validateMediaFile,
  validateMediaFileField,
} from "../features/media/file-validation.ts";
import { isValidTraditionalHouseSlug } from "../features/traditional-houses/model.ts";

const parentId = "10000000-0000-4000-8000-000000000001";
const imageId = "20000000-0000-4000-8000-000000000001";
const otherParentId = "10000000-0000-4000-8000-000000000002";

function trustedForm(overrides = {}) {
  const formData = new FormData();
  for (const [key, value] of Object.entries({
    alt_text: "Pemandangan desa",
    caption: "Keterangan",
    display_order: "0",
    ...overrides,
  })) {
    formData.set(key, value);
  }
  return formData;
}

function metadata(overrides = {}) {
  return {
    entity_type: "destination",
    parent_id: parentId,
    alt_text: "Pemandangan desa",
    caption: " Keterangan terverifikasi ",
    display_order: "0",
    ...overrides,
  };
}

function file(bytes, type, name = "upload.bin") {
  return new File([Uint8Array.from(bytes)], name, { type });
}

test("entity allowlist and route UUID validation reject untrusted identifiers", () => {
  assert.equal(isMediaEntityType("destination"), true);
  assert.equal(isMediaEntityType("../../storage"), false);
  assert.equal(isMediaEntityType("gallery"), false);
  assert.equal(isValidMediaUuid(parentId), true);
  assert.equal(isValidMediaUuid("../rahasia"), false);
});

test("metadata normalization trims required text and nulls an empty caption", () => {
  const result = validateMediaInput(
    metadata({ alt_text: "  Rumah adat  ", caption: "  ", is_primary: "on" }),
  );
  assert.equal(result.success, true);
  if (!result.success) return;
  assert.equal(result.data.altText, "Rumah adat");
  assert.equal(result.data.caption, null);
  assert.equal(result.data.isPrimary, true);
});

test("alt text and display order validation are field specific", () => {
  const result = validateMediaInput(
    metadata({ alt_text: " ", display_order: "-1" }),
  );
  assert.equal(result.success, false);
  if (result.success) return;
  assert.match(result.fieldErrors.alt_text ?? "", /wajib/);
  assert.match(result.fieldErrors.display_order ?? "", /bilangan bulat/);
});

test("unknown and immutable fields are rejected", () => {
  for (const value of [
    { bucket: "evil" },
    { storage_path: "evil/path" },
    { created_by: imageId },
    { id: imageId },
  ]) {
    const result = validateMediaInput(metadata(value));
    assert.equal(result.success, false);
    if (!result.success)
      assert.deepEqual(result.formErrors, [
        "Formulir memuat kolom yang tidak dikenali.",
      ]);
  }
});

test("allowed image signatures are recognized", () => {
  assert.equal(
    signatureMatchesMime(
      Uint8Array.from([0xff, 0xd8, 0xff, 0x00]),
      "image/jpeg",
    ),
    true,
  );
  assert.equal(
    signatureMatchesMime(
      Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      "image/png",
    ),
    true,
  );
  assert.equal(
    signatureMatchesMime(
      Uint8Array.from([
        0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
      ]),
      "image/webp",
    ),
    true,
  );
});

test("supported MIME and matching signatures pass file validation", async () => {
  const cases = [
    file([0xff, 0xd8, 0xff, 0x00], "image/jpeg", "photo.jpg"),
    file(
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
      "image/png",
      "photo.png",
    ),
    file(
      [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50],
      "image/webp",
      "photo.webp",
    ),
  ];
  for (const value of cases)
    assert.equal((await validateMediaFile(value, true)).success, true);
});

test("empty, oversized, unsupported, and malformed files are rejected", async () => {
  assert.equal(
    (await validateMediaFile(file([], "image/png"), true)).success,
    false,
  );
  assert.equal(
    (
      await validateMediaFile(
        file(new Uint8Array(MEDIA_MAX_FILE_SIZE + 1), "image/jpeg"),
        true,
      )
    ).success,
    false,
  );
  assert.equal(
    (await validateMediaFile(file([1, 2, 3], "image/gif"), true)).success,
    false,
  );
  assert.equal((await validateMediaFile("not-a-file", true)).success, false);
});

test("malformed forms with multiple file entries are rejected", async () => {
  const formData = new FormData();
  formData.append("file", file([0xff, 0xd8, 0xff], "image/jpeg"));
  formData.append("file", file([0xff, 0xd8, 0xff], "image/jpeg"));
  assert.equal((await validateMediaFileField(formData, true)).success, false);
});

test("MIME and binary signature mismatches are rejected", async () => {
  const pngBytesAsJpeg = file(
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    "image/jpeg",
  );
  assert.equal((await validateMediaFile(pngBytesAsJpeg, true)).success, false);
});

test("safe extension mapping and deterministic paths ignore original filenames", () => {
  assert.equal(
    createMediaStoragePath("destination", parentId, imageId, "webp"),
    `destination/${parentId}/${imageId}.webp`,
  );
  assert.throws(() =>
    createMediaStoragePath("destination", "../escape", imageId, "webp"),
  );
  assert.throws(() =>
    createMediaStoragePath("destination", parentId, imageId, "svg"),
  );
  assert.throws(() =>
    createMediaStoragePath("../../storage", parentId, imageId, "webp"),
  );
});

test("trusted bound identity is used when the form submits no ownership fields", () => {
  const identity = parseMediaRouteIdentity("destination", parentId);
  assert.deepEqual(identity, { entityType: "destination", parentId });
  assert.ok(identity);
  const result = validateTrustedMediaFormData(trustedForm(), identity);
  assert.equal(result.success, true);
  if (!result.success) return;
  assert.equal(result.data.entityType, "destination");
  assert.equal(result.data.parentId, parentId);
});

test("injected entity or parent identity is rejected without overriding the bound owner", () => {
  const identity = { entityType: "destination", parentId };
  for (const injection of [
    { entity_type: "homestay" },
    { parent_id: otherParentId },
    { entity_type: "destination", parent_id: parentId },
  ]) {
    const result = validateTrustedMediaFormData(
      trustedForm(injection),
      identity,
    );
    assert.equal(result.success, false);
    assert.equal(result.values.entity_type, "destination");
    assert.equal(result.values.parent_id, parentId);
    assert.match(result.formErrors.join(" "), /tidak boleh dikirim/);
  }
});

test("destination and homestay contexts cannot cross storage path prefixes", () => {
  const destinationIdentity = parseMediaRouteIdentity("destination", parentId);
  const homestayIdentity = parseMediaRouteIdentity("homestay", otherParentId);
  assert.ok(destinationIdentity);
  assert.ok(homestayIdentity);
  const destinationPath = createMediaStoragePath(
    destinationIdentity.entityType,
    destinationIdentity.parentId,
    imageId,
    "jpg",
  );
  const homestayPath = createMediaStoragePath(
    homestayIdentity.entityType,
    homestayIdentity.parentId,
    imageId,
    "webp",
  );
  assert.match(destinationPath, /^destination\//);
  assert.doesNotMatch(destinationPath, /^homestay\//);
  assert.match(homestayPath, /^homestay\//);
  assert.doesNotMatch(homestayPath, /^destination\//);
});

test("image limit and primary decision behavior are deterministic", () => {
  assert.equal(canAddMediaImage(9), true);
  assert.equal(canAddMediaImage(10), false);
  assert.equal(shouldMakeMediaPrimary(0, false), true);
  assert.equal(shouldMakeMediaPrimary(2, false), false);
  assert.equal(shouldMakeMediaPrimary(2, true), true);
});

test("ordered media remains unique and deterministic", () => {
  const ids = ["a", "b", "c"];
  assert.deepEqual(moveMediaImageToOrder(ids, "c", 0), ["c", "a", "b"]);
  assert.deepEqual(moveMediaImageToOrder(ids, "a", 9), ["b", "c", "a"]);
  assert.equal(moveMediaImageToOrder(["a", "a"], "a", 0), null);
});

test("upload and replacement compensation decisions never classify partial writes as success", () => {
  assert.equal(getUploadCompensationDecision(true, false), "remove-new-object");
  assert.equal(getUploadCompensationDecision(true, true), "none");
  assert.equal(getReplacementCompensationDecision(false), "remove-new-object");
  assert.equal(getReplacementCompensationDecision(true), "remove-old-object");
});

test("deletion result classification distinguishes orphan cleanup", () => {
  assert.equal(classifyMediaDeletion(false, false), "database-failure");
  assert.equal(classifyMediaDeletion(true, false), "orphaned-storage-object");
  assert.equal(classifyMediaDeletion(true, true), "complete-success");
});

test("create versus update mode is based on server-read records", () => {
  assert.equal(getMediaMutationMode(null), "create");
  const record = {
    id: imageId,
    parentId,
    storageBucket: "tourism-media",
    storagePath: `destination/${parentId}/${imageId}.jpg`,
    caption: null,
    altText: "Pemandangan",
    displayOrder: 0,
    isPrimary: true,
    createdAt: "2026-07-30T00:00:00Z",
    previewUrl: null,
  };
  assert.equal(getMediaMutationMode(record), "update");
  assert.equal(
    createMediaInitialState("destination", parentId, record).values.parent_id,
    parentId,
  );
  assert.equal(
    isMediaRecordOwnedBy(record, { entityType: "destination", parentId }),
    true,
  );
  assert.equal(
    isMediaRecordOwnedBy(record, {
      entityType: "destination",
      parentId: otherParentId,
    }),
    false,
  );
});

test("function-action media forms do not set method or encType manually", () => {
  for (const filePath of [
    "features/media/media-form.tsx",
    "features/media/media-delete-button.tsx",
  ]) {
    const source = readFileSync(filePath, "utf8");
    assert.doesNotMatch(source, /\bmethod\s*=/);
    assert.doesNotMatch(source, /\bencType\s*=/);
    assert.match(source, /action=\{formAction\}/);
  }
});

test("create and edit pages bind mutations to the server-read owner", () => {
  const createPage = readFileSync("app/admin/media/tambah/page.tsx", "utf8");
  const editPage = readFileSync("app/admin/media/[id]/edit/page.tsx", "utf8");
  const form = readFileSync("features/media/media-form.tsx", "utf8");
  assert.match(createPage, /createMedia\.bind\(/);
  assert.match(createPage, /result\.selected\.entityType/);
  assert.match(createPage, /result\.selected\.id/);
  assert.match(editPage, /updateMedia\.bind\(/);
  assert.match(editPage, /result\.parent\.entityType/);
  assert.match(editPage, /result\.parent\.id/);
  assert.match(editPage, /result\.image\.id/);
  assert.doesNotMatch(form, /name=["']entity_type["']/);
  assert.doesNotMatch(form, /name=["']parent_id["']/);
});

test("media list routes existing parents to the gallery page", () => {
  const source = readFileSync("features/media/media-list.tsx", "utf8");

  assert.match(source, /\/admin\/media\/kelola/);
  assert.doesNotMatch(
    source,
    /parent\.primaryImageId\s*\?\s*`\/admin\/media\/\$\{parent\.primaryImageId\}\/edit/,
  );
});

test("gallery page loads server-read parent and image data", () => {
  const source = readFileSync("app/admin/media/kelola/page.tsx", "utf8");

  assert.match(source, /getMediaGalleryData/);
  assert.match(source, /result\.parent\.entityType/);
  assert.match(source, /result\.parent\.id/);
  assert.match(source, /MediaGallery/);
});

test("media gallery provides add and edit navigation", () => {
  const source = readFileSync("features/media/media-gallery.tsx", "utf8");

  assert.match(source, /admin\/media\/tambah/);
  assert.match(source, /admin\/media\/\$\{image\.id\}\/edit/);
  assert.match(source, /Gambar utama/);
});

test("successful media creation redirects back to the parent gallery", () => {
  const actions = readFileSync("features/media/actions.ts", "utf8");
  const galleryPage = readFileSync("app/admin/media/kelola/page.tsx", "utf8");

  const createStart = actions.indexOf("export async function createMedia");
  const updateStart = actions.indexOf("export async function updateMedia");

  assert.notEqual(createStart, -1);
  assert.notEqual(updateStart, -1);

  const createSource = actions.slice(createStart, updateStart);

  assert.match(createSource, /redirect\(\s*mediaGalleryPath\(/);
  assert.doesNotMatch(createSource, /redirect\(\s*mediaEditPath\(/);
  assert.match(createSource, /"created"/);

  assert.match(galleryPage, /success\?: string \| string\[\]/);
  assert.match(galleryPage, /query\.success === "created"/);
  assert.match(galleryPage, /Gambar berhasil ditambahkan ke galeri/);
});

test("destination media mutations revalidate trusted English destination paths", () => {
  const actions = readFileSync("features/media/actions.ts", "utf8");
  const helperStart = actions.indexOf(
    "function revalidateEnglishDestinationPaths",
  );
  const contextStart = actions.indexOf("async function readTrustedContext");
  const createStart = actions.indexOf("export async function createMedia");
  const updateStart = actions.indexOf("export async function updateMedia");
  const deleteStart = actions.indexOf("export async function deleteMedia");
  const helperEnd = actions.indexOf("function nextState", helperStart);
  const helperSource = actions.slice(helperStart, helperEnd);
  const contextSource = actions.slice(contextStart, createStart);
  const createSource = actions.slice(createStart, updateStart);
  const updateSource = actions.slice(updateStart, deleteStart);
  const deleteSource = actions.slice(deleteStart);

  for (const offset of [
    helperStart,
    contextStart,
    createStart,
    updateStart,
    deleteStart,
    helperEnd,
  ]) {
    assert.notEqual(offset, -1);
  }

  assert.match(helperSource, /if \(!trustedDestinationSlug\) return;/);
  assert.match(helperSource, /PUBLIC_ENGLISH_DESTINATIONS_PATH/);
  assert.match(
    helperSource,
    /getPublicEnglishDestinationPath\(trustedDestinationSlug\)/,
  );
  assert.equal(
    actions.match(/revalidatePath\(PUBLIC_ENGLISH_DESTINATIONS_PATH\)/g)
      ?.length,
    1,
  );

  assert.match(contextSource, /queryDestinationById/);
  assert.match(contextSource, /if \(entityType === "destination"\)/);
  assert.match(contextSource, /destinationResult\.destination\.slug/);
  assert.doesNotMatch(actions, /formData\.get\(["']slug["']\)/);

  assert.match(
    createSource,
    /revalidateEnglishDestinationPaths\(context\.destinationSlug\)/,
  );
  assert.equal(
    updateSource.match(
      /revalidateEnglishDestinationPaths\(context\.destinationSlug\)/g,
    )?.length,
    2,
  );
  assert.match(
    deleteSource,
    /revalidateEnglishDestinationPaths\(context\.destinationSlug\)/,
  );

  const replacementRevalidation = updateSource.indexOf(
    "revalidateEnglishDestinationPaths(context.destinationSlug)",
  );
  const replacementCleanup = updateSource.indexOf(
    "const oldCleanup = await removeMediaObject",
  );
  assert.ok(replacementRevalidation < replacementCleanup);

  const deleteRevalidation = deleteSource.indexOf(
    "revalidateEnglishDestinationPaths(context.destinationSlug)",
  );
  const deleteCleanup = deleteSource.indexOf(
    "const cleanup = await removeMediaObject",
  );
  assert.ok(deleteRevalidation < deleteCleanup);

  for (const source of [createSource, updateSource, deleteSource]) {
    assert.match(source, /revalidatePath\(LIST_PATH\)/);
  }
});

test("Traditional House media mutations revalidate trusted English paths only", () => {
  const actions = readFileSync("features/media/actions.ts", "utf8");
  const helperStart = actions.indexOf(
    "function revalidateEnglishTraditionalHousePaths",
  );
  const contextStart = actions.indexOf("async function readTrustedContext");
  const createStart = actions.indexOf("export async function createMedia");
  const updateStart = actions.indexOf("export async function updateMedia");
  const deleteStart = actions.indexOf("export async function deleteMedia");
  const helperEnd = actions.indexOf("function nextState", helperStart);
  const helperSource = actions.slice(helperStart, helperEnd);
  const contextSource = actions.slice(contextStart, createStart);
  const createSource = actions.slice(createStart, updateStart);
  const updateSource = actions.slice(updateStart, deleteStart);
  const deleteSource = actions.slice(deleteStart);

  for (const offset of [
    helperStart,
    contextStart,
    createStart,
    updateStart,
    deleteStart,
    helperEnd,
  ]) {
    assert.notEqual(offset, -1);
  }

  assert.match(helperSource, /PUBLIC_ENGLISH_TRADITIONAL_HOUSES_PATH/);
  assert.match(
    helperSource,
    /getPublicEnglishTraditionalHousePath\(trustedTraditionalHouseSlug\)/,
  );
  assert.match(contextSource, /queryTraditionalHouseById/);
  assert.match(
    contextSource,
    /entityType === "traditional-house"[\s\S]*?traditionalHouseSlug/,
  );
  assert.doesNotMatch(actions, /formData\.get\(["']slug["']\)/);

  for (const source of [createSource, updateSource, deleteSource]) {
    assert.match(
      source,
      /revalidateEnglishTraditionalHousePaths\(context\.traditionalHouseSlug\)/,
    );
  }

  assert.match(
    actions,
    /if \(entityType === "destination"\)[\s\S]*?else if \(entityType === "traditional-house"\)/,
  );
  assert.doesNotMatch(
    helperSource,
    /PUBLIC_ENGLISH_DESTINATIONS_PATH|\/en\/destinations/,
  );
});

test("Cultural Event media mutations revalidate only the trusted English event paths", async () => {
  for (const [actionName, options] of [
    ["create", { fileMode: "create", formOverrides: { fileMode: "create" } }],
    ["update", {}],
    [
      "update",
      { fileMode: "replacement", formOverrides: { fileMode: "replacement" } },
    ],
    ["delete", {}],
  ]) {
    const runtime = createMediaActionRuntime({
      entityType: "cultural-event",
      images: actionName === "create" ? [] : undefined,
    });
    const result = await invokeMedia(runtime, actionName, options);
    assert.ok(result.redirectPath);
    assert.deepEqual(
      runtime.paths.filter((path) => path.startsWith("/en/cultural-events")),
      [
        "/en/cultural-events",
        `/en/cultural-events/${TRUSTED_CULTURAL_EVENT_SLUG}`,
      ],
    );
    const mutationEvent = runtime.events.findIndex((event) =>
      event.startsWith("mutation:media_"),
    );
    const revalidationEvent = runtime.events.findIndex(
      (event) => event === "revalidate:/en/cultural-events",
    );
    assert.ok(mutationEvent >= 0);
    assert.ok(revalidationEvent > mutationEvent);
  }

  const failedRuntime = createMediaActionRuntime({
    entityType: "cultural-event",
  });
  const failed = await invokeMedia(failedRuntime, "update", {
    rpcResponses: new Map([
      ["media_update", { data: null, error: { code: "mutation-failed" } }],
    ]),
  });
  assert.equal(failed.result.kind, "database-error");
  assert.equal(failedRuntime.paths.includes("/en/cultural-events"), false);
  assert.equal(
    failedRuntime.paths.some((path) =>
      path.includes(TRUSTED_CULTURAL_EVENT_SLUG),
    ),
    false,
  );

  const destinationRuntime = createMediaActionRuntime({
    entityType: "destination",
  });
  await invokeMedia(destinationRuntime, "update");
  assert.equal(destinationRuntime.paths.includes("/en/cultural-events"), false);
});

test("media normalization converts uploads into bounded WebP images", async () => {
  const input = await sharp({
    create: {
      width: 3000,
      height: 2000,
      channels: 3,
      background: {
        r: 90,
        g: 120,
        b: 80,
      },
    },
  })
    .jpeg({ quality: 95 })
    .toBuffer();

  const result = await normalizeMediaImage(
    new File([input], "large-photo.jpg", {
      type: "image/jpeg",
    }),
  );

  assert.equal(result.success, true);
  if (!result.success) return;

  assert.equal(result.image.extension, "webp");
  assert.equal(result.image.file.type, "image/webp");
  assert.equal(result.image.file.name, "normalized.webp");

  const output = Buffer.from(await result.image.file.arrayBuffer());
  const metadata = await sharp(output).metadata();

  assert.equal(metadata.format, "webp");
  assert.ok((metadata.width ?? Infinity) <= MEDIA_MAX_OUTPUT_EDGE);
  assert.ok((metadata.height ?? Infinity) <= MEDIA_MAX_OUTPUT_EDGE);
  assert.equal(metadata.width, 1920);
  assert.equal(metadata.height, 1280);
});

test("media normalization rejects malformed signature-only images", async () => {
  const result = await normalizeMediaImage(
    new File([Uint8Array.from([0xff, 0xd8, 0xff, 0x00])], "broken.jpg", {
      type: "image/jpeg",
    }),
  );

  assert.equal(result.success, false);
});

test("media actions normalize create and replacement uploads before storage", () => {
  const actions = readFileSync("features/media/actions.ts", "utf8");

  assert.equal(actions.match(/normalizeMediaImage\(/g)?.length, 2);
  assert.equal(actions.match(/normalized\.image\.extension/g)?.length, 2);
  assert.equal(actions.match(/normalized\.image\.file/g)?.length, 2);
});

const TRUSTED_TRADITIONAL_HOUSE_SLUG = "rumah-adat-terpercaya";
const TRUSTED_DESTINATION_SLUG = "destinasi-terpercaya";
const TRUSTED_CULTURAL_EVENT_SLUG = "acara-budaya-terpercaya";

function mediaActionForm(overrides = {}) {
  const { fileMode, ...fieldOverrides } = overrides;
  const formData = trustedForm(fieldOverrides);
  if (fileMode) {
    formData.set("file", file([0xff, 0xd8, 0xff], "image/jpeg", "upload.jpg"));
  }
  return formData;
}

function mediaActionPrevious(entityType, ownerId, image = null) {
  return createMediaInitialState(entityType, ownerId, image);
}

function mediaImage(id, ownerId, overrides = {}) {
  return {
    id,
    parentId: ownerId,
    storageBucket: "tourism-media",
    storagePath: `traditional-house/${ownerId}/${id}.webp`,
    caption: "Keterangan sumber",
    altText: "Teks alternatif sumber",
    displayOrder: 0,
    isPrimary: true,
    createdAt: "2026-08-10T00:00:00.000Z",
    previewUrl: null,
    ...overrides,
  };
}

function createMediaActionRuntime({
  entityType = "traditional-house",
  ownerId = parentId,
  ownerSlug = TRUSTED_TRADITIONAL_HOUSE_SLUG,
  images = [mediaImage(imageId, ownerId)],
} = {}) {
  const runtime = {
    entityType,
    ownerId,
    ownerSlug,
    images,
    events: [],
    paths: [],
    calls: [],
    storageCalls: [],
    authCalls: 0,
    authorizationError: null,
    ownerParentResponse: {
      entityType,
      id: ownerId,
      label: "Parent",
      status: "draft",
      updatedAt: "2026-08-10T00:00:00.000Z",
      imageCount: images.length,
      primaryImageId: images.find((image) => image.isPrimary)?.id ?? null,
      primaryPath: images.find((image) => image.isPrimary)?.storagePath ?? null,
      previewUrl: null,
    },
    imagesResponse: images,
    destinationResponse: {
      success: true,
      destination: { slug: TRUSTED_DESTINATION_SLUG },
    },
    traditionalHouseResponse: {
      success: true,
      house: { slug: ownerSlug },
    },
    culturalEventResponse: {
      success: true,
      event: { slug: TRUSTED_CULTURAL_EVENT_SLUG },
    },
    homestayResponse: {
      success: true,
      homestay: { slug: "homestay-karang-bajo" },
    },
    umkmResponse: {
      success: true,
      umkm: { slug: "usaha-karang-bajo" },
    },
    rpcResponses: new Map(),
    fileMode: "metadata",
    client: null,
  };

  runtime.client = {
    rpc(name, args) {
      runtime.calls.push({ name, args });
      runtime.events.push(`mutation:${name}`);
      if (runtime.rpcResponses.has(name)) {
        return Promise.resolve(runtime.rpcResponses.get(name));
      }
      if (name === "media_replace" || name === "media_delete") {
        return Promise.resolve({ data: "old/path.webp", error: null });
      }
      return Promise.resolve({ data: null, error: null });
    },
  };

  return runtime;
}

async function loadMediaActions(runtime) {
  const source = readFileSync("features/media/actions.ts", "utf8")
    .replace(/^"use server";\s*/m, "")
    .replace(/import\s+[\s\S]*?from\s+["'][^"']+["'];\s*/g, "");
  const stripped = stripTypeScriptTypes(source, { mode: "strip" });
  const key = `__mediaActionDeps_${Math.random().toString(36).slice(2)}`;
  const uploadFile = file([0xff, 0xd8, 0xff], "image/webp", "normalized.webp");

  globalThis[key] = {
    revalidatePath: (path) => {
      runtime.paths.push(path);
      runtime.events.push(`revalidate:${path}`);
    },
    redirect: (path) => {
      runtime.events.push(`redirect:${path}`);
      const error = new Error("REDIRECT");
      error.path = path;
      throw error;
    },
    normalizeMediaImage: async () => ({
      success: true,
      image: { extension: "webp", file: uploadFile },
    }),
    getPublicEnglishDestinationPath: (slug) =>
      `/en/destinations/${encodeURIComponent(slug)}`,
    getPublicEnglishTraditionalHousePath: (slug) =>
      `/en/traditional-houses/${encodeURIComponent(slug)}`,
    getPublicEnglishHomestayPath: (slug) =>
      `/en/homestays/${encodeURIComponent(slug)}`,
    getPublicEnglishUmkmPath: (slug) =>
      `/en/local-businesses/${encodeURIComponent(slug)}`,
    getPublicEnglishCulturalEventPath: (slug) =>
      `/en/cultural-events/${encodeURIComponent(slug)}`,
    PUBLIC_ENGLISH_DESTINATIONS_PATH: "/en/destinations",
    PUBLIC_ENGLISH_TRADITIONAL_HOUSES_PATH: "/en/traditional-houses",
    PUBLIC_ENGLISH_HOMESTAYS_PATH: "/en/homestays",
    PUBLIC_ENGLISH_UMKMS_PATH: "/en/local-businesses",
    PUBLIC_ENGLISH_CULTURAL_EVENTS_PATH: "/en/cultural-events",
    queryDestinationById: async () => {
      runtime.events.push("owner-slug-read");
      return runtime.destinationResponse;
    },
    queryTraditionalHouseById: async () => {
      runtime.events.push("owner-slug-read");
      return runtime.traditionalHouseResponse;
    },
    queryHomestayById: async () => {
      runtime.events.push("owner-slug-read");
      return runtime.homestayResponse;
    },
    queryUmkmById: async () => {
      runtime.events.push("owner-slug-read");
      return runtime.umkmResponse;
    },
    queryCulturalEventById: async () => {
      runtime.events.push("owner-slug-read");
      return runtime.culturalEventResponse;
    },
    isValidCulturalEventSlug: (slug) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug),
    isValidTraditionalHouseSlug,
    isValidHomestaySlug: (slug) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug),
    isValidUmkmSlug: (slug) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug),
    requireAdministrator: async () => {
      runtime.authCalls += 1;
      runtime.events.push("authorization");
      if (runtime.authorizationError) throw runtime.authorizationError;
      return { id: "administrator-id" };
    },
    createClient: async () => runtime.client,
    queryMediaImages: async () => {
      runtime.events.push("media-images-read");
      return runtime.imagesResponse;
    },
    queryMediaParentById: async () => {
      runtime.events.push("media-parent-read");
      return runtime.ownerParentResponse;
    },
    validateMediaFileField: async (_formData, required) => {
      const replacement = runtime.fileMode === "replacement";
      if (required || replacement) {
        return { success: true, file: uploadFile, extension: "webp" };
      }
      return { success: true, file: null, extension: null };
    },
    canAddMediaImage,
    createMediaStoragePath,
    isMediaRecordOwnedBy,
    isMediaEntityType,
    isValidMediaUuid,
    moveMediaImageToOrder,
    parseMediaRouteIdentity,
    shouldMakeMediaPrimary,
    validateTrustedMediaFormData,
    logMediaStorageFailure: () => {
      runtime.events.push("storage-log");
    },
    uploadMediaObject: async () => {
      runtime.storageCalls.push("upload");
      runtime.events.push("storage:upload");
      return { error: null };
    },
    removeMediaObject: async () => {
      runtime.storageCalls.push("remove");
      runtime.events.push("storage:remove");
      return { success: true, error: null };
    },
  };

  try {
    return await import(
      `data:text/javascript;charset=utf-8,${encodeURIComponent(
        `const deps = globalThis.${key};
const {
  canAddMediaImage,
  createMediaStoragePath,
  createClient,
  getPublicEnglishDestinationPath,
  getPublicEnglishTraditionalHousePath,
  getPublicEnglishHomestayPath,
  getPublicEnglishUmkmPath,
  getPublicEnglishCulturalEventPath,
  isMediaRecordOwnedBy,
  isMediaEntityType,
  isValidMediaUuid,
  isValidTraditionalHouseSlug,
  isValidHomestaySlug,
  isValidUmkmSlug,
  isValidCulturalEventSlug,
  logMediaStorageFailure,
  moveMediaImageToOrder,
  normalizeMediaImage,
  parseMediaRouteIdentity,
  PUBLIC_ENGLISH_DESTINATIONS_PATH,
  PUBLIC_ENGLISH_TRADITIONAL_HOUSES_PATH,
  PUBLIC_ENGLISH_HOMESTAYS_PATH,
  PUBLIC_ENGLISH_UMKMS_PATH,
  PUBLIC_ENGLISH_CULTURAL_EVENTS_PATH,
  queryDestinationById,
  queryMediaImages,
  queryMediaParentById,
  queryTraditionalHouseById,
  queryHomestayById,
  queryUmkmById,
  queryCulturalEventById,
  redirect,
  removeMediaObject,
  revalidatePath,
  requireAdministrator,
  shouldMakeMediaPrimary,
  uploadMediaObject,
  validateMediaFileField,
  validateTrustedMediaFormData,
} = deps;
${stripped}`,
      )}`
    );
  } finally {
    delete globalThis[key];
  }
}

async function invokeMedia(runtime, actionName, options = {}) {
  runtime.events = [];
  runtime.paths = [];
  runtime.calls = [];
  runtime.storageCalls = [];
  runtime.fileMode = options.fileMode ?? "metadata";
  runtime.rpcResponses = options.rpcResponses ?? new Map();

  const actions = await loadMediaActions(runtime);
  const formData = mediaActionForm(options.formOverrides ?? {});
  const image = runtime.images.find((item) => item.id === imageId) ?? null;
  const previous = mediaActionPrevious(
    runtime.entityType,
    runtime.ownerId,
    image,
  );

  try {
    const result =
      actionName === "create"
        ? await actions.createMedia(
            runtime.entityType,
            runtime.ownerId,
            previous,
            formData,
          )
        : actionName === "update"
          ? await actions.updateMedia(
              runtime.entityType,
              runtime.ownerId,
              imageId,
              previous,
              formData,
            )
          : await actions.deleteMedia(
              runtime.entityType,
              runtime.ownerId,
              imageId,
              previous,
            );
    return { result, redirectPath: null };
  } catch (error) {
    if (error?.message === "REDIRECT") {
      return { result: null, redirectPath: error.path };
    }
    throw error;
  }
}

test("Traditional House media actions execute create, metadata, primary, reorder, replacement, and delete paths", async () => {
  const createdRuntime = createMediaActionRuntime({ images: [] });
  const created = await invokeMedia(createdRuntime, "create", {
    fileMode: "create",
    formOverrides: { fileMode: "create", is_primary: "on" },
  });
  assert.ok(created.redirectPath);
  assert.deepEqual(
    createdRuntime.calls.map(({ name }) => name),
    ["media_insert"],
  );
  assert.deepEqual(createdRuntime.paths.slice(-2), [
    "/en/traditional-houses",
    `/en/traditional-houses/${TRUSTED_TRADITIONAL_HOUSE_SLUG}`,
  ]);
  assert.ok(
    createdRuntime.events.indexOf("mutation:media_insert") <
      createdRuntime.events.indexOf("revalidate:/en/traditional-houses"),
  );
  assert.ok(
    createdRuntime.events.indexOf("authorization") <
      createdRuntime.events.indexOf("owner-slug-read"),
  );
  assert.ok(
    createdRuntime.events.indexOf("owner-slug-read") <
      createdRuntime.events.indexOf("mutation:media_insert"),
  );

  const metadataRuntime = createMediaActionRuntime();
  const metadataResult = await invokeMedia(metadataRuntime, "update");
  assert.ok(metadataResult.redirectPath);
  assert.deepEqual(
    metadataRuntime.calls.map(({ name }) => name),
    ["media_update"],
  );
  assert.ok(metadataRuntime.paths.includes("/en/traditional-houses"));
  assert.ok(
    metadataRuntime.paths.includes(
      `/en/traditional-houses/${TRUSTED_TRADITIONAL_HOUSE_SLUG}`,
    ),
  );
  assert.ok(
    metadataRuntime.events.indexOf("mutation:media_update") <
      metadataRuntime.events.indexOf("revalidate:/en/traditional-houses"),
  );

  const reorderRuntime = createMediaActionRuntime({
    images: [
      mediaImage(imageId, parentId, { displayOrder: 0, isPrimary: true }),
      mediaImage(otherParentId, parentId, {
        id: "20000000-0000-4000-8000-000000000002",
        displayOrder: 1,
        isPrimary: false,
      }),
    ],
  });
  const reorderResult = await invokeMedia(reorderRuntime, "update", {
    formOverrides: { display_order: "1", is_primary: "on" },
  });
  assert.ok(reorderResult.redirectPath);
  assert.equal(reorderRuntime.calls[0].name, "media_update");
  assert.equal(reorderRuntime.calls[0].args.p_display_order, 1);
  assert.equal(reorderRuntime.calls[0].args.p_is_primary, true);
  assert.deepEqual(reorderRuntime.calls[0].args.p_image_ids, [
    "20000000-0000-4000-8000-000000000002",
    imageId,
  ]);

  const replacementRuntime = createMediaActionRuntime();
  const replacement = await invokeMedia(replacementRuntime, "update", {
    fileMode: "replacement",
    formOverrides: { fileMode: "replacement" },
  });
  assert.ok(replacement.redirectPath);
  assert.deepEqual(
    replacementRuntime.calls.map(({ name }) => name),
    ["media_replace"],
  );
  assert.ok(
    replacementRuntime.events.indexOf("mutation:media_replace") <
      replacementRuntime.events.indexOf("revalidate:/en/traditional-houses"),
  );

  const deleteRuntime = createMediaActionRuntime();
  const deleted = await invokeMedia(deleteRuntime, "delete");
  assert.ok(deleted.redirectPath);
  assert.deepEqual(
    deleteRuntime.calls.map(({ name }) => name),
    ["media_delete"],
  );
  assert.ok(deleteRuntime.paths.includes("/en/traditional-houses"));
});

test("Homestay media mutations invalidate only trusted English Homestay routes", async () => {
  const createdRuntime = createMediaActionRuntime({
    entityType: "homestay",
    images: [],
  });
  const created = await invokeMedia(createdRuntime, "create", {
    fileMode: "create",
    formOverrides: { fileMode: "create", is_primary: "on" },
  });
  assert.ok(created.redirectPath);
  assert.ok(createdRuntime.calls.some((call) => call.name === "media_insert"));
  assert.deepEqual(
    createdRuntime.paths.filter((path) => path.startsWith("/en/")),
    ["/en/homestays", "/en/homestays/homestay-karang-bajo"],
  );
  assert.ok(
    createdRuntime.events.indexOf("mutation:media_insert") <
      createdRuntime.events.indexOf("revalidate:/en/homestays"),
  );

  const updatedRuntime = createMediaActionRuntime({ entityType: "homestay" });
  const updated = await invokeMedia(updatedRuntime, "update");
  assert.ok(updated.redirectPath);
  assert.ok(updatedRuntime.calls.some((call) => call.name === "media_update"));
  assert.ok(updatedRuntime.paths.includes("/en/homestays"));
  assert.ok(
    updatedRuntime.paths.includes("/en/homestays/homestay-karang-bajo"),
  );

  const deletedRuntime = createMediaActionRuntime({ entityType: "homestay" });
  const deleted = await invokeMedia(deletedRuntime, "delete");
  assert.ok(deleted.redirectPath);
  assert.ok(deletedRuntime.calls.some((call) => call.name === "media_delete"));
  assert.ok(deletedRuntime.paths.includes("/en/homestays"));
  assert.ok(
    deletedRuntime.paths.includes("/en/homestays/homestay-karang-bajo"),
  );
  for (const runtime of [createdRuntime, updatedRuntime, deletedRuntime]) {
    assert.equal(
      runtime.paths.some((path) => path.includes("attacker")),
      false,
    );
    assert.equal(
      runtime.paths.some((path) => path.startsWith("/en/destinations")),
      false,
    );
    assert.equal(
      runtime.paths.some((path) => path.startsWith("/en/traditional-houses")),
      false,
    );
    assert.equal(
      runtime.paths.some((path) => path.startsWith("/en/cultural-events")),
      false,
    );
  }
});

test("UMKM media mutations invalidate trusted English local-business routes only after success", async () => {
  const createdRuntime = createMediaActionRuntime({
    entityType: "umkm",
    images: [],
  });
  const created = await invokeMedia(createdRuntime, "create", {
    fileMode: "create",
    formOverrides: { fileMode: "create", is_primary: "on" },
  });
  assert.ok(created.redirectPath);
  assert.deepEqual(
    createdRuntime.paths.filter((path) => path.startsWith("/en/")),
    ["/en/local-businesses", "/en/local-businesses/usaha-karang-bajo"],
  );
  assert.ok(
    createdRuntime.events.indexOf("mutation:media_insert") <
      createdRuntime.events.indexOf("revalidate:/en/local-businesses"),
  );

  const metadataRuntime = createMediaActionRuntime({ entityType: "umkm" });
  const metadataResult = await invokeMedia(metadataRuntime, "update");
  assert.ok(metadataResult.redirectPath);
  assert.ok(metadataRuntime.paths.includes("/en/local-businesses"));
  assert.ok(
    metadataRuntime.paths.includes("/en/local-businesses/usaha-karang-bajo"),
  );

  const replacementRuntime = createMediaActionRuntime({ entityType: "umkm" });
  const replacement = await invokeMedia(replacementRuntime, "update", {
    fileMode: "replacement",
    formOverrides: { fileMode: "replacement" },
  });
  assert.ok(replacement.redirectPath);
  assert.ok(
    replacementRuntime.calls.some((call) => call.name === "media_replace"),
  );
  assert.ok(replacementRuntime.paths.includes("/en/local-businesses"));

  const deletedRuntime = createMediaActionRuntime({ entityType: "umkm" });
  const deleted = await invokeMedia(deletedRuntime, "delete");
  assert.ok(deleted.redirectPath);
  assert.ok(deletedRuntime.calls.some((call) => call.name === "media_delete"));
  assert.ok(deletedRuntime.paths.includes("/en/local-businesses"));
  assert.ok(
    deletedRuntime.paths.includes("/en/local-businesses/usaha-karang-bajo"),
  );

  const failedRuntime = createMediaActionRuntime({ entityType: "umkm" });
  const failed = await invokeMedia(failedRuntime, "update", {
    rpcResponses: new Map([
      ["media_update", { data: null, error: { code: "mutation-failed" } }],
    ]),
  });
  assert.equal(failed.result.kind, "database-error");
  assert.equal(failedRuntime.paths.includes("/en/local-businesses"), false);
  assert.equal(
    failedRuntime.paths.some((path) => path.includes("usaha-karang-bajo")),
    false,
  );
});

test("failed media mutations do not revalidate English routes", async () => {
  const runtime = createMediaActionRuntime();
  const result = await invokeMedia(runtime, "update", {
    rpcResponses: new Map([
      ["media_update", { data: null, error: { code: "mutation-failed" } }],
    ]),
  });

  assert.equal(result.redirectPath, null);
  assert.equal(result.result.kind, "database-error");
  assert.equal(runtime.paths.includes("/en/traditional-houses"), false);
  assert.equal(
    runtime.paths.some((path) => path.includes(TRUSTED_TRADITIONAL_HOUSE_SLUG)),
    false,
  );
  assert.equal(runtime.events.includes("mutation:media_update"), true);
});

test("Traditional House media owner identity is trusted and read failures stop mutation safely", async () => {
  const runtime = createMediaActionRuntime();
  runtime.traditionalHouseResponse = { success: false };
  const result = await invokeMedia(runtime, "update");

  assert.equal(result.result.kind, "database-error");
  assert.deepEqual(runtime.calls, []);
  assert.deepEqual(runtime.paths, []);
  assert.equal(
    runtime.events.some((event) => event.startsWith("revalidate:")),
    false,
  );
});

test("unrelated media owners do not invalidate Traditional House English routes and Destination behavior remains intact", async () => {
  for (const entityType of [
    "homestay",
    "umkm",
    "cultural-event",
    "tourism-package",
  ]) {
    const runtime = createMediaActionRuntime({ entityType });
    const result = await invokeMedia(runtime, "update");
    assert.ok(result.redirectPath);
    assert.equal(runtime.paths.includes("/en/traditional-houses"), false);
    assert.equal(
      runtime.paths.some((path) => path.includes("/en/traditional-houses/")),
      false,
    );
  }

  const destinationRuntime = createMediaActionRuntime({
    entityType: "destination",
  });
  const destination = await invokeMedia(destinationRuntime, "update");
  assert.ok(destination.redirectPath);
  assert.ok(destinationRuntime.paths.includes("/en/destinations"));
  assert.ok(
    destinationRuntime.paths.includes(
      `/en/destinations/${TRUSTED_DESTINATION_SLUG}`,
    ),
  );
  assert.equal(
    destinationRuntime.paths.includes("/en/traditional-houses"),
    false,
  );
});
