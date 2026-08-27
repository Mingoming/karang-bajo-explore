import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";
import { createPublicRevalidationMock } from "./public-revalidation-test-helpers.mjs";

import {
  createHomestayImageTranslationActionState,
  emptyHomestayImageTranslationFormValues,
  getHomestayImageTranslationLifecycleLabel,
  validateHomestayImageTranslationForEligibility,
  validateHomestayImageTranslationForSource,
  validateHomestayImageTranslationInput,
} from "../features/homestay-image-translation/model.ts";
import { isValidHomestayId } from "../features/homestays/model.ts";

const read = (path) => readFileSync(path, "utf8");
const HOMESTAY_ID = "10000000-0000-4000-8000-000000000001";
const IMAGE_ID = "30000000-0000-4000-8000-000000000001";
const TRANSLATION_ID = "40000000-0000-4000-8000-000000000001";
const REVISION = 3;
const TRUSTED_SLUG = "homestay-karang-bajo";

const image = (overrides = {}) => ({
  id: IMAGE_ID,
  parentId: HOMESTAY_ID,
  altText: "Alt sumber",
  caption: "Caption sumber",
  displayOrder: 0,
  isPrimary: true,
  previewUrl: null,
  ...overrides,
});

const translation = (overrides = {}) => ({
  id: TRANSLATION_ID,
  homestay_image_id: IMAGE_ID,
  locale: "en",
  alt_text: "Approved English alt",
  caption: "Approved English caption",
  translation_status: "draft",
  review_state: "pending",
  published_at: null,
  edit_revision: REVISION,
  homestay_id: HOMESTAY_ID,
  source_slug: TRUSTED_SLUG,
  source_revision: 2,
  source_updated_at: "2026-08-11T10:00:00.000Z",
  source_status: "published",
  lifecycle_state: "draft",
  public_eligibility: false,
  review_eligibility: true,
  publication_eligibility: false,
  eligibility_reason: "review is required",
  ...overrides,
});

function imageForm(
  intent,
  current,
  { input = {}, confirmation = "on", clientSlug } = {},
) {
  const formData = new FormData();
  formData.set("intent", intent);
  formData.set("translation_id", current?.id ?? "");
  formData.set("edit_revision", current ? String(current.edit_revision) : "");
  if (intent === "save-draft" || intent === "review") {
    formData.set("alt_text", input.alt_text ?? "Approved English alt");
    formData.set("caption", input.caption ?? "Approved English caption");
  }
  if (intent === "review")
    formData.set("terminology_review_confirmed", confirmation);
  if (intent === "reject") formData.set("rejection_reason", "Needs revision");
  if (clientSlug) formData.set("slug", clientSlug);
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
    current: null,
    refresh: null,
    responses: [],
    query: null,
    mediaCalls: [],
    storageCalls: [],
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
    from(table) {
      runtime.mediaCalls.push(table);
      throw new Error("unexpected generic media access");
    },
    storage: {
      from(bucket) {
        runtime.storageCalls.push(bucket);
        throw new Error("unexpected Storage access");
      },
    },
  };
  return runtime;
}

async function loadActions(runtime) {
  const actionSource = read("features/homestay-image-translation/actions.ts")
    .replace(/^"use server";\s*/m, "")
    .replace(/import\s+[\s\S]*?from\s+["'][^"']+["'];\s*/g, "");
  const stripped = stripTypeScriptTypes(actionSource, { mode: "strip" });
  const key = `__homestayImageTranslationDeps_${Math.random().toString(36).slice(2)}`;
  globalThis[key] = {
    ...createPublicRevalidationMock(runtime),
    revalidatePath: (path) => {
      runtime.paths.push(path);
      runtime.events.push(`revalidate:${path}`);
    },
    requireAdministrator: async () => {
      runtime.authCalls += 1;
      runtime.events.push("authorization");
      if (runtime.authorizationError) throw runtime.authorizationError;
      return { id: "database-derived-admin" };
    },
    createClient: async () => runtime.client,
    isValidHomestayId,
    queryHomestayImageTranslationAdminData: (...args) => runtime.query(...args),
    createHomestayImageTranslationActionState,
    validateHomestayImageTranslationForEligibility,
    validateHomestayImageTranslationForSource,
    validateHomestayImageTranslationFormData: (formData) => {
      const input = {};
      for (const field of new Set(formData.keys())) {
        const values = formData.getAll(field);
        input[field] = values.length === 1 ? values[0] : values;
      }
      return validateHomestayImageTranslationInput(input);
    },
  };
  try {
    return await import(
      `data:text/javascript;charset=utf-8,${encodeURIComponent(`
const deps = globalThis.${key};
const { revalidatePublicDomainPaths, revalidatePublicDomainDetailPaths,
  revalidatePath, requireAdministrator, createClient, isValidHomestayId,
  queryHomestayImageTranslationAdminData, createHomestayImageTranslationActionState,
  validateHomestayImageTranslationForEligibility, validateHomestayImageTranslationForSource,
  validateHomestayImageTranslationFormData } = deps;
${stripped}`)}`
    );
  } finally {
    delete globalThis[key];
  }
}

