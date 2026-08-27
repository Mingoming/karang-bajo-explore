import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";
import { createPublicRevalidationMock } from "./public-revalidation-test-helpers.mjs";

import {
  createTraditionalHouseTranslationActionState,
  emptyTraditionalHouseTranslationFormValues,
  getTraditionalHouseTranslationLifecycleLabel,
  validateTraditionalHouseTranslationForEligibility,
  validateTraditionalHouseTranslationForSource,
  validateTraditionalHouseTranslationFormData,
  validateTraditionalHouseTranslationInput,
} from "../features/traditional-house-translation/model.ts";
import { isValidTraditionalHouseId } from "../features/traditional-houses/model.ts";

const read = (path) => readFileSync(path, "utf8");
const HOUSE_ID = "10000000-0000-4000-8000-000000000001";
const TRANSLATION_ID = "20000000-0000-4000-8000-000000000001";
const REVISION = 4;
const TRUSTED_OLD_SLUG = "rumah-adat-indonesia";
const TRUSTED_NEW_SLUG = "rumah-adat-indonesia-baru";

const source = (overrides = {}) => ({
  id: HOUSE_ID,
  name: "Rumah Adat Indonesia",
  summary: "Ringkasan Indonesia",
  description: "Deskripsi Indonesia",
  history: "Sejarah Indonesia",
  cultural_significance: "Makna budaya Indonesia",
  location_name: "Lokasi Indonesia",
  visitor_information: "Informasi kunjungan Indonesia",
  slug: TRUSTED_OLD_SLUG,
  source_revision: 2,
  status: "published",
  updated_at: "2026-08-10T10:00:00.000Z",
  ...overrides,
});

const completeInput = (overrides = {}) => ({
  name: "English Traditional House",
  summary: "English summary",
  description: "English description",
  history: "English history",
  cultural_significance: "English cultural significance",
  location_name: "English location",
  visitor_information: "English visitor information",
  ...overrides,
});

const translation = (overrides = {}) => ({
  id: TRANSLATION_ID,
  traditional_house_id: HOUSE_ID,
  locale: "en",
  name: "English Traditional House",
  summary: "English summary",
  description: "English description",
  history: "English history",
  cultural_significance: "English cultural significance",
  location_name: "English location",
  visitor_information: "English visitor information",
  translation_status: "draft",
  review_state: "pending",
  published_at: null,
  edit_revision: REVISION,
  lifecycle_state: "draft",
  public_eligibility: false,
  review_eligibility: true,
  publication_eligibility: false,
  eligibility_reason: "review is required",
  ...overrides,
});

function parentForm(intent, currentTranslation, options = {}) {
  const formData = new FormData();
  formData.set("intent", intent);
  formData.set("translation_id", currentTranslation?.id ?? "");
  formData.set(
    "edit_revision",
    currentTranslation ? String(currentTranslation.edit_revision) : "",
  );

  if (intent === "save-draft" || intent === "review") {
    for (const [field, value] of Object.entries(
      completeInput(options.inputOverrides),
    )) {
      formData.set(field, value);
    }
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
  };
  return runtime;
}

async function loadParentActions(runtime) {
  const actionSource = read("features/traditional-house-translation/actions.ts")
    .replace(/^"use server";\s*/m, "")
    .replace(/import\s+[\s\S]*?from\s+["'][^"']+["'];\s*/g, "");
  const stripped = stripTypeScriptTypes(actionSource, { mode: "strip" });
  const key = `__traditionalHouseParentActionDeps_${Math.random().toString(36).slice(2)}`;
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
      return { id: "admin-user" };
    },
    createClient: async () => runtime.client,
    isValidTraditionalHouseId,
    queryTraditionalHouseTranslationAdminData: (...args) =>
      runtime.query(...args),
    createTraditionalHouseTranslationActionState,
    validateTraditionalHouseTranslationForEligibility,
    validateTraditionalHouseTranslationForSource,
    validateTraditionalHouseTranslationFormData: (formData) =>
      validateTraditionalHouseTranslationFormData(formData),
  };
  try {
    return await import(
      `data:text/javascript;charset=utf-8,${encodeURIComponent(
        `const deps = globalThis.${key};
const { revalidatePublicDomainPaths, revalidatePublicDomainDetailPaths,
  revalidatePath, requireAdministrator, createClient,
  isValidTraditionalHouseId, queryTraditionalHouseTranslationAdminData,
  createTraditionalHouseTranslationActionState,
  validateTraditionalHouseTranslationForEligibility,
  validateTraditionalHouseTranslationForSource,
  validateTraditionalHouseTranslationFormData } = deps;
${stripped}`,
      )}`
    );
  } finally {
    delete globalThis[key];
  }
}

