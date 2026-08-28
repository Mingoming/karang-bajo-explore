import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";

import {
  createTourismPackageTranslationActionState,
  emptyTourismPackageTranslationFormValues,
  isTourismPackageTranslationRecord,
  validateTourismPackageTranslationForEligibility,
  validateTourismPackageTranslationForSource,
  validateTourismPackageTranslationInput,
} from "../features/tourism-package-translation/model.ts";

const read = (path) => readFileSync(path, "utf8");
const PACKAGE_ID = "10000000-0000-4000-8000-000000000001";
const TRANSLATION_ID = "20000000-0000-4000-8000-000000000001";
const REVISION = 4;
const TRUSTED_SLUG = "paket-jelajah-karang-bajo";

const source = (overrides = {}) => ({
  id: PACKAGE_ID,
  name: "Paket Jelajah Karang Bajo",
  slug: TRUSTED_SLUG,
  package_type: "standard",
  duration_value: 2,
  duration_unit: "hari",
  price: 250000,
  price_note: "Termasuk pemandu",
  included_facilities: ["Pemandu", "Makan siang"],
  souvenir: "Kain tenun",
  summary: "Paket wisata dua hari",
  description: "Deskripsi paket sumber yang telah diverifikasi.",
  thumbnail_path: "tourism-package/10000000/thumbnail.webp",
  thumbnail_bucket: "tourism-media",
  is_featured: true,
  display_order: 1,
  status: "published",
  published_at: "2026-08-11T10:00:00.000Z",
  updated_at: "2026-08-11T10:00:00.000Z",
  aggregate_revision: 3,
  ...overrides,
});

const translation = (overrides = {}) => ({
  id: TRANSLATION_ID,
  tourism_package_id: PACKAGE_ID,
  locale: "en",
  name: "Karang Bajo Exploration Package",
  duration_unit: "days",
  price_note: "Guide included",
  included_facilities: ["Guide", "Lunch"],
  souvenir: "Woven cloth",
  summary: "A two-day tourism package",
  description: "An approved English package description.",
  translation_status: "draft",
  review_state: "pending",
  captured_source_revision: null,
  captured_source_token: null,
  captured_relationship_revision: null,
  captured_relationship_token: null,
  captured_thumbnail_media_fingerprint: null,
  translation_fingerprint: null,
  contract_version: "tourism-package-v1",
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
  source_slug: TRUSTED_SLUG,
  aggregate_revision: 3,
  source_updated_at: "2026-08-11T10:00:00.000Z",
  source_status: "published",
  lifecycle_state: "draft",
  source_blocked: false,
  source_blocked_reason: null,
  stale_source_token: false,
  stale_relationship_token: false,
  stale_thumbnail_media_fingerprint: false,
  stale_translation_fingerprint: false,
  public_eligibility: false,
  review_eligibility: true,
  publication_eligibility: false,
  eligibility_reason: "review is required",
  ...overrides,
});

const itinerary = [
  {
    relationId: "40000000-0000-4000-8000-000000000001",
    destinationId: "50000000-0000-4000-8000-000000000001",
    displayOrder: 0,
    notes: "Berangkat pagi",
    destinationName: "Kampung Adat",
    destinationStatus: "published",
    englishEligible: true,
  },
];

function completeInput(overrides = {}) {
  return {
    name: "Karang Bajo Exploration Package",
    duration_unit: "days",
    price_note: "Guide included",
    included_facilities: "Guide\nLunch",
    souvenir: "Woven cloth",
    summary: "A two-day tourism package",
    description: "An approved English package description.",
    ...overrides,
  };
}

