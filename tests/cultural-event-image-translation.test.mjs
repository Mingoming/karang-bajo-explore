import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";

import {
  createCulturalEventImageTranslationActionState,
  getCulturalEventImageTranslationLifecycleLabel,
  validateCulturalEventImageTranslationForEligibility,
  validateCulturalEventImageTranslationForSource,
} from "../features/cultural-event-image-translation/model.ts";
import { isValidCulturalEventId } from "../features/cultural-events/model.ts";

const read = (path) => readFileSync(path, "utf8");
const EVENT_ID = "c8100000-0000-4000-8000-000000000001";
const IMAGE_ID = "c8300000-0000-4000-8000-000000000001";
const TRANSLATION_ID = "c8400000-0000-4000-8000-000000000001";
const REVISION = 3;
const OLD_SLUG = "festival-lama";
const NEW_SLUG = "festival-baru";

const source = (overrides = {}) => ({
  id: IMAGE_ID,
  parentId: EVENT_ID,
  altText: "Alt Indonesia",
  caption: "Caption Indonesia",
  displayOrder: 0,
  isPrimary: true,
  previewUrl: null,
  ...overrides,
});

const translation = (overrides = {}) => ({
  id: TRANSLATION_ID,
  cultural_event_image_id: IMAGE_ID,
  locale: "en",
  alt_text: "English alt",
  caption: "English caption",
  translation_status: "draft",
  review_state: "pending",
  published_at: null,
  edit_revision: REVISION,
  cultural_event_id: EVENT_ID,
  source_slug: OLD_SLUG,
  source_revision: 2,
  source_updated_at: "2038-08-10T10:00:00.000Z",
  source_status: "published",
  lifecycle_state: "draft",
  source_blocked: false,
  source_blocked_reason: null,
  public_eligibility: false,
  review_eligibility: true,
  publication_eligibility: false,
  eligibility_reason: "review is required",
  ...overrides,
});

function formFor(intent, currentTranslation, options = {}) {
  const formData = new FormData();
  formData.set("intent", intent);
  formData.set("translation_id", currentTranslation?.id ?? "");
  formData.set(
    "edit_revision",
    currentTranslation ? String(currentTranslation.edit_revision) : "",
  );
  if (intent === "save-draft" || intent === "review") {
    formData.set("alt_text", options.altText ?? "English alt");
    formData.set("caption", options.caption ?? "English caption");
  }
  if (intent === "review" && !options.omitConfirmation) {
    formData.set("terminology_review_confirmed", "on");
  }
  if (intent === "reject") formData.set("rejection_reason", "Needs revision");
  if (options.clientSlug) formData.set("slug", options.clientSlug);
  for (const [field, value] of Object.entries(options.extraFields ?? {})) {
    formData.set(field, value);
  }
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
  const actionSource = read(
    "features/cultural-event-image-translation/actions.ts",
  )
    .replace(/^"use server";\s*/m, "")
    .replace(/import\s+[\s\S]*?from\s+["'][^"']+["'];\s*/g, "");
  const stripped = stripTypeScriptTypes(actionSource, { mode: "strip" });
  const key = `__culturalEventImageDeps_${Math.random().toString(36).slice(2)}`;
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
    isValidCulturalEventId,
    queryCulturalEventImageTranslationAdminData: (...args) =>
      runtime.query(...args),
    createCulturalEventImageTranslationActionState,
    validateCulturalEventImageTranslationForEligibility,
    validateCulturalEventImageTranslationForSource,
    validateCulturalEventImageTranslationFormData: (formData) =>
      globalThis.__culturalEventImageModel.validateCulturalEventImageTranslationFormData(
        formData,
      ),
  };
  try {
    return await import(
      `data:text/javascript;charset=utf-8,${encodeURIComponent(
        `const deps = globalThis.${key};
const { revalidatePath, requireAdministrator, createClient,
  isValidCulturalEventId, queryCulturalEventImageTranslationAdminData,
  createCulturalEventImageTranslationActionState,
  validateCulturalEventImageTranslationForEligibility,
  validateCulturalEventImageTranslationForSource,
  validateCulturalEventImageTranslationFormData } = deps;
${stripped}`,
      )}`
    );
  } finally {
    delete globalThis[key];
  }
}

const imageModel =
  await import("../features/cultural-event-image-translation/model.ts");