const parentRuntime = createRuntime();
const parentActions = loadParentActions(parentRuntime);

async function invokeParent({
  intent,
  currentTranslation,
  refreshed,
  confirmation = true,
  omitConfirmation = false,
  clientSlug = null,
  sourceOverrides = {},
  inputOverrides = {},
  responses = [],
  denyAuthorization = false,
}) {
  parentRuntime.calls = [];
  parentRuntime.events = [];
  parentRuntime.paths = [];
  parentRuntime.authCalls = 0;
  parentRuntime.authorizationError = denyAuthorization
    ? new Error("administrator authorization required")
    : null;
  parentRuntime.responses = [...responses];
  parentRuntime.currentTranslation = currentTranslation;
  const trustedSource = source(sourceOverrides);
  let readCount = 0;
  parentRuntime.query = async (supabase, id) => {
    assert.equal(supabase, parentRuntime.client);
    assert.equal(id, HOUSE_ID);
    readCount += 1;
    parentRuntime.events.push(
      readCount === 1 ? "authoritative-read" : "post-mutation-refresh",
    );
    if (readCount === 1) {
      return {
        success: true,
        source: trustedSource,
        slug: TRUSTED_OLD_SLUG,
        translation: currentTranslation,
        history: [],
      };
    }
    return (
      refreshed ?? {
        success: true,
        source: trustedSource,
        slug: TRUSTED_OLD_SLUG,
        translation: currentTranslation,
        history: [],
      }
    );
  };
  const initialState = createTraditionalHouseTranslationActionState(
    trustedSource,
    currentTranslation,
  );
  const action = (await parentActions).manageTraditionalHouseTranslation;
  const result = await action(
    HOUSE_ID,
    initialState,
    parentForm(intent, currentTranslation, {
      confirmation,
      omitConfirmation,
      clientSlug,
      inputOverrides,
    }),
  );
  return {
    result,
    calls: parentRuntime.calls,
    events: parentRuntime.events,
    paths: parentRuntime.paths,
    authCalls: parentRuntime.authCalls,
  };
}

test("Traditional House parent fields normalize without Indonesian fallback", () => {
  const empty = emptyTraditionalHouseTranslationFormValues();
  const result = validateTraditionalHouseTranslationInput(
    completeInput({ name: "  ", description: "  " }),
  );

  assert.equal(empty.name, "");
  assert.equal(result.success, true);
  if (!result.success) return;
  assert.equal(result.data.name, null);
  assert.equal(result.data.description, null);
  assert.notEqual(empty.name, source().name);
});

test("every source-empty optional parent field rejects invention and accepts an empty value", () => {
  for (const field of [
    "summary",
    "history",
    "cultural_significance",
    "location_name",
    "visitor_information",
  ]) {
    const invented = validateTraditionalHouseTranslationInput(
      completeInput({ [field]: "Invented English content" }),
    );
    assert.equal(invented.success, true, field);
    if (!invented.success) continue;
    assert.equal(
      validateTraditionalHouseTranslationForSource(
        source({ [field]: null }),
        invented.data,
      ).success,
      false,
      field,
    );

    const empty = validateTraditionalHouseTranslationInput(
      completeInput({ [field]: "   " }),
    );
    assert.equal(empty.success, true, field);
    if (!empty.success) continue;
    const emptySource = source({ [field]: "   " });
    assert.equal(
      validateTraditionalHouseTranslationForSource(emptySource, empty.data)
        .success,
      true,
      field,
    );
    assert.equal(
      validateTraditionalHouseTranslationForEligibility(emptySource, empty.data)
        .success,
      true,
      field,
    );

    const populated = validateTraditionalHouseTranslationInput(completeInput());
    assert.equal(populated.success, true, field);
    if (!populated.success) continue;
    assert.equal(
      validateTraditionalHouseTranslationForEligibility(
        source(),
        populated.data,
      ).success,
      true,
      field,
    );
  }
});