const runtime = createRuntime();
const actions = loadActions(runtime);

async function invoke({
  intent,
  current = translation(),
  trustedImage = image(),
  refreshed,
  input,
  sourceStatus = "published",
  confirmation = "on",
  clientSlug,
  requestedImageId = IMAGE_ID,
  responses = [],
  denyAuthorization = false,
} = {}) {
  runtime.calls = [];
  runtime.events = [];
  runtime.paths = [];
  runtime.authCalls = 0;
  runtime.mediaCalls = [];
  runtime.storageCalls = [];
  runtime.current = current;
  runtime.responses = [...responses];
  runtime.authorizationError = denyAuthorization
    ? new Error("administrator authorization required")
    : null;
  let readCount = 0;
  runtime.query = async (supabase, id) => {
    assert.equal(supabase, runtime.client);
    assert.equal(id, HOMESTAY_ID);
    readCount += 1;
    runtime.events.push(
      readCount === 1 ? "authoritative-read" : "post-mutation-refresh",
    );
    const currentImage = {
      source: trustedImage,
      sourceStatus,
      translation: current,
      history: [],
    };
    if (readCount === 1) {
      return {
        success: true,
        homestayId: HOMESTAY_ID,
        slug: TRUSTED_SLUG,
        images: [currentImage],
      };
    }
    return (
      refreshed ?? {
        success: true,
        homestayId: HOMESTAY_ID,
        slug: TRUSTED_SLUG,
        images: [currentImage],
      }
    );
  };
  const initial = createHomestayImageTranslationActionState(
    trustedImage,
    current,
    [],
    { sourceStatus },
  );
  const action = (await actions).manageHomestayImageTranslation;
  const result = await action(
    HOMESTAY_ID,
    requestedImageId,
    initial,
    imageForm(intent, current, { input, confirmation, clientSlug }),
  );
  return {
    result,
    calls: runtime.calls,
    events: runtime.events,
    paths: runtime.paths,
    authCalls: runtime.authCalls,
    mediaCalls: runtime.mediaCalls,
    storageCalls: runtime.storageCalls,
  };
}

test("Homestay image translation starts empty and never falls back to source alt text", () => {
  assert.deepEqual(emptyHomestayImageTranslationFormValues(), {
    alt_text: "",
    caption: "",
  });
  assert.notEqual(
    emptyHomestayImageTranslationFormValues().alt_text,
    image().altText,
  );
});

test("source-empty image captions preserve empty values and reject invented captions", () => {
  for (const sourceCaption of [null, "", "   "]) {
    const empty = validateHomestayImageTranslationInput({
      alt_text: "English alt",
      caption: "",
    });
    assert.equal(empty.success, true);
    if (!empty.success) continue;
    assert.equal(
      validateHomestayImageTranslationForSource(
        image({ caption: sourceCaption }),
        empty.data,
      ).success,
      true,
    );
    const invented = validateHomestayImageTranslationInput({
      alt_text: "English alt",
      caption: "Invented caption",
    });
    assert.equal(invented.success, true);
    if (!invented.success) continue;
    assert.equal(
      validateHomestayImageTranslationForSource(
        image({ caption: sourceCaption }),
        invented.data,
      ).success,
      false,
    );
  }
});