globalThis.__culturalEventImageModel = imageModel;
const runtime = createRuntime();
const actions = await loadActions(runtime);

async function invoke({
  intent,
  currentTranslation,
  refreshed,
  sourceOverrides = {},
  altText,
  caption,
  responses = [],
  denyAuthorization = false,
  clientSlug = null,
  omitConfirmation = false,
  extraFields = {},
}) {
  runtime.calls = [];
  runtime.events = [];
  runtime.paths = [];
  runtime.authCalls = 0;
  runtime.mediaMutationCalls = [];
  runtime.storageCalls = [];
  runtime.authorizationError = denyAuthorization
    ? new Error("administrator authorization required")
    : null;
  runtime.responses = [...responses];
  runtime.currentTranslation = currentTranslation;
  const trustedSource = source(sourceOverrides);
  let readCount = 0;
  runtime.query = async (client, id) => {
    assert.equal(client, runtime.client);
    assert.equal(id, EVENT_ID);
    readCount += 1;
    runtime.events.push(
      readCount === 1 ? "authoritative-read" : "post-mutation-refresh",
    );
    const item = {
      source: trustedSource,
      sourceStatus: "published",
      translation: currentTranslation,
      history: [],
    };
    if (readCount === 1) {
      return {
        success: true,
        culturalEventId: EVENT_ID,
        slug: OLD_SLUG,
        images: [item],
      };
    }
    return (
      refreshed ?? {
        success: true,
        culturalEventId: EVENT_ID,
        slug: OLD_SLUG,
        images: [item],
      }
    );
  };
  const initialState = createCulturalEventImageTranslationActionState(
    trustedSource,
    currentTranslation,
    [],
    { sourceStatus: "published" },
  );
  const result = await actions.manageCulturalEventImageTranslation(
    EVENT_ID,
    IMAGE_ID,
    initialState,
    formFor(intent, currentTranslation, {
      altText,
      caption,
      clientSlug,
      omitConfirmation,
      extraFields,
    }),
  );
  return { result, readCount };
}

function assertNoClientAuthority(call) {
  assert.ok(call);
  assert.deepEqual(
    Object.keys(call.args).filter((key) =>
      /actor|user|slug|fingerprint|source_revision|start_at|end_at|all_day|timezone|is_primary/.test(
        key,
      ),
    ),
    [],
  );
}

test("image model enforces source-empty caption and primary alt rules", () => {
  const sourceWithoutCaption = source({ caption: null });
  const invented = validateCulturalEventImageTranslationForSource(
    sourceWithoutCaption,
    { alt_text: "English alt", caption: "Invented caption" },
  );
  assert.equal(invented.success, false);

  const eligible = validateCulturalEventImageTranslationForEligibility(
    sourceWithoutCaption,
    { alt_text: "English alt", caption: null },
    "published",
  );
  assert.equal(eligible.success, true);
  const missingAlt = validateCulturalEventImageTranslationForEligibility(
    source(),
    { alt_text: "   ", caption: "English caption" },
    "published",
  );
  assert.equal(missingAlt.success, false);
  assert.ok(missingAlt.fieldErrors.alt_text);
});

test("image lifecycle labels use database-derived state", () => {
  assert.equal(
    getCulturalEventImageTranslationLifecycleLabel("draft", "pending"),
    "Awaiting review",
  );
  assert.equal(
    getCulturalEventImageTranslationLifecycleLabel("stale", "reviewed"),
    "Stale",
  );
  assert.equal(
    getCulturalEventImageTranslationLifecycleLabel("published", "reviewed"),
    "Published",
  );
});

