import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";

import {
  createTraditionalHouseImageTranslationActionState,
  emptyTraditionalHouseImageTranslationFormValues,
  getTraditionalHouseImageTranslationLifecycleLabel,
  traditionalHouseImageTranslationToFormValues,
  validateTraditionalHouseImageTranslationForEligibility,
  validateTraditionalHouseImageTranslationForSource,
  validateTraditionalHouseImageTranslationInput,
  validateTraditionalHouseImageTranslationFormData,
} from "../features/traditional-house-image-translation/model.ts";
import { isValidTraditionalHouseId } from "../features/traditional-houses/model.ts";

const read = (path) => readFileSync(path, "utf8");
const HOUSE_ID = "10000000-0000-4000-8000-000000000001";
const IMAGE_ID = "30000000-0000-4000-8000-000000000001";
const TRANSLATION_ID = "40000000-0000-4000-8000-000000000001";
const OTHER_IMAGE_ID = "30000000-0000-4000-8000-000000000002";
const REVISION = 3;
const TRUSTED_OLD_SLUG = "rumah-adat-indonesia";
const TRUSTED_NEW_SLUG = "rumah-adat-indonesia-baru";

const source = (overrides = {}) => ({
  id: IMAGE_ID,
  parentId: HOUSE_ID,
  altText: "Alt Indonesia",
  caption: "Caption Indonesia",
  displayOrder: 0,
  isPrimary: true,
  previewUrl: null,
  ...overrides,
});

const translation = (overrides = {}) => ({
  id: TRANSLATION_ID,
  traditional_house_image_id: IMAGE_ID,
  locale: "en",
  alt_text: "English alt",
  caption: "English caption",
  translation_status: "draft",
  review_state: "pending",
  published_at: null,
  edit_revision: REVISION,
  traditional_house_id: HOUSE_ID,
  source_slug: TRUSTED_OLD_SLUG,
  source_revision: 2,
  source_updated_at: "2026-08-10T10:00:00.000Z",
  source_status: "published",
  lifecycle_state: "draft",
  public_eligibility: false,
  review_eligibility: true,
  publication_eligibility: false,
  eligibility_reason: "review is required",
  ...overrides,
});

function imageForm(intent, currentTranslation, options = {}) {
  const formData = new FormData();
  formData.set("intent", intent);
  formData.set("translation_id", currentTranslation?.id ?? "");
  formData.set(
    "edit_revision",
    currentTranslation ? String(currentTranslation.edit_revision) : "",
  );
  if (intent === "save-draft" || intent === "review") {
    formData.set("alt_text", options.inputOverrides?.alt_text ?? "English alt");
    formData.set(
      "caption",
      options.inputOverrides?.caption ?? "English caption",
    );
  }
  if (intent === "review" && !options.omitConfirmation) {
    formData.set("terminology_review_confirmed", options.confirmation);
  }
  if (intent === "reject") {
    formData.set("rejection_reason", "Perlu ditinjau ulang");
  }
  if (options.clientSlug) formData.set("slug", options.clientSlug);
  return formData;
}

function successfulRpcRow(currentTranslation) {
  const row = currentTranslation ?? translation({ edit_revision: 0 });
  return { ...row, edit_revision: row.edit_revision + 1 };
}

