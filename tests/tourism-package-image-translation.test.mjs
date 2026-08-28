import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";

import {
  createTourismPackageImageTranslationActionState,
  emptyTourismPackageImageTranslationFormValues,
  isTourismPackageImageTranslationRecord,
  validateTourismPackageImageTranslationForEligibility,
  validateTourismPackageImageTranslationForSource,
  validateTourismPackageImageTranslationInput,
} from "../features/tourism-package-image-translation/model.ts";

const read = (path) => readFileSync(path, "utf8");
const PACKAGE_ID = "10000000-0000-4000-8000-000000000001";
const IMAGE_ID = "40000000-0000-4000-8000-000000000001";
const TRANSLATION_ID = "50000000-0000-4000-8000-000000000001";
const REVISION = 4;
const TRUSTED_SLUG = "paket-jelajah-karang-bajo";

const imageSource = (overrides = {}) => ({
  id: IMAGE_ID,
  parentId: PACKAGE_ID,
  altText: "Rumah adat Karang Bajo",
  caption: "Rumah adat terlihat dari halaman utama",
  displayOrder: 0,
  isPrimary: true,
  previewUrl: "https://storage.example/signed-preview",
  ...overrides,
});

const translation = (overrides = {}) => ({
  id: TRANSLATION_ID,
  package_image_id: IMAGE_ID,
  locale: "en",
  alt_text: "Karang Bajo traditional house",
  caption: "Traditional house seen from the main courtyard",
  translation_status: "draft",
  review_state: "pending",
  captured_media_fingerprint: null,
  translation_fingerprint: null,
  contract_version: "tourism-package-media-v1",
  terminology_review_confirmed: false,
  reviewed_at: null,
  reviewed_by: null,
  review_reason: null,
  rejected_at: null,
  rejected_by: null,
  published_at: null,
  published_by: null,
  archived_at: null,
  edit_revision: REVISION,
  created_at: "2026-08-11T10:00:00.000Z",
  updated_at: "2026-08-11T10:00:00.000Z",
  created_by: "30000000-0000-4000-8000-000000000001",
  updated_by: "30000000-0000-4000-8000-000000000001",
  tourism_package_id: PACKAGE_ID,
  source_slug: TRUSTED_SLUG,
  aggregate_revision: 3,
  source_updated_at: "2026-08-11T10:00:00.000Z",
  source_status: "published",
  lifecycle_state: "draft",
  source_blocked: false,
  source_blocked_reason: null,
  stale_media_fingerprint: false,
  stale_translation_fingerprint: false,
  public_eligibility: false,
  review_eligibility: true,
  publication_eligibility: false,
  eligibility_reason: "review is required",
  ...overrides,
});

function completeInput(overrides = {}) {
  return {
    alt_text: "Karang Bajo traditional house",
    caption: "Traditional house seen from the main courtyard",
    ...overrides,
  };
}

function imageForm(
  intent,
  current,
  { input = {}, confirmation = "on", clientTranslationId } = {},
) {
  const formData = new FormData();
  formData.set("intent", intent);
  formData.set("translation_id", clientTranslationId ?? current?.id ?? "");
  formData.set("edit_revision", current ? String(current.edit_revision) : "");
  if (intent === "save-draft" || intent === "review") {
    for (const [field, value] of Object.entries(completeInput(input))) {
      formData.set(field, value);
    }
  }
  if (intent === "review")
    formData.set("terminology_review_confirmed", confirmation);
  if (intent === "reject") formData.set("rejection_reason", "Needs revision");
  return formData;
}

function nextRow(current) {
  return {
    ...(current ?? translation({ edit_revision: 0 })),
    edit_revision: (current?.edit_revision ?? 0) + 1,
  };
}

function createRuntime() {
  const runtime = {
    client: null,
    calls: [],
    events: [],
    paths: [],
    authCalls: 0,
    authorizationError: null,
    revalidationError: null,
    current: null,
    responses: [],
    query: null,
  };
  runtime.client = {
    rpc(name, args) {
      runtime.calls.push({ name, args });
      runtime.events.push(`rpc:${name}`);
      const response = runtime.responses.shift() ?? {
        data: nextRow(runtime.current),
        error: null,
      };
      const chain = {
        single() {
          return chain;
        },
        overrideTypes() {
          return Promise.resolve(response);
        },
      };
      return chain;
    },
  };
  return runtime;
}