test("all image lifecycle intents map to approved RPCs", async () => {
  const cases = [
    ["save-draft", null, ["cultural_event_image_translation_save_draft"]],
    [
      "review",
      translation(),
      [
        "cultural_event_image_translation_save_draft",
        "cultural_event_image_translation_review",
      ],
    ],
    ["reject", translation(), ["cultural_event_image_translation_reject"]],
    [
      "publish",
      translation({ review_state: "reviewed", publication_eligibility: true }),
      ["cultural_event_image_translation_publish"],
    ],
    [
      "republish",
      translation({
        translation_status: "published",
        review_state: "reviewed",
        published_at: "2038-08-10T00:00:00.000Z",
        publication_eligibility: true,
      }),
      ["cultural_event_image_translation_republish"],
    ],
    [
      "archive",
      translation({
        translation_status: "published",
        review_state: "reviewed",
      }),
      ["cultural_event_image_translation_archive"],
    ],
    [
      "unpublish",
      translation({
        translation_status: "published",
        review_state: "reviewed",
      }),
      ["cultural_event_image_translation_unpublish"],
    ],
    [
      "restore",
      translation({ translation_status: "archived", review_state: "pending" }),
      ["cultural_event_image_translation_restore"],
    ],
  ];
  for (const [intent, currentTranslation, expected] of cases) {
    await invoke({ intent, currentTranslation });
    assert.deepEqual(
      runtime.calls.map((call) => call.name),
      expected,
      `${intent} RPC mapping`,
    );
    assert.equal(runtime.authCalls, 1, `${intent} authorization count`);
    assert.equal(
      runtime.calls[0].args.p_expected_edit_revision,
      currentTranslation?.edit_revision ?? null,
    );
    assertNoClientAuthority(runtime.calls[0]);
    if (intent === "save-draft" || intent === "review") {
      assert.equal(runtime.calls[0].args.p_cultural_event_image_id, IMAGE_ID);
      assert.equal(runtime.calls[0].args.p_alt_text, "English alt");
      assert.equal(runtime.calls[0].args.p_caption, "English caption");
    } else {
      assert.equal(runtime.calls[0].args.p_translation_id, TRANSLATION_ID);
      if (intent === "reject") {
        assert.equal(runtime.calls[0].args.p_reason, "Needs revision");
      }
    }
    if (intent === "review") {
      assert.equal(runtime.calls[1].args.p_translation_id, TRANSLATION_ID);
      assert.equal(
        runtime.calls[1].args.p_expected_edit_revision,
        REVISION + 1,
      );
      assert.equal(runtime.calls[1].args.p_terminology_review_confirmed, true);
      assertNoClientAuthority(runtime.calls[1]);
    }
  }
});

test("authorization failure produces only an authorization event for every intent", async () => {
  const cases = [
    ["save-draft", null],
    ["review", translation()],
    ["reject", translation()],
    [
      "publish",
      translation({ review_state: "reviewed", publication_eligibility: true }),
    ],
    [
      "republish",
      translation({
        translation_status: "published",
        review_state: "reviewed",
        published_at: "2038-08-10T00:00:00.000Z",
        publication_eligibility: true,
      }),
    ],
    ["archive", translation({ translation_status: "published" })],
    ["unpublish", translation({ translation_status: "published" })],
    ["restore", translation({ translation_status: "archived" })],
  ];
  for (const [intent, currentTranslation] of cases) {
    await assert.rejects(
      invoke({ intent, currentTranslation, denyAuthorization: true }),
    );
    assert.equal(runtime.authCalls, 1, intent);
    assert.deepEqual(runtime.events, ["authorization"], intent);
    assert.deepEqual(runtime.calls, [], intent);
    assert.deepEqual(runtime.paths, [], intent);
  }
});

test("real image action rejects invented caption without a mutation RPC", async () => {
  for (const sourceCaption of [null, "", "   "]) {
    const { result } = await invoke({
      intent: "save-draft",
      currentTranslation: null,
      sourceOverrides: { caption: sourceCaption },
      caption: "Invented English caption",
    });
    assert.equal(result.kind, "validation-error", String(sourceCaption));
    assert.deepEqual(runtime.calls, [], String(sourceCaption));
    assert.deepEqual(runtime.paths, [], String(sourceCaption));
  }
});

test("real image action accepts an empty caption when the source caption is empty", async () => {
  for (const sourceCaption of [null, "", "   "]) {
    const { result } = await invoke({
      intent: "save-draft",
      currentTranslation: null,
      sourceOverrides: { caption: sourceCaption },
      caption: "",
    });
    assert.equal(result.kind, "success", String(sourceCaption));
    assert.equal(runtime.calls.length, 1, String(sourceCaption));
    assert.equal(runtime.calls[0].args.p_caption, null, String(sourceCaption));
  }
});

test("real image action rejects blank primary English alt before mutation", async () => {
  const { result } = await invoke({
    intent: "review",
    currentTranslation: translation(),
    altText: "   ",
  });
  assert.equal(result.kind, "validation-error");
  assert.deepEqual(runtime.calls, []);
  assert.deepEqual(runtime.paths, []);
});