test("parent action rejects invented content for every source-empty optional field", async () => {
  for (const field of [
    "summary",
    "history",
    "cultural_significance",
    "location_name",
    "visitor_information",
  ]) {
    const invocation = await invokeParent({
      intent: "save-draft",
      currentTranslation: translation({ review_state: "pending" }),
      sourceOverrides: { [field]: null },
      inputOverrides: { [field]: "Invented English content" },
    });
    assert.equal(invocation.result.kind, "validation-error", field);
    assert.equal(invocation.calls.length, 0, field);
    assert.equal(invocation.paths.length, 0, field);
    assert.equal(invocation.authCalls, 1, field);
  }
});

test("lifecycle presentation consumes every database-derived lifecycle branch", () => {
  const cases = [
    ["draft", "Draft"],
    ["reviewed", "Reviewed"],
    ["published", "Published"],
    ["stale", "Stale"],
    ["archived", "Archived"],
    ["source-blocked", "Source blocked"],
  ];
  for (const [lifecycleState, label] of cases) {
    const state = createTraditionalHouseTranslationActionState(
      source(),
      translation({ lifecycle_state: lifecycleState }),
    );
    assert.equal(state.lifecycleState, lifecycleState);
    assert.equal(
      getTraditionalHouseTranslationLifecycleLabel(state.lifecycleState),
      label,
    );
  }

  // The approved database contract presents draft/pending as Draft; the
  // pending review action is the awaiting-review branch, not a React-derived
  // public eligibility state.
  const pending = createTraditionalHouseTranslationActionState(
    source(),
    translation({ review_state: "pending", lifecycle_state: "draft" }),
  );
  assert.equal(pending.reviewState, "pending");
  assert.equal(pending.lifecycleState, "draft");
  assert.match(
    read(
      "features/traditional-house-translation/traditional-house-translation-form.tsx",
    ),
    /Kirim untuk review/,
  );
});

test("parent actions dispatch every lifecycle intent through the exact RPC contract", async () => {
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
    "save-draft": ["traditional_house_translation_save_draft"],
    review: [
      "traditional_house_translation_save_draft",
      "traditional_house_translation_review",
    ],
    reject: ["traditional_house_translation_reject"],
    publish: ["traditional_house_translation_publish"],
    republish: ["traditional_house_translation_republish"],
    archive: ["traditional_house_translation_archive"],
    unpublish: ["traditional_house_translation_unpublish"],
    restore: ["traditional_house_translation_restore"],
  };

  for (const [intent, currentTranslation] of Object.entries(cases)) {
    const { calls, paths, authCalls } = await invokeParent({
      intent,
      currentTranslation,
    });
    assert.equal(authCalls, 1, intent);
    assert.deepEqual(
      calls.map((call) => call.name),
      expectedNames[intent],
      intent,
    );
    assert.deepEqual(calls[0].args.p_expected_edit_revision, REVISION, intent);
    for (const call of calls) {
      assert.equal("p_actor" in call.args, false, intent);
      assert.equal("p_slug" in call.args, false, intent);
    }
    if (intent === "save-draft" || intent === "review") {
      assert.deepEqual(calls[0].args, {
        p_traditional_house_id: HOUSE_ID,
        p_expected_edit_revision: REVISION,
        p_name: "English Traditional House",
        p_summary: "English summary",
        p_description: "English description",
        p_history: "English history",
        p_cultural_significance: "English cultural significance",
        p_location_name: "English location",
        p_visitor_information: "English visitor information",
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
      "/rumah-adat",
      "/en/traditional-houses",
      "/en",
      "/en/tourism-map",
      `/rumah-adat/${encodeURIComponent(TRUSTED_OLD_SLUG)}`,
      `/en/traditional-houses/${encodeURIComponent(TRUSTED_OLD_SLUG)}`,
    ]);
  }
});

