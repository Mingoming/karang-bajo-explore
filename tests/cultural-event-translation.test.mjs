import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";
import { createPublicRevalidationMock } from "./public-revalidation-test-helpers.mjs";

import {
  createCulturalEventTranslationActionState,
  getCulturalEventTranslationLifecycleLabel,
  validateCulturalEventTranslationForEligibility,
  validateCulturalEventTranslationForSource,
  validateCulturalEventTranslationInput,
} from "../features/cultural-event-translation/model.ts";
import { isValidCulturalEventId } from "../features/cultural-events/model.ts";

const read = (path) => readFileSync(path, "utf8");
const EVENT_ID = "c8100000-0000-4000-8000-000000000001";
const TRANSLATION_ID = "c8200000-0000-4000-8000-000000000001";
const REVISION = 4;
const OLD_SLUG = "festival-lama";
const NEW_SLUG = "festival-baru";

const source = (overrides = {}) => ({
  id: EVENT_ID,
  title: "Acara Budaya Indonesia",
  summary: "Ringkasan Indonesia",
  description: "Deskripsi Indonesia",
  event_type: "Festival",
  start_at: "2038-08-17T01:00:00.000Z",
  end_at: "2038-08-17T03:00:00.000Z",
  all_day: false,
  date_note: "Jadwal terkonfirmasi",
  location_name: "Lokasi Indonesia",
  address: "Alamat Indonesia",
  latitude: -8.5,
  longitude: 116.1,
  google_maps_url: "https://maps.example.test/event",
  organizer: "Penyelenggara Indonesia",
  contact_phone: null,
  contact_consent_confirmed: false,
  visitor_information: "Informasi pengunjung Indonesia",
  thumbnail_path: "cultural-event/event/primary.jpg",
  thumbnail_bucket: "tourism-media",
  status: "published",
  is_featured: false,
  slug: OLD_SLUG,
  updated_at: "2038-08-10T10:00:00.000Z",
  ...overrides,
});

const completeInput = (overrides = {}) => ({
  title: "English Cultural Event",
  summary: "English summary",
  description: "English description",
  event_type: "Festival",
  date_note: "Confirmed date note",
  location_name: "English location",
  address: "English address",
  organizer: "English organizer",
  visitor_information: "English visitor information",
  ...overrides,
});