async function loadActions(runtime) {
  const actionSource = read(
    "features/tourism-package-image-translation/actions.ts",
  )
    .replace(/^"use server";\s*/m, "")
    .replace(/import\s+[\s\S]*?from\s+["'][^"']+["'];\s*/g, "");
  const stripped = stripTypeScriptTypes(actionSource, { mode: "strip" });
  const key = `__tourismPackageImageTranslationDeps_${Math.random().toString(36).slice(2)}`;
  globalThis[key] = {
    revalidatePath: (path) => {
      runtime.paths.push(path);
      runtime.events.push(`revalidate:${path}`);
      if (runtime.revalidationError) throw runtime.revalidationError;
    },
    requireAdministrator: async () => {
      runtime.authCalls += 1;
      runtime.events.push("authorization");
      if (runtime.authorizationError) throw runtime.authorizationError;
      return { id: "database-derived-admin" };
    },
    createClient: async () => runtime.client,
    isValidTourismPackageId: (value) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
      ),
    isValidMediaUuid: (value) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
      ),
    queryTourismPackageImageTranslationAdminData: (...args) =>
      runtime.query(...args),
    createTourismPackageImageTranslationActionState,
    validateTourismPackageImageTranslationForEligibility,
    validateTourismPackageImageTranslationForSource,
    validateTourismPackageImageTranslationFormData: (formData) => {
      const input = {};
      for (const field of new Set(formData.keys())) {
        const values = formData.getAll(field);
        input[field] = values.length === 1 ? values[0] : values;
      }
      return validateTourismPackageImageTranslationInput(input);
    },
  };
  try {
    return await import(
      `data:text/javascript;charset=utf-8,${encodeURIComponent(`
const deps = globalThis.${key};
const { revalidatePath, requireAdministrator, createClient,
  isValidTourismPackageId, isValidMediaUuid,
  queryTourismPackageImageTranslationAdminData,
  createTourismPackageImageTranslationActionState,
  validateTourismPackageImageTranslationForEligibility,
  validateTourismPackageImageTranslationForSource,
  validateTourismPackageImageTranslationFormData } = deps;
${stripped}`)}`
    );
  } finally {
    delete globalThis[key];
  }
}

const runtime = createRuntime();
const actions = loadActions(runtime);

const dataImage = (overrides = {}) => ({
  id: IMAGE_ID,
  package_id: PACKAGE_ID,
  storage_bucket: "tourism-media",
  storage_path: `tourism-package/${PACKAGE_ID}/${IMAGE_ID}.webp`,
  caption: "Rumah adat terlihat dari halaman utama",
  alt_text: "Rumah adat Karang Bajo",
  display_order: 0,
  is_primary: true,
  created_at: "2026-08-11T10:00:00.000Z",
  ...overrides,
});

const imageHistoryEvent = (overrides = {}) => ({
  id: "60000000-0000-4000-8000-000000000001",
  event_type: "draft_saved",
  previous_translation_status: "draft",
  new_translation_status: "draft",
  previous_review_state: "pending",
  new_review_state: "pending",
  occurred_at: "2026-08-11T10:00:00.000Z",
  reason: null,
  actor_id: "30000000-0000-4000-8000-000000000001",
  binary_revision: 2,
  media_fingerprint: "private-media-fingerprint",
  translation_fingerprint: "private-translation-fingerprint",
  terminology_review_confirmed: false,
  ...overrides,
});