test("parent mutation ordering puts successful RPC before revalidation and refresh", async () => {
  const successful = await invokeParent({
    intent: "save-draft",
    currentTranslation: translation({ review_state: "pending" }),
  });
  const authIndex = successful.events.indexOf("authorization");
  const readIndex = successful.events.indexOf("authoritative-read");
  const rpcIndex = successful.events.indexOf(
    "rpc:traditional_house_translation_save_draft",
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

  const failed = await invokeParent({
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

test("parent authorization failure prevents every mutation RPC", async () => {
  await assert.rejects(
    () =>
      invokeParent({
        intent: "save-draft",
        currentTranslation: translation({ review_state: "pending" }),
        denyAuthorization: true,
      }),
    /administrator authorization required/,
  );
  assert.equal(parentRuntime.authCalls, 1);
  assert.deepEqual(parentRuntime.events, ["authorization"]);
  assert.equal(parentRuntime.calls.length, 0);
  assert.equal(parentRuntime.paths.length, 0);
});

test("crafted parent review requests cannot bypass terminology confirmation", async () => {
  for (const confirmation of [undefined, "false"]) {
    const { result, calls } = await invokeParent({
      intent: "review",
      currentTranslation: translation({ review_state: "pending" }),
      confirmation,
      omitConfirmation: confirmation === undefined,
    });
    assert.equal(result.kind, "validation-error");
    assert.equal(calls.length, 0);
  }

  const valid = await invokeParent({
    intent: "review",
    currentTranslation: translation({ review_state: "pending" }),
    confirmation: "on",
  });
  assert.deepEqual(
    valid.calls.map((call) => call.name),
    [
      "traditional_house_translation_save_draft",
      "traditional_house_translation_review",
    ],
  );
});

test("parent revalidation survives refresh failure and uses only trusted slugs", async () => {
  const current = translation({ review_state: "pending" });
  const failedRefresh = await invokeParent({
    intent: "archive",
    currentTranslation: translation({
      translation_status: "published",
      review_state: "reviewed",
      published_at: "2026-08-10T10:05:00.000Z",
      lifecycle_state: "published",
    }),
    refreshed: { success: false, kind: "read-error", source: null },
    clientSlug: "attacker-slug",
  });
  assert.equal(failedRefresh.result.kind, "database-error");
  assert.deepEqual(failedRefresh.paths, [
    "/admin/rumah-adat",
    `/admin/rumah-adat/${HOUSE_ID}/edit`,
    "/rumah-adat",
    "/en/traditional-houses",
    "/en",
    "/en/tourism-map",
    `/rumah-adat/${encodeURIComponent(TRUSTED_OLD_SLUG)}`,
    `/en/traditional-houses/${encodeURIComponent(TRUSTED_OLD_SLUG)}`,
  ]);
  assert.equal(
    failedRefresh.paths.some((path) => path.includes("attacker")),
    false,
  );

  const changedSlug = await invokeParent({
    intent: "archive",
    currentTranslation: translation({
      translation_status: "published",
      review_state: "reviewed",
      published_at: "2026-08-10T10:05:00.000Z",
      lifecycle_state: "published",
    }),
    refreshed: {
      success: true,
      source: source({ slug: TRUSTED_NEW_SLUG }),
      slug: TRUSTED_NEW_SLUG,
      translation: current,
      history: [],
    },
  });
  assert.deepEqual(changedSlug.paths, [
    "/admin/rumah-adat",
    `/admin/rumah-adat/${HOUSE_ID}/edit`,
    "/rumah-adat",
    "/en/traditional-houses",
    "/en",
    "/en/tourism-map",
    `/rumah-adat/${encodeURIComponent(TRUSTED_OLD_SLUG)}`,
    `/en/traditional-houses/${encodeURIComponent(TRUSTED_OLD_SLUG)}`,
    `/rumah-adat/${encodeURIComponent(TRUSTED_NEW_SLUG)}`,
    `/en/traditional-houses/${encodeURIComponent(TRUSTED_NEW_SLUG)}`,
  ]);
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

test("Traditional House admin page keeps the Indonesian editor mounted", () => {
  const page = read("app/admin/rumah-adat/[id]/edit/page.tsx");
  assert.match(page, /<TraditionalHouseForm/);
  assert.match(page, /<TraditionalHouseTranslationForm/);
  assert.match(page, /<TraditionalHouseImageTranslationForm/);
  assert.match(page, /getTraditionalHouseTranslationAdminData/);
  assert.match(page, /getTraditionalHouseImageTranslationAdminData/);
});