const translation = (overrides = {}) => ({
  id: TRANSLATION_ID,
  cultural_event_id: EVENT_ID,
  locale: "en",
  title: "English Cultural Event",
  summary: "English summary",
  description: "English description",
  event_type: "Festival",
  date_note: "Confirmed date note",
  location_name: "English location",
  address: "English address",
  organizer: "English organizer",
  visitor_information: "English visitor information",
  translation_status: "draft",
  review_state: "pending",
  published_at: null,
  edit_revision: REVISION,
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
    for (const [field, value] of Object.entries(
      completeInput(options.inputOverrides),
    )) {
      formData.set(field, value);
    }
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

async function loadActions(runtime) {
  const actionSource = read("features/cultural-event-translation/actions.ts")
    .replace(/^"use server";\s*/m, "")
    .replace(/import\s+[\s\S]*?from\s+["'][^"']+["'];\s*/g, "");
  const stripped = stripTypeScriptTypes(actionSource, { mode: "strip" });
  const key = `__culturalEventParentDeps_${Math.random().toString(36).slice(2)}`;
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
    isValidCulturalEventId,
    queryCulturalEventTranslationAdminData: (...args) => runtime.query(...args),
    createCulturalEventTranslationActionState,
    validateCulturalEventTranslationForEligibility,
    validateCulturalEventTranslationForSource,
    validateCulturalEventTranslationFormData: (formData) =>
      (
        globalThis.__culturalEventParentModel ?? {}
      ).validateCulturalEventTranslationFormData(formData),
  };
  try {
    return await import(
      `data:text/javascript;charset=utf-8,${encodeURIComponent(
        `const deps = globalThis.${key};
const { revalidatePublicDomainPaths, revalidatePublicDomainDetailPaths,
  revalidatePath, requireAdministrator, createClient,
  isValidCulturalEventId, queryCulturalEventTranslationAdminData,
  createCulturalEventTranslationActionState,
  validateCulturalEventTranslationForEligibility,
  validateCulturalEventTranslationForSource,
  validateCulturalEventTranslationFormData } = deps;
${stripped}`,
      )}`
    );
  } finally {
    delete globalThis[key];
  }
}

const modelModule =
  await import("../features/cultural-event-translation/model.ts");
globalThis.__culturalEventParentModel = modelModule;
const runtime = createRuntime();
const actions = await loadActions(runtime);

async function invoke({
  intent,
  currentTranslation,
  refreshed,
  sourceOverrides = {},
  inputOverrides = {},
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
    if (readCount === 1) {
      return {
        success: true,
        source: trustedSource,
        slug: OLD_SLUG,
        translation: currentTranslation,
        history: [],
      };
    }
    return (
      refreshed ?? {
        success: true,
        source: trustedSource,
        slug: OLD_SLUG,
        translation: currentTranslation,
        history: [],
      }
    );
  };
  const initialState = createCulturalEventTranslationActionState(
    trustedSource,
    currentTranslation,
  );
  const result = await actions.manageCulturalEventTranslation(
    EVENT_ID,
    initialState,
    formFor(intent, currentTranslation, {
      inputOverrides,
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

test("model enforces required and source-conditional Cultural Event fields", () => {
  const parsed = validateCulturalEventTranslationInput(completeInput());
  assert.equal(parsed.success, true);
  if (!parsed.success) return;
  assert.equal(parsed.data.title, "English Cultural Event");

  const sourceWithoutOptional = source({
    summary: null,
    event_type: "",
    date_note: null,
    location_name: null,
    address: null,
    organizer: null,
    visitor_information: null,
  });
  const invented = validateCulturalEventTranslationForSource(
    sourceWithoutOptional,
    {
      title: "English Cultural Event",
      summary: "Invented summary",
      description: "English description",
      event_type: null,
      date_note: null,
      location_name: null,
      address: null,
      organizer: null,
      visitor_information: null,
    },
  );
  assert.equal(invented.success, false);
  assert.ok(invented.fieldErrors.summary);

  const eligible = validateCulturalEventTranslationForEligibility(
    source(),
    parsed.data,
  );
  assert.equal(eligible.success, true);
});

test("lifecycle labels are presentation of database-derived state", () => {
  assert.equal(
    getCulturalEventTranslationLifecycleLabel("draft", "pending", false, true),
    "Awaiting review",
  );
  assert.equal(
    getCulturalEventTranslationLifecycleLabel("stale", "reviewed"),
    "Stale",
  );
  assert.equal(
    getCulturalEventTranslationLifecycleLabel("published", "reviewed"),
    "Published",
  );
  assert.equal(
    getCulturalEventTranslationLifecycleLabel("draft", null, true),
    "Source blocked",
  );
});

test("all parent lifecycle intents map to approved RPCs", async () => {
  const cases = [
    ["save-draft", null, ["cultural_event_translation_save_draft"]],
    [
      "review",
      translation(),
      [
        "cultural_event_translation_save_draft",
        "cultural_event_translation_review",
      ],
    ],
    ["reject", translation(), ["cultural_event_translation_reject"]],
    [
      "publish",
      translation({ review_state: "reviewed", publication_eligibility: true }),
      ["cultural_event_translation_publish"],
    ],
    [
      "republish",
      translation({
        translation_status: "published",
        review_state: "reviewed",
        published_at: "2038-08-10T00:00:00.000Z",
        publication_eligibility: true,
      }),
      ["cultural_event_translation_republish"],
    ],
    [
      "archive",
      translation({
        translation_status: "published",
        review_state: "reviewed",
      }),
      ["cultural_event_translation_archive"],
    ],
    [
      "unpublish",
      translation({
        translation_status: "published",
        review_state: "reviewed",
      }),
      ["cultural_event_translation_unpublish"],
    ],
    [
      "restore",
      translation({ translation_status: "archived", review_state: "pending" }),
      ["cultural_event_translation_restore"],
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
      assert.equal(runtime.calls[0].args.p_cultural_event_id, EVENT_ID);
      for (const [field, value] of Object.entries(completeInput())) {
        assert.equal(runtime.calls[0].args[`p_${field}`], value, field);
      }
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

test("authorization failure happens before reads, RPCs, and revalidation for every intent", async () => {
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

test("real action rejects invented English for a source-empty optional field", async () => {
  const { result } = await invoke({
    intent: "save-draft",
    currentTranslation: null,
    sourceOverrides: {
      summary: null,
      event_type: null,
      date_note: null,
      location_name: null,
      address: null,
      organizer: null,
      visitor_information: null,
    },
    inputOverrides: { summary: "Invented English summary" },
  });
  assert.equal(result.kind, "validation-error");
  assert.deepEqual(runtime.calls, []);
  assert.deepEqual(runtime.paths, []);
});

test("real parent action rejects invention for every conditional source-empty field", async () => {
  const fields = [
    "summary",
    "event_type",
    "date_note",
    "location_name",
    "address",
    "organizer",
    "visitor_information",
  ];
  for (const field of fields) {
    const { result } = await invoke({
      intent: "save-draft",
      currentTranslation: null,
      sourceOverrides: {
        summary: null,
        event_type: null,
        date_note: null,
        location_name: null,
        address: null,
        organizer: null,
        visitor_information: null,
      },
      inputOverrides: { [field]: `Invented ${field}` },
    });
    assert.equal(result.kind, "validation-error", field);
    assert.deepEqual(runtime.calls, [], field);
    assert.deepEqual(runtime.paths, [], field);
  }
});

test("real parent action accepts empty English for source-empty conditional fields", async () => {
  for (const field of ["summary", "event_type"]) {
    for (const sourceValue of [null, "   "]) {
      const { result } = await invoke({
        intent: "save-draft",
        currentTranslation: null,
        sourceOverrides: { [field]: sourceValue },
        inputOverrides: { [field]: "" },
      });
      assert.equal(result.kind, "success", `${field}:${sourceValue}`);
      assert.equal(runtime.calls.length, 1, `${field}:${sourceValue}`);
      assert.equal(runtime.calls[0].args[`p_${field}`], null, field);
    }
  }
});

test("terminology confirmation is required before the review RPC", async () => {
  const { result } = await invoke({
    intent: "review",
    currentTranslation: translation(),
    omitConfirmation: true,
  });
  assert.equal(result.kind, "validation-error");
  assert.deepEqual(runtime.calls, []);
  assert.deepEqual(runtime.paths, []);
});

test("successful mutation invalidates trusted old and refreshed new slug paths", async () => {
  const { result } = await invoke({
    intent: "save-draft",
    currentTranslation: null,
    clientSlug: "attacker-slug",
    refreshed: {
      success: true,
      source: source({ slug: NEW_SLUG }),
      slug: NEW_SLUG,
      translation: null,
      history: [],
    },
  });
  assert.ok(
    runtime.paths.includes(`/en/cultural-events/${OLD_SLUG}`),
    JSON.stringify({ paths: runtime.paths, events: runtime.events, result }),
  );
  assert.ok(runtime.paths.includes(`/en/cultural-events/${NEW_SLUG}`));
  assert.ok(!runtime.paths.some((path) => path.includes("attacker-slug")));
  assert.deepEqual(runtime.events.slice(0, 5), [
    "authorization",
    "authoritative-read",
    "rpc:cultural_event_translation_save_draft",
    "revalidate:/admin/acara-budaya",
    "revalidate:/admin/acara-budaya/c8100000-0000-4000-8000-000000000001/edit",
  ]);
  assert.ok(
    runtime.events.indexOf("rpc:cultural_event_translation_save_draft") <
      runtime.events.indexOf("revalidate:/en/cultural-events"),
  );
});

test("crafted parent authority fields cannot change mutation or revalidation authority", async () => {
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
  assert.equal(runtime.calls[0].args.p_cultural_event_id, EVENT_ID);
  assert.ok(!runtime.paths.some((path) => path.includes("attacker-slug")));
});

test("successful mutation invalidates known paths even when refresh fails", async () => {
  const { result } = await invoke({
    intent: "save-draft",
    currentTranslation: null,
    refreshed: { success: false, kind: "read-error", source: null },
  });
  assert.ok(runtime.paths.includes("/en/cultural-events"));
  assert.ok(runtime.paths.includes(`/en/cultural-events/${OLD_SLUG}`));
  assert.equal(result.kind, "database-error");
});

test("failed parent mutation performs no success revalidation", async () => {
  await invoke({
    intent: "save-draft",
    currentTranslation: null,
    responses: [{ data: null, error: { code: "55000" } }],
  });
  assert.deepEqual(runtime.paths, []);
});

test("translation module never directly accesses translation or history tables", () => {
  const sourceText = read("features/cultural-event-translation/actions.ts");
  const dataText = read("features/cultural-event-translation/data.ts");
  assert.doesNotMatch(
    `${sourceText}\n${dataText}`,
    /cultural_event_translations|cultural_event_translation_review_events/,
  );
  assert.match(sourceText, /requireAdministrator\(\)/);
});

test("Cultural Event edit page keeps the Indonesian editor and mounts both translation sections", () => {
  const page = read("app/admin/acara-budaya/[id]/edit/page.tsx");
  assert.match(page, /getCulturalEventEditorData/);
  assert.match(page, /<CulturalEventForm/);
  assert.match(page, /<CulturalEventTranslationForm/);
  assert.match(page, /<CulturalEventImageTranslationForm/);
  assert.match(page, /sourceContext={imageTranslationResult\.sourceContext}/);
  assert.doesNotMatch(
    page,
    /cultural_event_translations|cultural_event_translation_review_events/,
  );
});

test("parent form keeps Indonesian source values outside English defaults", () => {
  const form = read(
    "features/cultural-event-translation/cultural-event-translation-form.tsx",
  );
  for (const field of [
    "title",
    "summary",
    "description",
    "event_type",
    "date_note",
    "location_name",
    "address",
    "organizer",
    "visitor_information",
  ]) {
    assert.match(form, new RegExp(`defaultValue={state\\.values\\[field\\]}`));
    assert.match(form, new RegExp(`field: "${field}"`));
  }
  assert.doesNotMatch(form, /defaultValue={sourceReference/);
  assert.match(form, /never copies or falls back/);
  assert.match(form, /Source slug/);
  assert.match(form, /sourceReference\.slug/);
  assert.match(form, /Source updated \(WITA\)/);
  assert.match(form, /sourceReference\.updated_at/);
  assert.doesNotMatch(form, /name="source(Slug|Revision|Updated)/);
});