function createImageDataRuntime() {
  const primary = dataImage();
  const galleryId = "40000000-0000-4000-8000-000000000002";
  const gallery = dataImage({
    id: galleryId,
    storage_path: `tourism-package/${PACKAGE_ID}/${galleryId}.jpg`,
    display_order: 1,
    is_primary: false,
  });
  const dataRuntime = {
    packageResult: {
      success: true,
      tourismPackage: {
        id: PACKAGE_ID,
        slug: TRUSTED_SLUG,
        status: "published",
      },
    },
    sourceRows: [primary, gallery],
    sourceError: null,
    translationRows: new Map([
      [IMAGE_ID, [translation()]],
      [galleryId, []],
    ]),
    translationErrors: new Map(),
    historyRows: new Map([[TRANSLATION_ID, [imageHistoryEvent()]]]),
    historyErrors: new Map(),
    previewError: null,
    previewReturnsNull: false,
    queryError: null,
    calls: [],
    previewCalls: [],
  };
  dataRuntime.client = {
    from(table) {
      dataRuntime.calls.push({ kind: "from", table });
      const chain = {
        select(columns) {
          dataRuntime.calls.push({ kind: "select", columns });
          return chain;
        },
        eq(column, value) {
          dataRuntime.calls.push({ kind: "eq", column, value });
          return chain;
        },
        order(column, options) {
          dataRuntime.calls.push({ kind: "order", column, options });
          return chain;
        },
        overrideTypes() {
          return Promise.resolve({
            data: dataRuntime.sourceRows,
            error: dataRuntime.sourceError,
          });
        },
      };
      return chain;
    },
    rpc(name, args) {
      dataRuntime.calls.push({ kind: "rpc", name, args });
      return {
        returns() {
          if (name === "tourism_package_image_translation_admin_read") {
            return Promise.resolve({
              data: dataRuntime.translationRows.get(args.p_package_image_id),
              error:
                dataRuntime.translationErrors.get(args.p_package_image_id) ??
                null,
            });
          }
          return Promise.resolve({
            data: dataRuntime.historyRows.get(args.p_translation_id),
            error: dataRuntime.historyErrors.get(args.p_translation_id) ?? null,
          });
        },
      };
    },
  };
  return dataRuntime;
}

async function loadImageData(dataRuntime) {
  const dataSource = read(
    "features/tourism-package-image-translation/data.ts",
  ).replace(/import\s+[\s\S]*?from\s+["'][^"']+["'];\s*/g, "");
  const stripped = stripTypeScriptTypes(dataSource, { mode: "strip" });
  const key = `__tourismPackageImageTranslationDataDeps_${Math.random().toString(36).slice(2)}`;
  globalThis[key] = {
    requireAdministrator: async () => ({ id: "database-derived-admin" }),
    createClient: async () => dataRuntime.client,
    isValidMediaUuid: (value) =>
      typeof value === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
      ),
    MEDIA_BUCKET: "tourism-media",
    createAdministratorPreviewUrl: async (_supabase, path) => {
      dataRuntime.previewCalls.push(path);
      if (dataRuntime.previewError) throw dataRuntime.previewError;
      if (dataRuntime.previewReturnsNull) return null;
      return `https://storage.example/${path}`;
    },
    queryTourismPackageById: () => {
      if (dataRuntime.queryError) throw dataRuntime.queryError;
      return dataRuntime.packageResult;
    },
    isValidTourismPackageId: (value) =>
      typeof value === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
      ),
    isTourismPackageImageTranslationRecord,
  };
  try {
    return await import(
      `data:text/javascript;charset=utf-8,${encodeURIComponent(`
const deps = globalThis.${key};
const { requireAdministrator, createClient, isValidMediaUuid, MEDIA_BUCKET,
  createAdministratorPreviewUrl, queryTourismPackageById,
  isValidTourismPackageId, isTourismPackageImageTranslationRecord } = deps;
${stripped}`)}`
    );
  } finally {
    delete globalThis[key];
  }
}

const imageDataRuntime = createImageDataRuntime();
const imageData = loadImageData(imageDataRuntime);

async function invoke({
  intent,
  current = translation(),
  trustedImage = imageSource(),
  refreshed,
  input,
  confirmation = "on",
  denyAuthorization = false,
  responses = [],
  revalidationError = false,
  clientTranslationId,
} = {}) {
  runtime.calls = [];
  runtime.events = [];
  runtime.paths = [];
  runtime.authCalls = 0;
  runtime.current = current;
  runtime.responses = [...responses];
  runtime.authorizationError = denyAuthorization
    ? new Error("administrator authorization required")
    : null;
  runtime.revalidationError = revalidationError
    ? new Error("cache revalidation failed")
    : null;
  let readCount = 0;
  runtime.query = async (supabase, id) => {
    assert.equal(supabase, runtime.client);
    assert.equal(id, PACKAGE_ID);
    readCount += 1;
    runtime.events.push(
      readCount === 1 ? "authoritative-read" : "post-mutation-refresh",
    );
    if (readCount === 1) {
      return {
        success: true,
        tourismPackageId: PACKAGE_ID,
        slug: TRUSTED_SLUG,
        images: [
          {
            source: trustedImage,
            sourceStatus: "published",
            translation: current,
            history: [],
          },
        ],
      };
    }
    return (
      refreshed ?? {
        success: true,
        tourismPackageId: PACKAGE_ID,
        slug: TRUSTED_SLUG,
        images: [
          {
            source: trustedImage,
            sourceStatus: "published",
            translation: current,
            history: [],
          },
        ],
      }
    );
  };
  const initial = createTourismPackageImageTranslationActionState(
    trustedImage,
    current,
  );
  const action = (await actions).manageTourismPackageImageTranslation;
  const result = await action(
    PACKAGE_ID,
    IMAGE_ID,
    initial,
    imageForm(intent, current, {
      input,
      confirmation,
      clientTranslationId,
    }),
  );
  return {
    result,
    calls: runtime.calls,
    events: runtime.events,
    paths: runtime.paths,
    authCalls: runtime.authCalls,
  };
}