function parentForm(
  intent,
  current,
  { input = {}, confirmation = "on", clientSlug, clientTranslationId } = {},
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
  if (intent === "review") {
    formData.set("terminology_review_confirmed", confirmation);
  }
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
    revalidationError: null,
    current: null,
    refresh: null,
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
  const actionSource = read("features/tourism-package-translation/actions.ts")
    .replace(/^"use server";\s*/m, "")
    .replace(/import\s+[\s\S]*?from\s+["'][^"']+["'];\s*/g, "");
  const stripped = stripTypeScriptTypes(actionSource, { mode: "strip" });
  const key = `__tourismPackageTranslationDeps_${Math.random().toString(36).slice(2)}`;
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
    queryTourismPackageTranslationAdminData: (...args) =>
      runtime.query(...args),
    createTourismPackageTranslationActionState,
    validateTourismPackageTranslationForEligibility,
    validateTourismPackageTranslationForSource,
    validateTourismPackageTranslationFormData: (formData) => {
      const input = {};
      for (const field of new Set(formData.keys())) {
        const values = formData.getAll(field);
        input[field] = values.length === 1 ? values[0] : values;
      }
      return validateTourismPackageTranslationInput(input);
    },
  };
  try {
    return await import(
      `data:text/javascript;charset=utf-8,${encodeURIComponent(`
const deps = globalThis.${key};
const { revalidatePath, requireAdministrator, createClient,
  isValidTourismPackageId, queryTourismPackageTranslationAdminData,
  createTourismPackageTranslationActionState,
  validateTourismPackageTranslationForEligibility,
  validateTourismPackageTranslationForSource,
  validateTourismPackageTranslationFormData } = deps;
${stripped}`)}`
    );
  } finally {
    delete globalThis[key];
  }
}

const runtime = createRuntime();
const actions = loadActions(runtime);