test("primary English alt is required while optional gallery images remain independently valid", () => {
  const blank = validateHomestayImageTranslationInput({
    alt_text: "   ",
    caption: "",
  });
  assert.equal(blank.success, true);
  if (!blank.success) return;
  const primary = validateHomestayImageTranslationForEligibility(
    image(),
    blank.data,
    "published",
  );
  assert.equal(primary.success, false);
  assert.match(primary.fieldErrors.alt_text ?? "", /wajib diisi/);
  const gallery = validateHomestayImageTranslationForEligibility(
    image({ isPrimary: false, caption: null }),
    { alt_text: "Gallery alt", caption: null },
    "published",
  );
  assert.equal(gallery.success, true);
});

test("Homestay image lifecycle presentation is database-state driven", () => {
  for (const [state, label] of [
    ["draft", "Draft"],
    ["reviewed", "Reviewed"],
    ["published", "Published"],
    ["stale", "Stale"],
    ["archived", "Archived"],
    ["source-blocked", "Source blocked"],
  ]) {
    const value = createHomestayImageTranslationActionState(
      image(),
      translation({ lifecycle_state: state }),
      [],
      { sourceStatus: "published" },
    );
    assert.equal(value.lifecycleState, state);
    assert.equal(
      getHomestayImageTranslationLifecycleLabel(value.lifecycleState),
      label,
    );
  }
  assert.match(
    read(
      "features/homestay-image-translation/homestay-image-translation-form.tsx",
    ),
    /Kirim untuk review/,
  );
});