test("image translation model starts empty and never copies source alt or caption", () => {
  assert.deepEqual(emptyTourismPackageImageTranslationFormValues(), {
    alt_text: "",
    caption: "",
  });
  assert.notEqual(
    emptyTourismPackageImageTranslationFormValues().alt_text,
    imageSource().altText,
  );
  assert.notEqual(
    emptyTourismPackageImageTranslationFormValues().caption,
    imageSource().caption,
  );
});

test("image validation rejects blank alt and invented caption but normalizes optional caption", () => {
  const blankAlt = validateTourismPackageImageTranslationInput(
    completeInput({ alt_text: " " }),
  );
  assert.equal(blankAlt.success, true);
  if (!blankAlt.success) return;
  assert.equal(
    validateTourismPackageImageTranslationForEligibility(
      imageSource(),
      blankAlt.data,
      "published",
    ).success,
    false,
  );

  const inventedCaption = validateTourismPackageImageTranslationInput(
    completeInput({ caption: "Invented context" }),
  );
  assert.equal(inventedCaption.success, true);
  if (!inventedCaption.success) return;
  assert.equal(
    validateTourismPackageImageTranslationForSource(
      imageSource({ caption: null }),
      inventedCaption.data,
    ).success,
    false,
  );
  const noCaption = validateTourismPackageImageTranslationInput(
    completeInput({ caption: "\t" }),
  );
  assert.equal(noCaption.success, true);
  if (!noCaption.success) return;
  assert.equal(noCaption.data.caption, null);
});

test("malformed image translation DB payload fails closed", () => {
  assert.equal(isTourismPackageImageTranslationRecord({ id: IMAGE_ID }), false);
});

test("all image lifecycle intents use exact RPCs, revisions, IDs, and admin-only revalidation", async () => {
  const cases = {
    "save-draft": translation(),
    review: translation(),
    reject: translation(),
    publish: translation({
      review_state: "reviewed",
      lifecycle_state: "reviewed",
      publication_eligibility: true,
    }),
    republish: translation({
      translation_status: "published",
      review_state: "reviewed",
      published_at: "2026-08-11T10:00:00.000Z",
      lifecycle_state: "published",
      publication_eligibility: true,
    }),
    archive: translation({
      translation_status: "published",
      review_state: "reviewed",
      published_at: "2026-08-11T10:00:00.000Z",
      lifecycle_state: "published",
    }),
    unpublish: translation({
      translation_status: "published",
      review_state: "reviewed",
      published_at: "2026-08-11T10:00:00.000Z",
      lifecycle_state: "published",
    }),
    restore: translation({
      translation_status: "archived",
      published_at: "2026-08-11T10:00:00.000Z",
      lifecycle_state: "archived",
    }),
  };
  const expected = {
    "save-draft": ["tourism_package_image_translation_save_draft"],
    review: [
      "tourism_package_image_translation_save_draft",
      "tourism_package_image_translation_review",
    ],
    reject: ["tourism_package_image_translation_reject"],
    publish: ["tourism_package_image_translation_publish"],
    republish: ["tourism_package_image_translation_republish"],
    archive: ["tourism_package_image_translation_archive"],
    unpublish: ["tourism_package_image_translation_unpublish"],
    restore: ["tourism_package_image_translation_restore"],
  };
  for (const [intent, current] of Object.entries(cases)) {
    const invocation = await invoke({ intent, current });
    assert.equal(invocation.authCalls, 1, intent);
    assert.deepEqual(
      invocation.calls.map((call) => call.name),
      expected[intent],
      intent,
    );
    for (const call of invocation.calls) {
      assert.equal("p_actor" in call.args, false, intent);
      assert.equal("p_storage_bucket" in call.args, false, intent);
      assert.equal("p_storage_path" in call.args, false, intent);
      assert.equal("p_media_fingerprint" in call.args, false, intent);
      assert.equal("p_binary_revision" in call.args, false, intent);
    }
    assert.deepEqual(invocation.paths, [
      "/admin/paket-wisata",
      `/admin/paket-wisata/${PACKAGE_ID}/edit`,
    ]);
    if (intent === "save-draft" || intent === "review") {
      assert.deepEqual(invocation.calls[0].args, {
        p_package_image_id: IMAGE_ID,
        p_expected_edit_revision: REVISION,
        p_alt_text: "Karang Bajo traditional house",
        p_caption: "Traditional house seen from the main courtyard",
      });
    } else if (intent === "reject") {
      assert.deepEqual(invocation.calls[0].args, {
        p_translation_id: TRANSLATION_ID,
        p_expected_edit_revision: REVISION,
        p_reason: "Needs revision",
      });
    } else {
      assert.deepEqual(invocation.calls[0].args, {
        p_translation_id: TRANSLATION_ID,
        p_expected_edit_revision: REVISION,
      });
    }
  }
});