test("successful image mutation invalidates old and refreshed trusted slugs before missing-image return", async () => {
  const { result } = await invoke({
    intent: "save-draft",
    currentTranslation: null,
    clientSlug: "attacker-slug",
    refreshed: {
      success: true,
      culturalEventId: EVENT_ID,
      slug: NEW_SLUG,
      images: [],
    },
  });
  assert.equal(result.kind, "not-found");
  assert.ok(runtime.paths.includes(`/en/cultural-events/${OLD_SLUG}`));
  assert.ok(runtime.paths.includes(`/en/cultural-events/${NEW_SLUG}`));
  assert.ok(!runtime.paths.some((path) => path.includes("attacker-slug")));
  assert.deepEqual(runtime.events.slice(0, 5), [
    "authorization",
    "authoritative-read",
    "rpc:cultural_event_image_translation_save_draft",
    "revalidate:/admin/acara-budaya",
    "revalidate:/admin/acara-budaya/c8100000-0000-4000-8000-000000000001/edit",
  ]);
  assert.ok(
    runtime.events.indexOf("rpc:cultural_event_image_translation_save_draft") <
      runtime.events.indexOf("revalidate:/en/cultural-events"),
  );
});

test("crafted image authority fields cannot change mutation or revalidation authority", async () => {
  for (const field of [
    "start_at",
    "end_at",
    "all_day",
    "timezone",
    "source_revision",
    "source_fingerprint",
    "translation_fingerprint",
    "actor_id",
    "user_id",
    "is_primary",
  ]) {
    const { result } = await invoke({
      intent: "save-draft",
      currentTranslation: null,
      extraFields: { [field]: "attacker-value" },
    });
    assert.equal(result.kind, "validation-error", field);
    assert.deepEqual(runtime.calls, [], field);
    assert.deepEqual(runtime.paths, [], field);
  }
  await invoke({
    intent: "save-draft",
    currentTranslation: null,
    clientSlug: "attacker-slug",
  });
  assert.equal(runtime.calls[0].args.p_cultural_event_image_id, IMAGE_ID);
  assert.ok(!runtime.paths.some((path) => path.includes("attacker-slug")));
});

test("refresh failure cannot remove cache invalidation after successful image RPC", async () => {
  await invoke({
    intent: "save-draft",
    currentTranslation: null,
    refreshed: { success: false, kind: "read-error" },
  });
  assert.ok(runtime.paths.includes("/en/cultural-events"));
  assert.ok(runtime.paths.includes(`/en/cultural-events/${OLD_SLUG}`));
});

test("failed image mutation performs no success revalidation", async () => {
  await invoke({
    intent: "save-draft",
    currentTranslation: null,
    responses: [{ data: null, error: { code: "55000" } }],
  });
  assert.deepEqual(runtime.paths, []);
});

test("image translation action does not call generic media or Storage operations", async () => {
  await invoke({ intent: "save-draft", currentTranslation: null });
  assert.deepEqual(runtime.mediaMutationCalls, []);
  assert.deepEqual(runtime.storageCalls, []);
  const actionText = read(
    "features/cultural-event-image-translation/actions.ts",
  );
  assert.doesNotMatch(
    actionText,
    /media_insert|media_update|media_replace|media_set_primary|media_reorder|media_delete|cultural_event_image_translations|cultural_event_image_translation_review_events/,
  );
});

test("image form keeps Indonesian metadata outside English defaults", () => {
  const form = read(
    "features/cultural-event-image-translation/cultural-event-image-translation-form.tsx",
  );
  assert.match(form, /defaultValue={state\.values\[field\]}/);
  assert.doesNotMatch(form, /defaultValue={sourceReference/);
  assert.match(
    form,
    /translation metadata only; it never uploads, replaces, reorders, or\s+deletes Storage media/,
  );
  assert.match(form, /Parent source slug/);
  assert.match(form, /sourceContext\.slug/);
  assert.match(form, /Parent source updated \(WITA\)/);
  assert.match(form, /sourceContext\.updatedAt/);
  assert.match(form, /Database status/);
  assert.match(form, /state\.eligibilityReason/);
  assert.match(form, /state\.sourceBlockedReason/);
  assert.doesNotMatch(form, /name="source(Slug|Revision|Updated)/);
});
