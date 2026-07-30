import assert from "node:assert/strict";
import test from "node:test";

import {
  canAddMediaImage,
  classifyMediaDeletion,
  createMediaInitialState,
  getMediaMutationMode,
  getReplacementCompensationDecision,
  getUploadCompensationDecision,
  isMediaEntityType,
  isValidMediaUuid,
  moveMediaImageToOrder,
  shouldMakeMediaPrimary,
  validateMediaInput,
} from "../features/media/model.ts";
import {
  MEDIA_MAX_FILE_SIZE,
  createMediaStoragePath,
  signatureMatchesMime,
  validateMediaFile,
  validateMediaFileField,
} from "../features/media/file-validation.ts";

const parentId = "10000000-0000-4000-8000-000000000001";
const imageId = "20000000-0000-4000-8000-000000000001";

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
});