test("authorization failure aborts image lifecycle before read or RPC", async () => {
  await assert.rejects(
    () => invoke({ intent: "save-draft", denyAuthorization: true }),
    /administrator authorization required/,
  );
  assert.equal(runtime.authCalls, 1);
  assert.deepEqual(runtime.events, ["authorization"]);
  assert.deepEqual(runtime.calls, []);
  assert.deepEqual(runtime.paths, []);
});

test("successful image mutation remains semantic success when post-read fails", async () => {
  const invocation = await invoke({
    intent: "save-draft",
    refreshed: { success: false, kind: "read-error" },
  });
  assert.equal(invocation.result.kind, "success");
  assert.match(invocation.result.message, /Perubahan tersimpan/);
  assert.deepEqual(invocation.paths, [
    "/admin/paket-wisata",
    `/admin/paket-wisata/${PACKAGE_ID}/edit`,
  ]);
});

test("image mutation remains semantic success when admin revalidation throws", async () => {
  const invocation = await invoke({
    intent: "save-draft",
    revalidationError: true,
  });
  assert.equal(invocation.result.kind, "success");
  assert.match(invocation.result.message, /Cache admin belum diperbarui/);
  assert.deepEqual(invocation.paths, [
    "/admin/paket-wisata",
    `/admin/paket-wisata/${PACKAGE_ID}/edit`,
  ]);
});

test("image DB revision remains the final TOCTOU authority", async () => {
  const invocation = await invoke({
    intent: "save-draft",
    responses: [{ data: null, error: { code: "55000" } }],
  });
  assert.equal(invocation.result.kind, "conflict");
  assert.equal(invocation.calls.length, 1);
  assert.equal(invocation.calls[0].args.p_expected_edit_revision, REVISION);
  assert.deepEqual(invocation.paths, []);
});

test("image translation ID is bound to the package image before mutation", async () => {
  const invocation = await invoke({
    intent: "save-draft",
    clientTranslationId: "50000000-0000-4000-8000-000000000099",
  });
  assert.equal(invocation.result.kind, "conflict");
  assert.deepEqual(invocation.calls, []);
  assert.deepEqual(invocation.paths, []);
});

test("image composite review preserves partial save semantics", async () => {
  const invocation = await invoke({
    intent: "review",
    responses: [
      { data: nextRow(translation()), error: null },
      { data: null, error: { code: "55000" } },
    ],
  });
  assert.equal(invocation.result.kind, "database-error");
  assert.match(invocation.result.message, /Draf tersimpan/);
  assert.deepEqual(
    invocation.calls.map((call) => call.name),
    [
      "tourism_package_image_translation_save_draft",
      "tourism_package_image_translation_review",
    ],
  );
  assert.deepEqual(invocation.paths, [
    "/admin/paket-wisata",
    `/admin/paket-wisata/${PACKAGE_ID}/edit`,
  ]);
});