function validUuid(value) {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

const parentHistoryEvent = () => ({
  id: "60000000-0000-4000-8000-000000000001",
  event_type: "draft_saved",
  previous_translation_status: "draft",
  new_translation_status: "draft",
  previous_review_state: "pending",
  new_review_state: "pending",
  occurred_at: "2026-08-11T10:00:00.000Z",
  reason: null,
});

function createTranslationDataRuntime() {
  const destinationId = itinerary[0].destinationId;
  const dataRuntime = {
    sourceResult: { success: true, tourismPackage: source() },
    relationsResult: {
      success: true,
      relations: [
        {
          id: itinerary[0].relationId,
          destinationId,
          displayOrder: 0,
          notes: itinerary[0].notes,
          createdAt: "2026-08-11T10:00:00.000Z",
          createdBy: "30000000-0000-4000-8000-000000000001",
        },
      ],
    },
    optionsResult: {
      success: true,
      options: [
        { id: destinationId, name: "Kampung Adat", status: "published" },
      ],
    },
    englishRows: [{ id: destinationId }],
    englishError: null,
    translationRows: [translation()],
    translationError: null,
    historyRows: [parentHistoryEvent()],
    historyError: null,
    queryError: null,
    calls: [],
  };
  dataRuntime.client = {
    from(table) {
      dataRuntime.calls.push({ kind: "from", table });
      const chain = {
        select(columns) {
          dataRuntime.calls.push({ kind: "select", columns });
          return chain;
        },
        in(column, values) {
          dataRuntime.calls.push({ kind: "in", column, values });
          return chain;
        },
        overrideTypes() {
          return Promise.resolve({
            data: dataRuntime.englishRows,
            error: dataRuntime.englishError,
          });
        },
      };
      return chain;
    },
    rpc(name, args) {
      dataRuntime.calls.push({ kind: "rpc", name, args });
      return {
        returns() {
          return Promise.resolve(
            name === "tourism_package_translation_admin_read"
              ? {
                  data: dataRuntime.translationRows,
                  error: dataRuntime.translationError,
                }
              : {
                  data: dataRuntime.historyRows,
                  error: dataRuntime.historyError,
                },
          );
        },
      };
    },
  };
  return dataRuntime;
}

async function loadTranslationData(dataRuntime) {
  const dataSource = read(
    "features/tourism-package-translation/data.ts",
  ).replace(/import\s+[\s\S]*?from\s+["'][^"']+["'];\s*/g, "");
  const stripped = stripTypeScriptTypes(dataSource, { mode: "strip" });
  const key = `__tourismPackageTranslationDataDeps_${Math.random().toString(36).slice(2)}`;
  globalThis[key] = {
    requireAdministrator: async () => ({ id: "database-derived-admin" }),
    createClient: async () => dataRuntime.client,
    isValidTourismPackageId: validUuid,
    isValidDestinationId: validUuid,
    queryTourismPackageById: () => {
      if (dataRuntime.queryError) throw dataRuntime.queryError;
      return dataRuntime.sourceResult;
    },
    queryPackageRelations: () => dataRuntime.relationsResult,
    queryDestinationOptions: () => dataRuntime.optionsResult,
    isTourismPackageTranslationRecord,
  };
  try {
    return await import(
      `data:text/javascript;charset=utf-8,${encodeURIComponent(`
const deps = globalThis.${key};
const { requireAdministrator, createClient, isValidTourismPackageId,
  isValidDestinationId, queryTourismPackageById, queryPackageRelations,
  queryDestinationOptions, isTourismPackageTranslationRecord } = deps;
${stripped}`)}`
    );
  } finally {
    delete globalThis[key];
  }
}

const translationDataRuntime = createTranslationDataRuntime();
const translationData = loadTranslationData(translationDataRuntime);

async function invoke({
  intent,
  current = translation(),
  trustedSource = source(),
  refreshed,
  input,
  confirmation = "on",
  clientSlug,
  responses = [],
  denyAuthorization = false,
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
        source: trustedSource,
        slug: trustedSource.slug,
        translation: current,
        history: [],
        itinerary,
      };
    }
    return (
      refreshed ?? {
        success: true,
        source: trustedSource,
        slug: trustedSource.slug,
        translation: current,
        history: [],
        itinerary,
      }
    );
  };
  const initial = createTourismPackageTranslationActionState(
    trustedSource,
    current,
  );
  const action = (await actions).manageTourismPackageTranslation;
  const result = await action(
    PACKAGE_ID,
    initial,
    parentForm(intent, current, {
      input,
      confirmation,
      clientSlug,
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

test("parent translation model has only frozen translated fields and no Indonesian fallback", () => {
  assert.deepEqual(emptyTourismPackageTranslationFormValues(), {
    name: "",
    duration_unit: "",
    price_note: "",
    included_facilities: "",
    souvenir: "",
    summary: "",
    description: "",
  });
  assert.notEqual(
    emptyTourismPackageTranslationFormValues().name,
    source().name,
  );
  assert.notEqual(
    emptyTourismPackageTranslationFormValues().summary,
    source().description,
  );
});

test("required and nullable package translation validation is fail-closed", () => {
  const whitespace = validateTourismPackageTranslationInput(
    completeInput({ name: " ", duration_unit: "\t", description: "" }),
  );
  assert.equal(whitespace.success, true);
  if (!whitespace.success) return;
  assert.equal(
    validateTourismPackageTranslationForEligibility(source(), whitespace.data)
      .success,
    false,
  );

  const emptyOptional = validateTourismPackageTranslationInput(
    completeInput({ price_note: " ", souvenir: "", summary: "" }),
  );
  assert.equal(emptyOptional.success, true);
  if (!emptyOptional.success) return;
  assert.equal(emptyOptional.data.price_note, null);
  assert.equal(emptyOptional.data.souvenir, null);
  assert.equal(emptyOptional.data.summary, null);
});

test("source mirroring enforces optional parity and facility cardinality", () => {
  const invented = validateTourismPackageTranslationInput(
    completeInput({ price_note: "Invented price note" }),
  );
  assert.equal(invented.success, true);
  if (!invented.success) return;
  assert.equal(
    validateTourismPackageTranslationForSource(
      source({ price_note: null }),
      invented.data,
    ).success,
    false,
  );

  const emptySource = validateTourismPackageTranslationInput(
    completeInput({
      price_note: "",
      souvenir: "",
      summary: "",
      included_facilities: "",
    }),
  );
  assert.equal(emptySource.success, true);
  if (!emptySource.success) return;
  assert.equal(
    validateTourismPackageTranslationForEligibility(
      source({
        price_note: null,
        souvenir: null,
        summary: null,
        included_facilities: [],
      }),
      emptySource.data,
    ).success,
    true,
  );

  const wrongFacilities = validateTourismPackageTranslationInput(
    completeInput({ included_facilities: "Only one" }),
  );
  assert.equal(wrongFacilities.success, true);
  if (!wrongFacilities.success) return;
  assert.equal(
    validateTourismPackageTranslationForEligibility(
      source(),
      wrongFacilities.data,
    ).success,
    false,
  );
});

test("unknown source structures are rejected and DB payload mapper fails closed", () => {
  const result = validateTourismPackageTranslationInput({
    ...completeInput(),
    notes: "must never become translated content",
    package_type: "premium",
  });
  assert.equal(result.success, false);
  assert.equal(isTourismPackageTranslationRecord({ id: PACKAGE_ID }), false);
});

test("all parent lifecycle intents use exact RPCs, revisions, IDs, and admin-only revalidation", async () => {
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
    "save-draft": ["tourism_package_translation_save_draft"],
    review: [
      "tourism_package_translation_save_draft",
      "tourism_package_translation_review",
    ],
    reject: ["tourism_package_translation_reject"],
    publish: ["tourism_package_translation_publish"],
    republish: ["tourism_package_translation_republish"],
    archive: ["tourism_package_translation_archive"],
    unpublish: ["tourism_package_translation_unpublish"],
    restore: ["tourism_package_translation_restore"],
  };
  for (const [intent, current] of Object.entries(cases)) {
    const invocation = await invoke({
      intent,
      current,
      clientSlug: "attacker-slug",
    });
    assert.equal(invocation.authCalls, 1, intent);
    assert.deepEqual(
      invocation.calls.map((call) => call.name),
      expected[intent],
      intent,
    );
    for (const call of invocation.calls) {
      assert.equal("p_actor" in call.args, false, intent);
      assert.equal("p_slug" in call.args, false, intent);
      assert.equal("p_source_revision" in call.args, false, intent);
      assert.equal("p_aggregate_revision" in call.args, false, intent);
      assert.equal("p_fingerprint" in call.args, false, intent);
    }
    assert.deepEqual(invocation.paths, [
      "/admin/paket-wisata",
      `/admin/paket-wisata/${PACKAGE_ID}/edit`,
    ]);
    if (intent === "save-draft" || intent === "review") {
      assert.deepEqual(invocation.calls[0].args, {
        p_tourism_package_id: PACKAGE_ID,
        p_expected_edit_revision: REVISION,
        p_name: "Karang Bajo Exploration Package",
        p_duration_unit: "days",
        p_price_note: "Guide included",
        p_included_facilities: ["Guide", "Lunch"],
        p_souvenir: "Woven cloth",
        p_summary: "A two-day tourism package",
        p_description: "An approved English package description.",
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
  }
});

test("authorization failure aborts parent lifecycle before read or RPC", async () => {
  await assert.rejects(
    () => invoke({ intent: "save-draft", denyAuthorization: true }),
    /administrator authorization required/,
  );
  assert.equal(runtime.authCalls, 1);
  assert.deepEqual(runtime.events, ["authorization"]);
  assert.deepEqual(runtime.calls, []);
  assert.deepEqual(runtime.paths, []);
});

test("invented optional content is rejected before mutation and client slug has no authority", async () => {
  const invocation = await invoke({
    intent: "save-draft",
    trustedSource: source({ price_note: null }),
    input: { price_note: "Invented price note" },
    clientSlug: "attacker-slug",
  });
  assert.equal(invocation.result.kind, "validation-error");
  assert.deepEqual(invocation.calls, []);
  assert.deepEqual(invocation.paths, []);
});

test("successful mutation remains semantic success when post-mutation read fails", async () => {
  const invocation = await invoke({
    intent: "save-draft",
    refreshed: { success: false, kind: "read-error", source: null },
  });
  assert.equal(invocation.result.kind, "success");
  assert.match(invocation.result.message, /Perubahan tersimpan/);
  assert.deepEqual(invocation.paths, [
    "/admin/paket-wisata",
    `/admin/paket-wisata/${PACKAGE_ID}/edit`,
  ]);
  assert.ok(
    invocation.events.indexOf("rpc:tourism_package_translation_save_draft") <
      invocation.events.findIndex((event) => event.startsWith("revalidate:")),
  );
});

test("parent mutation remains semantic success when admin revalidation throws", async () => {
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

test("parent DB revision remains the final TOCTOU authority", async () => {
  const invocation = await invoke({
    intent: "save-draft",
    responses: [{ data: null, error: { code: "55000" } }],
  });
  assert.equal(invocation.result.kind, "conflict");
  assert.equal(invocation.calls.length, 1);
  assert.equal(invocation.calls[0].args.p_expected_edit_revision, REVISION);
  assert.deepEqual(invocation.paths, []);
});

test("parent translation ID is bound to the package before mutation", async () => {
  const invocation = await invoke({
    intent: "save-draft",
    clientTranslationId: "20000000-0000-4000-8000-000000000099",
  });
  assert.equal(invocation.result.kind, "conflict");
  assert.deepEqual(invocation.calls, []);
  assert.deepEqual(invocation.paths, []);
});

test("parent composite review preserves partial save semantics", async () => {
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
      "tourism_package_translation_save_draft",
      "tourism_package_translation_review",
    ],
  );
  assert.deepEqual(invocation.paths, [
    "/admin/paket-wisata",
    `/admin/paket-wisata/${PACKAGE_ID}/edit`,
  ]);
});

test("parent composite review stops after a failed save", async () => {
  const invocation = await invoke({
    intent: "review",
    responses: [{ data: null, error: { code: "23514" } }],
  });
  assert.equal(invocation.result.kind, "validation-error");
  assert.deepEqual(
    invocation.calls.map((call) => call.name),
    ["tourism_package_translation_save_draft"],
  );
  assert.deepEqual(invocation.paths, []);
});

test("parent admin data composes source, itinerary, dependency, translation, and history safely", async () => {
  const loader = await translationData;
  const ready = await loader.queryTourismPackageTranslationAdminData(
    translationDataRuntime.client,
    PACKAGE_ID,
  );
  assert.equal(ready.success, true);
  if (!ready.success) return;
  assert.equal(ready.translation?.id, TRANSLATION_ID);
  assert.equal(ready.history.length, 1);
  assert.equal(ready.itinerary[0].destinationName, "Kampung Adat");
  assert.equal(ready.itinerary[0].englishEligible, true);
  assert.deepEqual(
    translationDataRuntime.calls
      .filter((call) => call.kind === "rpc")
      .map((call) => call.name),
    [
      "tourism_package_translation_admin_read",
      "tourism_package_translation_review_history",
    ],
  );
  assert.equal(
    translationDataRuntime.calls.find((call) => call.kind === "from").table,
    "published_english_destinations",
  );

  translationDataRuntime.calls = [];
  translationDataRuntime.englishRows = [];
  const dependencyBlocked =
    await loader.queryTourismPackageTranslationAdminData(
      translationDataRuntime.client,
      PACKAGE_ID,
    );
  assert.equal(dependencyBlocked.success, true);
  if (dependencyBlocked.success) {
    assert.equal(dependencyBlocked.itinerary[0].englishEligible, false);
  }

  translationDataRuntime.translationRows = [];
  const emptyDraft = await loader.queryTourismPackageTranslationAdminData(
    translationDataRuntime.client,
    PACKAGE_ID,
  );
  assert.equal(emptyDraft.success, true);
  if (emptyDraft.success) {
    assert.equal(emptyDraft.translation, null);
    assert.deepEqual(emptyDraft.history, []);
  }

  translationDataRuntime.translationRows = {
    malformed: true,
  };
  const malformed = await loader.queryTourismPackageTranslationAdminData(
    translationDataRuntime.client,
    PACKAGE_ID,
  );
  assert.deepEqual(malformed, {
    success: false,
    kind: "read-error",
    source: null,
  });

  translationDataRuntime.translationRows = [
    translation({
      translation_status: "archived",
      lifecycle_state: "archived",
      archived_at: "2026-08-12T10:00:00.000Z",
    }),
  ];
  translationDataRuntime.historyRows = [parentHistoryEvent()];
  const archived = await loader.queryTourismPackageTranslationAdminData(
    translationDataRuntime.client,
    PACKAGE_ID,
  );
  assert.equal(archived.success, true);
  if (archived.success) {
    assert.equal(archived.translation?.translation_status, "archived");
  }

  translationDataRuntime.translationError = { code: "query-failed" };
  const queryError = await loader.queryTourismPackageTranslationAdminData(
    translationDataRuntime.client,
    PACKAGE_ID,
  );
  assert.deepEqual(queryError, {
    success: false,
    kind: "read-error",
    source: null,
  });
  translationDataRuntime.translationError = null;
  translationDataRuntime.translationRows = [translation()];
  translationDataRuntime.englishRows = [{ id: itinerary[0].destinationId }];
});

test("parent itinerary and dependency failures stay technical read errors", async () => {
  const loader = await translationData;
  const relation = {
    id: itinerary[0].relationId,
    destinationId: itinerary[0].destinationId,
    displayOrder: 0,
    notes: itinerary[0].notes,
  };
  translationDataRuntime.sourceResult = {
    success: true,
    tourismPackage: source(),
  };
  translationDataRuntime.optionsResult = {
    success: true,
    options: [
      { id: relation.destinationId, name: "Kampung Adat", status: "published" },
    ],
  };
  translationDataRuntime.translationRows = [translation()];
  translationDataRuntime.translationError = null;
  translationDataRuntime.historyError = null;
  translationDataRuntime.englishError = null;
  translationDataRuntime.queryError = null;

  translationDataRuntime.relationsResult = {
    success: true,
    relations: [relation],
  };
  translationDataRuntime.optionsResult = {
    success: true,
    options: [],
  };
  assert.deepEqual(
    await loader.queryTourismPackageTranslationAdminData(
      translationDataRuntime.client,
      PACKAGE_ID,
    ),
    { success: false, kind: "read-error", source: null },
  );

  translationDataRuntime.optionsResult = {
    success: true,
    options: [
      { id: relation.destinationId, name: "Kampung Adat", status: "published" },
    ],
  };
  translationDataRuntime.relationsResult = {
    success: true,
    relations: [{ ...relation, displayOrder: Number.NaN }],
  };
  assert.deepEqual(
    await loader.queryTourismPackageTranslationAdminData(
      translationDataRuntime.client,
      PACKAGE_ID,
    ),
    { success: false, kind: "read-error", source: null },
  );

  translationDataRuntime.relationsResult = {
    success: true,
    relations: [relation],
  };
  translationDataRuntime.englishError = { code: "dependency-query-failed" };
  assert.deepEqual(
    await loader.queryTourismPackageTranslationAdminData(
      translationDataRuntime.client,
      PACKAGE_ID,
    ),
    { success: false, kind: "read-error", source: null },
  );
  translationDataRuntime.englishError = null;
  translationDataRuntime.englishRows = [{ id: "not-a-uuid" }];
  assert.deepEqual(
    await loader.queryTourismPackageTranslationAdminData(
      translationDataRuntime.client,
      PACKAGE_ID,
    ),
    { success: false, kind: "read-error", source: null },
  );

  translationDataRuntime.englishRows = [];
  translationDataRuntime.relationsResult = {
    success: true,
    relations: [],
  };
  translationDataRuntime.optionsResult = { success: true, options: [] };
  const emptyItinerary = await loader.queryTourismPackageTranslationAdminData(
    translationDataRuntime.client,
    PACKAGE_ID,
  );
  assert.equal(emptyItinerary.success, true);
  if (emptyItinerary.success) assert.deepEqual(emptyItinerary.itinerary, []);

  translationDataRuntime.queryError = new Error("source query rejected");
  assert.deepEqual(
    await loader.queryTourismPackageTranslationAdminData(
      translationDataRuntime.client,
      PACKAGE_ID,
    ),
    { success: false, kind: "read-error", source: null },
  );
  translationDataRuntime.queryError = null;
  translationDataRuntime.relationsResult = {
    success: true,
    relations: [relation],
  };
  translationDataRuntime.optionsResult = {
    success: true,
    options: [
      { id: relation.destinationId, name: "Kampung Adat", status: "published" },
    ],
  };
  translationDataRuntime.englishRows = [{ id: relation.destinationId }];
});

test("package translation files keep translation access behind admin RPCs and do not activate public routes", () => {
  const featureSource = [
    "features/tourism-package-translation/actions.ts",
    "features/tourism-package-translation/data.ts",
    "features/tourism-package-translation/model.ts",
    "features/tourism-package-translation/tourism-package-translation-form.tsx",
  ]
    .map(read)
    .join("\n");
  assert.doesNotMatch(featureSource, /tourism_package_translations/);
  assert.doesNotMatch(
    featureSource,
    /tourism_package_translation_review_events/,
  );
  assert.match(featureSource, /tourism_package_translation_admin_read/);
  assert.match(featureSource, /tourism_package_translation_review_history/);
  assert.match(featureSource, /published_english_destinations/);
  assert.match(featureSource, /queryPackageRelations/);
  assert.doesNotMatch(featureSource, /revalidatePublicDomain/);
  assert.match(
    read("app/admin/paket-wisata/[id]/edit/page.tsx"),
    /TourismPackageTranslationForm/,
  );
  assert.match(
    read(
      "features/tourism-package-translation/tourism-package-translation-form.tsx",
    ),
    /Itinerary sumber \(read-only\)/,
  );
  assert.doesNotMatch(
    read(
      "features/tourism-package-translation/tourism-package-translation-form.tsx",
    ),
    /name="notes"/,
  );
  assert.doesNotMatch(
    read("config/public-routes.ts"),
    /tourismPackages:\s*\{[^}]*en:\s*"\/en\/tourism-packages"/s,
  );
});