function createRuntime() {
  const runtime = {
    client: null,
    calls: [],
    events: [],
    paths: [],
    authCalls: 0,
    authorizationError: null,
    mediaMutationCalls: [],
    storageCalls: [],
    query: null,
    currentTranslation: null,
    responses: [],
  };
  runtime.client = {
    rpc(name, args) {
      runtime.calls.push({ name, args });
      runtime.events.push(`rpc:${name}`);
      const response = runtime.responses.shift() ?? {
        data: successfulRpcRow(runtime.currentTranslation),
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
      runtime.mediaMutationCalls.push(table);
      throw new Error("unexpected generic media table access");
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

async function loadImageActions(runtime) {
  const actionSource = read(
    "features/traditional-house-image-translation/actions.ts",
  )
    .replace(/^"use server";\s*/m, "")
    .replace(/import\s+[\s\S]*?from\s+["'][^"']+["'];\s*/g, "");
  const stripped = stripTypeScriptTypes(actionSource, { mode: "strip" });
  const key = `__traditionalHouseImageActionDeps_${Math.random().toString(36).slice(2)}`;
  globalThis[key] = {
    revalidatePath: (path) => {
      runtime.paths.push(path);
      runtime.events.push(`revalidate:${path}`);
    },
    requireAdministrator: async () => {
      runtime.authCalls += 1;
      runtime.events.push("authorization");
      if (runtime.authorizationError) throw runtime.authorizationError;
      return { id: "admin-user" };
    },
    createClient: async () => runtime.client,
    isValidTraditionalHouseId,
    queryTraditionalHouseImageTranslationAdminData: (...args) =>
      runtime.query(...args),
    createTraditionalHouseImageTranslationActionState,
    validateTraditionalHouseImageTranslationForEligibility,
    validateTraditionalHouseImageTranslationForSource,
    validateTraditionalHouseImageTranslationFormData: (formData) =>
      validateTraditionalHouseImageTranslationFormData(formData),
  };
  try {
    return await import(
      `data:text/javascript;charset=utf-8,${encodeURIComponent(
        `const deps = globalThis.${key};
const { revalidatePath, requireAdministrator, createClient,
  isValidTraditionalHouseId, queryTraditionalHouseImageTranslationAdminData,
  createTraditionalHouseImageTranslationActionState,
  validateTraditionalHouseImageTranslationForEligibility,
  validateTraditionalHouseImageTranslationForSource,
  validateTraditionalHouseImageTranslationFormData } = deps;
${stripped}`,
      )}`
    );
  } finally {
    delete globalThis[key];
  }
}

const imageRuntime = createRuntime();
const imageActions = loadImageActions(imageRuntime);

async function invokeImage({
  intent,
  currentTranslation,
  refreshed,
  confirmation = true,
  omitConfirmation = false,
  clientSlug = null,
  requestedImageId = IMAGE_ID,
  sourceOverrides = {},
  inputOverrides = {},
  responses = [],
  denyAuthorization = false,
}) {
  imageRuntime.calls = [];
  imageRuntime.events = [];
  imageRuntime.paths = [];
  imageRuntime.authCalls = 0;
  imageRuntime.authorizationError = denyAuthorization
    ? new Error("administrator authorization required")
    : null;
  imageRuntime.mediaMutationCalls = [];
  imageRuntime.storageCalls = [];
  imageRuntime.responses = [...responses];
  imageRuntime.currentTranslation = currentTranslation;
  const trustedSource = source(sourceOverrides);
  let readCount = 0;
  imageRuntime.query = async (supabase, id) => {
    assert.equal(supabase, imageRuntime.client);
    assert.equal(id, HOUSE_ID);
    readCount += 1;
    imageRuntime.events.push(
      readCount === 1 ? "authoritative-read" : "post-mutation-refresh",
    );
    const image = {
      source: trustedSource,
      sourceStatus: "published",
      translation: currentTranslation,
      history: [],
    };
    if (readCount === 1) {
      return {
        success: true,
        traditionalHouseId: HOUSE_ID,
        slug: TRUSTED_OLD_SLUG,
        images: [image],
      };
    }
    return (
      refreshed ?? {
        success: true,
        traditionalHouseId: HOUSE_ID,
        slug: TRUSTED_OLD_SLUG,
        images: [image],
      }
    );
  };
  const initialState = createTraditionalHouseImageTranslationActionState(
    trustedSource,
    currentTranslation,
    [],
    { sourceStatus: "published" },
  );
  const action = (await imageActions).manageTraditionalHouseImageTranslation;
  const result = await action(
    HOUSE_ID,
    requestedImageId,
    initialState,
    imageForm(intent, currentTranslation, {
      confirmation,
      omitConfirmation,
      clientSlug,
      inputOverrides,
    }),
  );
  return {
    result,
    calls: imageRuntime.calls,
    events: imageRuntime.events,
    paths: imageRuntime.paths,
    authCalls: imageRuntime.authCalls,
    mediaMutationCalls: imageRuntime.mediaMutationCalls,
    storageCalls: imageRuntime.storageCalls,
  };
}

test("image translation starts empty and never uses the Indonesian alt fallback", () => {
  assert.deepEqual(emptyTraditionalHouseImageTranslationFormValues(), {
    alt_text: "",
    caption: "",
  });
  assert.deepEqual(traditionalHouseImageTranslationToFormValues(null), {
    alt_text: "",
    caption: "",
  });
  assert.notEqual(
    traditionalHouseImageTranslationToFormValues(null).alt_text,
    source().altText,
  );
});

test("source-empty caption rules match the database contract", () => {
  const validEmptyCaption = validateTraditionalHouseImageTranslationInput({
    alt_text: "English alt",
    caption: "",
  });
  assert.equal(validEmptyCaption.success, true);
  if (!validEmptyCaption.success) return;

  for (const emptySourceCaption of [null, "", "   "]) {
    assert.equal(
      validateTraditionalHouseImageTranslationForSource(
        source({ caption: emptySourceCaption }),
        validEmptyCaption.data,
      ).success,
      true,
    );
    const invented = validateTraditionalHouseImageTranslationInput({
      alt_text: "English alt",
      caption: "Invented caption",
    });
    assert.equal(invented.success, true);
    if (!invented.success) continue;
    assert.equal(
      validateTraditionalHouseImageTranslationForSource(
        source({ caption: emptySourceCaption }),
        invented.data,
      ).success,
      false,
    );
  }

  const populatedCaption = validateTraditionalHouseImageTranslationInput({
    alt_text: "English alt",
    caption: "English caption",
  });
  assert.equal(populatedCaption.success, true);
  if (!populatedCaption.success) return;
  assert.equal(
    validateTraditionalHouseImageTranslationForSource(
      source(),
      populatedCaption.data,
    ).success,
    true,
  );

  const omittedCaption = validateTraditionalHouseImageTranslationInput({
    alt_text: "English alt",
    caption: "",
  });
  assert.equal(omittedCaption.success, true);
  if (!omittedCaption.success) return;
  assert.equal(
    validateTraditionalHouseImageTranslationForSource(
      source(),
      omittedCaption.data,
    ).success,
    true,
  );
});

test("image action rejects invented captions for an empty source caption", async () => {
  for (const emptyCaption of [null, "", "   "]) {
    const invocation = await invokeImage({
      intent: "save-draft",
      currentTranslation: translation({ review_state: "pending" }),
      sourceOverrides: { caption: emptyCaption },
      inputOverrides: { caption: "Invented English caption" },
    });
    assert.equal(invocation.result.kind, "validation-error", emptyCaption);
    assert.equal(invocation.calls.length, 0, emptyCaption);
    assert.equal(invocation.paths.length, 0, emptyCaption);
    assert.equal(invocation.authCalls, 1, emptyCaption);
  }
});

test("primary alt behavior is fail-closed and non-primary images remain independent", () => {
  for (const altText of ["", "   "]) {
    const input = validateTraditionalHouseImageTranslationInput({
      alt_text: altText,
      caption: "",
    });
    assert.equal(input.success, true);
    if (!input.success) continue;
    const eligibility = validateTraditionalHouseImageTranslationForEligibility(
      source(),
      input.data,
      "published",
    );
    assert.equal(eligibility.success, false);
    assert.match(eligibility.fieldErrors.alt_text ?? "", /wajib diisi/);
  }

  const nonPrimaryInput = validateTraditionalHouseImageTranslationInput({
    alt_text: "English gallery alt",
    caption: "",
  });
  assert.equal(nonPrimaryInput.success, true);
  if (!nonPrimaryInput.success) return;
  assert.equal(
    validateTraditionalHouseImageTranslationForEligibility(
      source({ isPrimary: false, caption: null }),
      nonPrimaryInput.data,
      "published",
    ).success,
    true,
  );
});

test("image lifecycle presentation consumes every database-derived lifecycle branch", () => {
  for (const [lifecycleState, label] of [
    ["draft", "Draft"],
    ["reviewed", "Reviewed"],
    ["published", "Published"],
    ["stale", "Stale"],
    ["archived", "Archived"],
    ["source-blocked", "Source blocked"],
  ]) {
    const state = createTraditionalHouseImageTranslationActionState(
      source(),
      translation({ lifecycle_state: lifecycleState }),
      [],
      { sourceStatus: "published" },
    );
    assert.equal(state.lifecycleState, lifecycleState);
    assert.equal(
      getTraditionalHouseImageTranslationLifecycleLabel(state.lifecycleState),
      label,
    );
  }

  const pending = createTraditionalHouseImageTranslationActionState(
    source(),
    translation({ review_state: "pending", lifecycle_state: "draft" }),
    [],
    { sourceStatus: "published" },
  );
  assert.equal(pending.reviewState, "pending");
  assert.equal(pending.lifecycleState, "draft");
  assert.match(
    read(
      "features/traditional-house-image-translation/traditional-house-image-translation-form.tsx",
    ),
    /Kirim untuk review/,
  );
});

test("image actions dispatch every lifecycle intent through the exact RPC contract", async () => {
  const cases = {
    "save-draft": translation({ review_state: "pending" }),
    review: translation({ review_state: "pending" }),
    reject: translation({ review_state: "pending" }),
    publish: translation({
      review_state: "reviewed",
      published_at: null,
      publication_eligibility: true,
      lifecycle_state: "reviewed",
    }),
    republish: translation({
      translation_status: "published",
      review_state: "reviewed",
      published_at: "2026-08-10T10:05:00.000Z",
      publication_eligibility: true,
      lifecycle_state: "published",
    }),
    archive: translation({
      translation_status: "published",
      review_state: "reviewed",
      published_at: "2026-08-10T10:05:00.000Z",
      lifecycle_state: "published",
    }),
    unpublish: translation({
      translation_status: "published",
      review_state: "reviewed",
      published_at: "2026-08-10T10:05:00.000Z",
      lifecycle_state: "published",
    }),
    restore: translation({
      translation_status: "archived",
      review_state: "pending",
      published_at: "2026-08-10T10:05:00.000Z",
      lifecycle_state: "archived",
    }),
  };
  const expectedNames = {
    "save-draft": ["traditional_house_image_translation_save_draft"],
    review: [
      "traditional_house_image_translation_save_draft",
      "traditional_house_image_translation_review",
    ],
    reject: ["traditional_house_image_translation_reject"],
    publish: ["traditional_house_image_translation_publish"],
    republish: ["traditional_house_image_translation_republish"],
    archive: ["traditional_house_image_translation_archive"],
    unpublish: ["traditional_house_image_translation_unpublish"],
    restore: ["traditional_house_image_translation_restore"],
  };

  for (const [intent, currentTranslation] of Object.entries(cases)) {
    const { calls, paths, authCalls } = await invokeImage({
      intent,
      currentTranslation,
    });
    assert.equal(authCalls, 1, intent);
    assert.deepEqual(
      calls.map((call) => call.name),
      expectedNames[intent],
      intent,
    );
    assert.equal(calls[0].args.p_expected_edit_revision, REVISION, intent);
    for (const call of calls) {
      assert.equal("p_actor" in call.args, false, intent);
      assert.equal("p_slug" in call.args, false, intent);
    }
    if (intent === "save-draft" || intent === "review") {
      assert.deepEqual(calls[0].args, {
        p_traditional_house_image_id: IMAGE_ID,
        p_expected_edit_revision: REVISION,
        p_alt_text: "English alt",
        p_caption: "English caption",
      });
    } else if (intent === "reject") {
      assert.deepEqual(calls[0].args, {
        p_translation_id: TRANSLATION_ID,
        p_expected_edit_revision: REVISION,
        p_reason: "Perlu ditinjau ulang",
      });
    } else {
      assert.deepEqual(calls[0].args, {
        p_translation_id: TRANSLATION_ID,
        p_expected_edit_revision: REVISION,
      });
    }
    if (intent === "review") {
      assert.deepEqual(calls[1].args, {
        p_translation_id: TRANSLATION_ID,
        p_expected_edit_revision: REVISION + 1,
        p_terminology_review_confirmed: true,
      });
    }
    assert.deepEqual(paths, [
      "/admin/rumah-adat",
      `/admin/rumah-adat/${HOUSE_ID}/edit`,
      "/en/traditional-houses",
      `/en/traditional-houses/${encodeURIComponent(TRUSTED_OLD_SLUG)}`,
    ]);
  }
});

test("image mutation ordering puts successful RPC before revalidation and refresh", async () => {
  const successful = await invokeImage({
    intent: "save-draft",
    currentTranslation: translation({ review_state: "pending" }),
  });
  const authIndex = successful.events.indexOf("authorization");
  const readIndex = successful.events.indexOf("authoritative-read");
  const rpcIndex = successful.events.indexOf(
    "rpc:traditional_house_image_translation_save_draft",
  );
  const revalidationIndex = successful.events.findIndex((event) =>
    event.startsWith("revalidate:"),
  );
  const refreshIndex = successful.events.indexOf("post-mutation-refresh");
  assert.ok(authIndex >= 0);
  assert.ok(readIndex > authIndex);
  assert.ok(rpcIndex > readIndex);
  assert.ok(revalidationIndex > rpcIndex);
  assert.ok(refreshIndex > revalidationIndex);

  const failed = await invokeImage({
    intent: "save-draft",
    currentTranslation: translation({ review_state: "pending" }),
    responses: [{ data: null, error: { code: "55000" } }],
  });
  assert.equal(failed.result.kind, "conflict");
  assert.equal(
    failed.events.some((event) => event.startsWith("revalidate:")),
    false,
  );
});

test("image authorization failure prevents every mutation RPC", async () => {
  await assert.rejects(
    () =>
      invokeImage({
        intent: "save-draft",
        currentTranslation: translation({ review_state: "pending" }),
        denyAuthorization: true,
      }),
    /administrator authorization required/,
  );
  assert.equal(imageRuntime.authCalls, 1);
  assert.deepEqual(imageRuntime.events, ["authorization"]);
  assert.equal(imageRuntime.calls.length, 0);
  assert.equal(imageRuntime.paths.length, 0);
});

test("crafted image review requests cannot bypass terminology confirmation", async () => {
  for (const confirmation of [undefined, "false"]) {
    const { result, calls } = await invokeImage({
      intent: "review",
      currentTranslation: translation({ review_state: "pending" }),
      confirmation,
      omitConfirmation: confirmation === undefined,
    });
    assert.equal(result.kind, "validation-error");
    assert.equal(calls.length, 0);
  }

  const valid = await invokeImage({
    intent: "review",
    currentTranslation: translation({ review_state: "pending" }),
    confirmation: "on",
  });
  assert.deepEqual(
    valid.calls.map((call) => call.name),
    [
      "traditional_house_image_translation_save_draft",
      "traditional_house_image_translation_review",
    ],
  );
});

test("image ownership and revalidation remain server-trusted", async () => {
  const ownership = await invokeImage({
    intent: "save-draft",
    currentTranslation: translation({ review_state: "pending" }),
    requestedImageId: OTHER_IMAGE_ID,
  });
  assert.equal(ownership.result.kind, "not-found");
  assert.equal(ownership.calls.length, 0);

  const failedRefresh = await invokeImage({
    intent: "archive",
    currentTranslation: translation({
      translation_status: "published",
      review_state: "reviewed",
      published_at: "2026-08-10T10:05:00.000Z",
      lifecycle_state: "published",
    }),
    refreshed: { success: false, kind: "read-error" },
    clientSlug: "attacker-slug",
  });
  assert.equal(failedRefresh.result.kind, "database-error");
  assert.deepEqual(failedRefresh.paths, [
    "/admin/rumah-adat",
    `/admin/rumah-adat/${HOUSE_ID}/edit`,
    "/en/traditional-houses",
    `/en/traditional-houses/${encodeURIComponent(TRUSTED_OLD_SLUG)}`,
  ]);
  assert.equal(
    failedRefresh.paths.some((path) => path.includes("attacker")),
    false,
  );

  const changedSlug = await invokeImage({
    intent: "archive",
    currentTranslation: translation({
      translation_status: "published",
      review_state: "reviewed",
      published_at: "2026-08-10T10:05:00.000Z",
      lifecycle_state: "published",
    }),
    refreshed: {
      success: true,
      traditionalHouseId: HOUSE_ID,
      slug: TRUSTED_NEW_SLUG,
      images: [
        {
          source: source(),
          sourceStatus: "published",
          translation: translation({ source_slug: TRUSTED_NEW_SLUG }),
          history: [],
        },
      ],
    },
  });
  assert.deepEqual(changedSlug.paths, [
    "/admin/rumah-adat",
    `/admin/rumah-adat/${HOUSE_ID}/edit`,
    "/en/traditional-houses",
    `/en/traditional-houses/${encodeURIComponent(TRUSTED_OLD_SLUG)}`,
    `/en/traditional-houses/${encodeURIComponent(TRUSTED_NEW_SLUG)}`,
  ]);
});

test("image revalidates the refreshed slug before a missing-image early return", async () => {
  const invocation = await invokeImage({
    intent: "archive",
    currentTranslation: translation({
      translation_status: "published",
      review_state: "reviewed",
      published_at: "2026-08-10T10:05:00.000Z",
      lifecycle_state: "published",
    }),
    refreshed: {
      success: true,
      traditionalHouseId: HOUSE_ID,
      slug: TRUSTED_NEW_SLUG,
      images: [],
    },
    clientSlug: "attacker-slug",
  });
  assert.equal(invocation.result.kind, "not-found");
  assert.deepEqual(invocation.paths, [
    "/admin/rumah-adat",
    `/admin/rumah-adat/${HOUSE_ID}/edit`,
    "/en/traditional-houses",
    `/en/traditional-houses/${encodeURIComponent(TRUSTED_OLD_SLUG)}`,
    `/en/traditional-houses/${encodeURIComponent(TRUSTED_NEW_SLUG)}`,
  ]);
  assert.equal(
    invocation.paths.some((path) => path.includes("attacker")),
    false,
  );
});

test("image translation lifecycle never invokes generic media or Storage mutations", async () => {
  const invocation = await invokeImage({
    intent: "save-draft",
    currentTranslation: translation({ review_state: "pending" }),
  });
  assert.deepEqual(
    invocation.calls.map((call) => call.name),
    ["traditional_house_image_translation_save_draft"],
  );
  assert.deepEqual(invocation.mediaMutationCalls, []);
  assert.deepEqual(invocation.storageCalls, []);
  for (const forbidden of [
    "media_insert",
    "media_update",
    "media_replace",
    "media_set_primary",
    "media_reorder",
    "media_delete",
  ]) {
    assert.equal(
      invocation.calls.some((call) => call.name === forbidden),
      false,
      forbidden,
    );
  }
});

test("translation-table boundaries cover every Traditional House feature file", () => {
  const featureSource = [
    "features/traditional-house-translation/actions.ts",
    "features/traditional-house-translation/data.ts",
    "features/traditional-house-translation/model.ts",
    "features/traditional-house-translation/traditional-house-translation-form.tsx",
    "features/traditional-house-image-translation/actions.ts",
    "features/traditional-house-image-translation/data.ts",
    "features/traditional-house-image-translation/model.ts",
    "features/traditional-house-image-translation/traditional-house-image-translation-form.tsx",
  ]
    .map(read)
    .join("\n");
  for (const table of [
    "traditional_house_translations",
    "traditional_house_translation_review_events",
    "traditional_house_image_translations",
    "traditional_house_image_translation_review_events",
  ]) {
    assert.doesNotMatch(featureSource, new RegExp(`\\b${table}\\b`), table);
  }
});