test("image composite review stops after a failed save", async () => {
  const invocation = await invoke({
    intent: "review",
    responses: [{ data: null, error: { code: "23514" } }],
  });
  assert.equal(invocation.result.kind, "validation-error");
  assert.deepEqual(
    invocation.calls.map((call) => call.name),
    ["tourism_package_image_translation_save_draft"],
  );
  assert.deepEqual(invocation.paths, []);
});

test("image admin data reads trusted source media and strips private history fields", async () => {
  const loader = await imageData;
  const result = await loader.queryTourismPackageImageTranslationAdminData(
    imageDataRuntime.client,
    PACKAGE_ID,
  );
  assert.equal(result.success, true);
  if (!result.success) return;
  assert.equal(result.images.length, 2);
  assert.equal(
    result.images[0].source.previewUrl,
    `https://storage.example/tourism-package/${PACKAGE_ID}/${IMAGE_ID}.webp`,
  );
  assert.equal(result.images[0].translation?.id, TRANSLATION_ID);
  assert.equal(result.images[1].translation, null);
  assert.deepEqual(result.images[0].history, [
    {
      id: "60000000-0000-4000-8000-000000000001",
      event_type: "draft_saved",
      previous_translation_status: "draft",
      new_translation_status: "draft",
      previous_review_state: "pending",
      new_review_state: "pending",
      occurred_at: "2026-08-11T10:00:00.000Z",
      reason: null,
    },
  ]);
  assert.equal("actor_id" in result.images[0].history[0], false);
  assert.deepEqual(
    imageDataRuntime.calls
      .filter((call) => call.kind === "rpc")
      .map((call) => call.name),
    [
      "tourism_package_image_translation_admin_read",
      "tourism_package_image_translation_admin_read",
      "tourism_package_image_translation_review_history",
    ],
  );
  assert.deepEqual(
    imageDataRuntime.calls.find((call) => call.kind === "from"),
    { kind: "from", table: "package_images" },
  );
});