test("all Homestay image lifecycle intents use exact RPCs, IDs, revisions, and no actor authority", async () => {
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
    "save-draft": ["homestay_image_translation_save_draft"],
    review: [
      "homestay_image_translation_save_draft",
      "homestay_image_translation_review",
    ],
    reject: ["homestay_image_translation_reject"],
    publish: ["homestay_image_translation_publish"],
    republish: ["homestay_image_translation_republish"],
    archive: ["homestay_image_translation_archive"],
    unpublish: ["homestay_image_translation_unpublish"],
    restore: ["homestay_image_translation_restore"],
  };
  for (const [intent, current] of Object.entries(cases)) {
    const invocation = await invoke({ intent, current });
    assert.equal(invocation.authCalls, 1, intent);
    assert.deepEqual(
      invocation.calls.map((call) => call.name),
      expected[intent],
      intent,
    );
    assert.equal(
      invocation.calls[0].args.p_expected_edit_revision,
      REVISION,
      intent,
    );
    for (const call of invocation.calls) {
      assert.equal("p_actor" in call.args, false, intent);
      assert.equal("p_slug" in call.args, false, intent);
      assert.equal("p_primary" in call.args, false, intent);
      assert.equal("p_source_revision" in call.args, false, intent);
      assert.equal("p_media_fingerprint" in call.args, false, intent);
    }
    if (intent === "save-draft" || intent === "review") {
      assert.deepEqual(invocation.calls[0].args, {
        p_homestay_image_id: IMAGE_ID,
        p_expected_edit_revision: REVISION,
        p_alt_text: "Approved English alt",
        p_caption: "Approved English caption",
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
    if (intent === "review") {
      assert.deepEqual(invocation.calls[1].args, {
        p_translation_id: TRANSLATION_ID,
        p_expected_edit_revision: REVISION + 1,
        p_terminology_review_confirmed: true,
      });
    }
    assert.deepEqual(invocation.paths, [
      "/admin/homestay",
      `/admin/homestay/${HOMESTAY_ID}/edit`,
      "/homestay",
      "/en/homestays",
      "/en",
      "/en/tourism-map",
      `/homestay/${TRUSTED_SLUG}`,
      `/en/homestays/${TRUSTED_SLUG}`,
    ]);
  }
});

test("authorization failure aborts all eight image intents before reads, RPCs, or revalidation", async () => {
  for (const intent of [
    "save-draft",
    "review",
    "reject",
    "publish",
    "republish",
    "archive",
    "unpublish",
    "restore",
  ]) {
    await assert.rejects(
      () => invoke({ intent, denyAuthorization: true }),
      /administrator authorization required/,
    );
    assert.equal(runtime.authCalls, 1, intent);
    assert.deepEqual(runtime.events, ["authorization"], intent);
    assert.deepEqual(runtime.calls, [], intent);
    assert.deepEqual(runtime.paths, [], intent);
  }
});

test("real image action rejects invented source-empty captions and accepts an empty caption", async () => {
  for (const sourceCaption of [null, "", "   "]) {
    const rejected = await invoke({
      intent: "save-draft",
      trustedImage: image({ caption: sourceCaption }),
      input: { caption: "Invented English caption" },
    });
    assert.equal(rejected.result.kind, "validation-error", sourceCaption);
    assert.deepEqual(rejected.calls, [], sourceCaption);
  }
  const allowed = await invoke({
    intent: "save-draft",
    trustedImage: image({ caption: null }),
    input: { caption: "" },
  });
  assert.equal(allowed.result.kind, "success");
  assert.equal(allowed.calls[0].args.p_caption, null);
});

test("image action performs mutation before trusted revalidation and never mutates media or Storage", async () => {
  const invocation = await invoke({ intent: "save-draft" });
  assert.ok(
    invocation.events.indexOf("authorization") <
      invocation.events.indexOf("authoritative-read"),
  );
  assert.ok(
    invocation.events.indexOf("authoritative-read") <
      invocation.events.indexOf("rpc:homestay_image_translation_save_draft"),
  );
  assert.ok(
    invocation.events.indexOf("rpc:homestay_image_translation_save_draft") <
      invocation.events.findIndex((event) => event.startsWith("revalidate:")),
  );
  assert.ok(
    invocation.events.indexOf("post-mutation-refresh") >
      invocation.events.findIndex((event) => event.startsWith("revalidate:")),
  );
  assert.deepEqual(invocation.mediaCalls, []);
  assert.deepEqual(invocation.storageCalls, []);
  const source = read("features/homestay-image-translation/actions.ts");
  for (const forbidden of [
    "media_insert",
    "media_update",
    "media_replace",
    "media_set_primary",
    "media_reorder",
    "media_delete",
  ]) {
    assert.doesNotMatch(source, new RegExp(`\\b${forbidden}\\b`), forbidden);
  }
});

test("successful Homestay mutations remain successful when refresh cannot find the target", async () => {
  const missingTarget = await invoke({
    intent: "save-draft",
    refreshed: {
      success: true,
      homestayId: HOMESTAY_ID,
      slug: TRUSTED_SLUG,
      images: [],
    },
  });
  assert.equal(missingTarget.result.kind, "success");
  assert.match(missingTarget.result.message ?? "", /Perubahan tersimpan/);

  const refreshError = await invoke({
    intent: "save-draft",
    refreshed: { success: false, kind: "read-error" },
  });
  assert.equal(refreshError.result.kind, "success");
  assert.match(refreshError.result.message ?? "", /status terbaru/);

  const mutationFailure = await invoke({
    intent: "save-draft",
    responses: [{ data: null, error: { code: "55000" } }],
  });
  assert.equal(mutationFailure.result.kind, "conflict");
  assert.deepEqual(mutationFailure.paths, []);
});

test("image feature is RPC-only and the existing Indonesian editor remains integrated", () => {
  const featureSource = [
    "features/homestay-image-translation/actions.ts",
    "features/homestay-image-translation/data.ts",
    "features/homestay-image-translation/model.ts",
    "features/homestay-image-translation/homestay-image-translation-form.tsx",
  ]
    .map(read)
    .join("\n");
  for (const table of [
    "homestay_image_translations",
    "homestay_image_translation_review_events",
  ]) {
    assert.doesNotMatch(featureSource, new RegExp(`\\b${table}\\b`), table);
  }
  assert.match(featureSource, /homestay_image_translation_admin_read/);
  assert.match(featureSource, /homestay_image_translation_review_history/);
  assert.match(read("app/admin/homestay/[id]/edit/page.tsx"), /<HomestayForm/);
});