test("image admin data fails closed for missing source, malformed media, duplicate primary, query, history, and signer errors", async () => {
  const loader = await imageData;
  imageDataRuntime.packageResult = {
    success: true,
    tourismPackage: null,
  };
  assert.deepEqual(
    await loader.queryTourismPackageImageTranslationAdminData(
      imageDataRuntime.client,
      PACKAGE_ID,
    ),
    { success: false, kind: "not-found" },
  );

  imageDataRuntime.packageResult = {
    success: true,
    tourismPackage: { id: PACKAGE_ID, slug: TRUSTED_SLUG, status: "published" },
  };
  imageDataRuntime.sourceRows = [
    dataImage({ storage_path: "arbitrary/path.webp" }),
  ];
  imageDataRuntime.previewCalls = [];
  assert.deepEqual(
    await loader.queryTourismPackageImageTranslationAdminData(
      imageDataRuntime.client,
      PACKAGE_ID,
    ),
    { success: false, kind: "read-error" },
  );
  assert.deepEqual(imageDataRuntime.previewCalls, []);

  imageDataRuntime.sourceRows = [
    dataImage({
      package_id: "10000000-0000-4000-8000-000000000099",
    }),
  ];
  imageDataRuntime.previewCalls = [];
  assert.deepEqual(
    await loader.queryTourismPackageImageTranslationAdminData(
      imageDataRuntime.client,
      PACKAGE_ID,
    ),
    { success: false, kind: "read-error" },
  );
  assert.deepEqual(imageDataRuntime.previewCalls, []);

  imageDataRuntime.sourceRows = [dataImage({ storage_bucket: "public" })];
  assert.deepEqual(
    await loader.queryTourismPackageImageTranslationAdminData(
      imageDataRuntime.client,
      PACKAGE_ID,
    ),
    { success: false, kind: "read-error" },
  );

  imageDataRuntime.sourceRows = [
    dataImage({
      id: "not-a-uuid",
      storage_path: `tourism-package/${PACKAGE_ID}/not-a-uuid.webp`,
    }),
  ];
  assert.deepEqual(
    await loader.queryTourismPackageImageTranslationAdminData(
      imageDataRuntime.client,
      PACKAGE_ID,
    ),
    { success: false, kind: "read-error" },
  );

  imageDataRuntime.sourceRows = [];
  const missingImage =
    await loader.queryTourismPackageImageTranslationAdminData(
      imageDataRuntime.client,
      PACKAGE_ID,
    );
  assert.equal(missingImage.success, true);
  if (missingImage.success) assert.deepEqual(missingImage.images, []);

  imageDataRuntime.sourceRows = [dataImage()];
  imageDataRuntime.previewReturnsNull = true;
  const unavailablePreview =
    await loader.queryTourismPackageImageTranslationAdminData(
      imageDataRuntime.client,
      PACKAGE_ID,
    );
  assert.equal(unavailablePreview.success, true);
  if (unavailablePreview.success) {
    assert.equal(unavailablePreview.images[0].source.previewUrl, null);
  }
  imageDataRuntime.previewReturnsNull = false;

  imageDataRuntime.sourceRows = [
    dataImage(),
    dataImage({
      id: "40000000-0000-4000-8000-000000000002",
      storage_path: `tourism-package/${PACKAGE_ID}/40000000-0000-4000-8000-000000000002.jpg`,
      display_order: 1,
    }),
  ];
  assert.deepEqual(
    await loader.queryTourismPackageImageTranslationAdminData(
      imageDataRuntime.client,
      PACKAGE_ID,
    ),
    { success: false, kind: "read-error" },
  );

  imageDataRuntime.sourceRows = [dataImage()];
  imageDataRuntime.sourceError = { code: "query-failed" };
  assert.deepEqual(
    await loader.queryTourismPackageImageTranslationAdminData(
      imageDataRuntime.client,
      PACKAGE_ID,
    ),
    { success: false, kind: "read-error" },
  );
  imageDataRuntime.sourceError = null;

  imageDataRuntime.translationRows.set(IMAGE_ID, { malformed: true });
  assert.deepEqual(
    await loader.queryTourismPackageImageTranslationAdminData(
      imageDataRuntime.client,
      PACKAGE_ID,
    ),
    { success: false, kind: "read-error" },
  );
  imageDataRuntime.translationRows.set(IMAGE_ID, [translation()]);

  imageDataRuntime.historyRows.set(TRANSLATION_ID, [
    imageHistoryEvent({ actor_id: "not-exposed", reason: "unexpected" }),
  ]);
  assert.deepEqual(
    await loader.queryTourismPackageImageTranslationAdminData(
      imageDataRuntime.client,
      PACKAGE_ID,
    ),
    { success: false, kind: "read-error" },
  );
  imageDataRuntime.historyRows.set(TRANSLATION_ID, [imageHistoryEvent()]);

  imageDataRuntime.previewError = new Error("signing failed");
  assert.deepEqual(
    await loader.queryTourismPackageImageTranslationAdminData(
      imageDataRuntime.client,
      PACKAGE_ID,
    ),
    { success: false, kind: "read-error" },
  );
  imageDataRuntime.previewError = null;

  imageDataRuntime.queryError = new Error("package query rejected");
  assert.deepEqual(
    await loader.queryTourismPackageImageTranslationAdminData(
      imageDataRuntime.client,
      PACKAGE_ID,
    ),
    { success: false, kind: "read-error" },
  );
  imageDataRuntime.queryError = null;
});

test("image translation feature is RPC-only and has no source media controls", () => {
  const featureSource = [
    "features/tourism-package-image-translation/actions.ts",
    "features/tourism-package-image-translation/data.ts",
    "features/tourism-package-image-translation/model.ts",
    "features/tourism-package-image-translation/tourism-package-image-translation-form.tsx",
  ]
    .map(read)
    .join("\n");
  assert.doesNotMatch(featureSource, /tourism_package_image_translations/);
  assert.doesNotMatch(
    featureSource,
    /package_images\"\)\.(?:insert|update|delete)/,
  );
  assert.match(featureSource, /tourism_package_image_translation_admin_read/);
  assert.match(
    featureSource,
    /tourism_package_image_translation_review_history/,
  );
  assert.doesNotMatch(
    featureSource,
    /manageMedia|uploadMediaObject|removeMediaObject/,
  );
  assert.doesNotMatch(
    featureSource,
    /name=\"(?:storage_bucket|storage_path|is_primary|display_order)\"/,
  );
  assert.doesNotMatch(featureSource, /revalidatePublicDomain/);
  assert.match(featureSource, /package_images/);
  assert.match(featureSource, /tourism-package\/\$\{tourismPackageId\}/);
  assert.doesNotMatch(featureSource, /storage\.from\([^)]*\)\.getPublicUrl/);
});
