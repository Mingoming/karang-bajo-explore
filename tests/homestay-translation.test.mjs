import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";
import { createPublicRevalidationMock } from "./public-revalidation-test-helpers.mjs";

import {
  createHomestayTranslationActionState,
  emptyHomestayTranslationFormValues,
  getHomestayTranslationLifecycleLabel,
  validateHomestayTranslationForEligibility,
  validateHomestayTranslationForSource,
  validateHomestayTranslationInput,
} from "../features/homestay-translation/model.ts";
import { isValidHomestayId } from "../features/homestays/model.ts";

const read = (path) => readFileSync(path, "utf8");
const HOMESTAY_ID = "10000000-0000-4000-8000-000000000001";
const TRANSLATION_ID = "20000000-0000-4000-8000-000000000001";
const REVISION = 4;
const TRUSTED_SLUG = "homestay-karang-bajo";

const source = (overrides = {}) => ({
  id: HOMESTAY_ID,
  name: "Homestay Karang Bajo",
  description: "Deskripsi homestay sumber",
  address: "Alamat sumber",
  price_note: "Catatan harga sumber",
  facilities: ["Wi-Fi", "Dapur"],
  slug: TRUSTED_SLUG,
  source_revision: 2,
  status: "published",
  updated_at: "2026-08-11T10:00:00.000Z",
  ...overrides,
});

const completeInput = (overrides = {}) => ({
  name: "Karang Bajo Homestay",
  description: "An approved English homestay description.",
  address: "English address",
  price_note: "Breakfast information",
  facilities: "Wi-Fi\nKitchen",
  ...overrides,
});

const translation = (overrides = {}) => ({
  id: TRANSLATION_ID,
  homestay_id: HOMESTAY_ID,
  locale: "en",
  name: "Karang Bajo Homestay",
  description: "An approved English homestay description.",
  address: "English address",
  price_note: "Breakfast information",
  facilities: ["Wi-Fi", "Kitchen"],
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

function parentForm(
  intent,
  current,
  { input = {}, confirmation = "on", clientSlug } = {},
) {
  const formData = new FormData();
  formData.set("intent", intent);
  formData.set("translation_id", current?.id ?? "");
  formData.set("edit_revision", current ? String(current.edit_revision) : "");
  if (intent === "save-draft" || intent === "review") {
    for (const [field, value] of Object.entries(completeInput(input))) {
      formData.set(field, value);
    }
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
  const actionSource = read("features/homestay-translation/actions.ts")
    .replace(/^"use server";\s*/m, "")
    .replace(/import\s+[\s\S]*?from\s+["'][^"']+["'];\s*/g, "");
  const stripped = stripTypeScriptTypes(actionSource, { mode: "strip" });
  const key = `__homestayTranslationDeps_${Math.random().toString(36).slice(2)}`;
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
    queryHomestayTranslationAdminData: (...args) => runtime.query(...args),
    createHomestayTranslationActionState,
    validateHomestayTranslationForEligibility,
    validateHomestayTranslationForSource,
    validateHomestayTranslationFormData: (formData) => {
      const input = {};
      for (const field of new Set(formData.keys())) {
        const values = formData.getAll(field);
        input[field] = values.length === 1 ? values[0] : values;
      }
      return validateHomestayTranslationInput(input);
    },
  };
  try {
    return await import(
      `data:text/javascript;charset=utf-8,${encodeURIComponent(`
const deps = globalThis.${key};
const { revalidatePublicDomainPaths, revalidatePublicDomainDetailPaths,
  revalidatePath, requireAdministrator, createClient, isValidHomestayId,
  queryHomestayTranslationAdminData, createHomestayTranslationActionState,
  validateHomestayTranslationForEligibility, validateHomestayTranslationForSource,
  validateHomestayTranslationFormData } = deps;
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
  trustedSource = source(),
  refreshed,
  input,
  confirmation = "on",
  clientSlug,
  responses = [],
  denyAuthorization = false,
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
  let readCount = 0;
  runtime.query = async (supabase, id) => {
    assert.equal(supabase, runtime.client);
    assert.equal(id, HOMESTAY_ID);
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
      };
    }
    return (
      refreshed ?? {
        success: true,
        source: trustedSource,
        slug: trustedSource.slug,
        translation: current,
        history: [],
      }
    );
  };
  const initial = createHomestayTranslationActionState(trustedSource, current);
  const action = (await actions).manageHomestayTranslation;
  const result = await action(
    HOMESTAY_ID,
    initial,
    parentForm(intent, current, { input, confirmation, clientSlug }),
  );
  return {
    result,
    calls: runtime.calls,
    events: runtime.events,
    paths: runtime.paths,
    authCalls: runtime.authCalls,
  };
}

test("Homestay parent model starts empty and never falls back to Indonesian values", () => {
  assert.deepEqual(emptyHomestayTranslationFormValues(), {
    name: "",
    description: "",
    address: "",
    price_note: "",
    facilities: "",
  });
  assert.notEqual(emptyHomestayTranslationFormValues().name, source().name);
});

test("Homestay optional source-mirroring rules preserve empty fields and reject invention", () => {
  for (const [field, sourceValue, inputValue] of [
    ["address", null, "Invented address"],
    ["price_note", "", "Invented price note"],
    ["facilities", [], "Invented facility"],
  ]) {
    const parsed = validateHomestayTranslationInput(
      completeInput({ [field]: inputValue }),
    );
    assert.equal(parsed.success, true, field);
    if (!parsed.success) continue;
    assert.equal(
      validateHomestayTranslationForSource(
        source({ [field]: sourceValue }),
        parsed.data,
      ).success,
      false,
      field,
    );
  }
  const empty = validateHomestayTranslationInput(
    completeInput({ address: "", price_note: "", facilities: "" }),
  );
  assert.equal(empty.success, true);
  if (!empty.success) return;
  assert.equal(
    validateHomestayTranslationForSource(
      source({ address: null, price_note: null, facilities: [] }),
      empty.data,
    ).success,
    true,
  );
  assert.equal(
    validateHomestayTranslationForEligibility(
      source({ address: null, price_note: null, facilities: [] }),
      empty.data,
    ).success,
    true,
  );
});

test("Homestay lifecycle presentation is database-state driven", () => {
  for (const [state, label] of [
    ["draft", "Draft"],
    ["reviewed", "Reviewed"],
    ["published", "Published"],
    ["stale", "Stale"],
    ["archived", "Archived"],
    ["source-blocked", "Source blocked"],
  ]) {
    const value = createHomestayTranslationActionState(
      source(),
      translation({ lifecycle_state: state }),
    );
    assert.equal(value.lifecycleState, state);
    assert.equal(
      getHomestayTranslationLifecycleLabel(value.lifecycleState),
      label,
    );
  }
  const form = read(
    "features/homestay-translation/homestay-translation-form.tsx",
  );
  assert.match(form, /Kirim untuk review/);
  assert.match(form, /source\.slug|sourceReference/);
});

test("all Homestay lifecycle intents use exact RPCs, revisions, IDs, and trusted arguments", async () => {
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
    "save-draft": ["homestay_translation_save_draft"],
    review: ["homestay_translation_save_draft", "homestay_translation_review"],
    reject: ["homestay_translation_reject"],
    publish: ["homestay_translation_publish"],
    republish: ["homestay_translation_republish"],
    archive: ["homestay_translation_archive"],
    unpublish: ["homestay_translation_unpublish"],
    restore: ["homestay_translation_restore"],
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
      assert.equal("p_source_revision" in call.args, false, intent);
      assert.equal("p_source_fingerprint" in call.args, false, intent);
    }
    if (intent === "save-draft" || intent === "review") {
      assert.deepEqual(invocation.calls[0].args, {
        p_homestay_id: HOMESTAY_ID,
        p_expected_edit_revision: REVISION,
        p_name: "Karang Bajo Homestay",
        p_description: "An approved English homestay description.",
        p_address: "English address",
        p_price_note: "Breakfast information",
        p_facilities: ["Wi-Fi", "Kitchen"],
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

test("authorization failure aborts all eight intents before any read, mutation, or revalidation", async () => {
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

test("real parent action rejects invented optional content without an RPC and accepts source-empty values", async () => {
  for (const [field, value] of [
    ["address", "Invented address"],
    ["price_note", "Invented price note"],
    ["facilities", "Invented facility"],
  ]) {
    const invocation = await invoke({
      intent: "save-draft",
      trustedSource: source({ [field]: field === "facilities" ? [] : null }),
      input: { [field]: value },
    });
    assert.equal(invocation.result.kind, "validation-error", field);
    assert.deepEqual(invocation.calls, [], field);
    assert.deepEqual(invocation.paths, [], field);
  }
  const allowed = await invoke({
    intent: "save-draft",
    trustedSource: source({ address: null, price_note: null, facilities: [] }),
    input: { address: "", price_note: "", facilities: "" },
  });
  assert.equal(allowed.result.kind, "success");
  assert.deepEqual(allowed.calls[0].args, {
    p_homestay_id: HOMESTAY_ID,
    p_expected_edit_revision: REVISION,
    p_name: "Karang Bajo Homestay",
    p_description: "An approved English homestay description.",
    p_address: null,
    p_price_note: null,
    p_facilities: [],
  });
});

test("successful mutation happens before revalidation and refresh failure preserves trusted invalidation", async () => {
  const successful = await invoke({ intent: "save-draft" });
  assert.ok(
    successful.events.indexOf("authorization") <
      successful.events.indexOf("authoritative-read"),
  );
  assert.ok(
    successful.events.indexOf("authoritative-read") <
      successful.events.indexOf("rpc:homestay_translation_save_draft"),
  );
  assert.ok(
    successful.events.indexOf("rpc:homestay_translation_save_draft") <
      successful.events.findIndex((event) => event.startsWith("revalidate:")),
  );
  assert.ok(
    successful.events.indexOf("post-mutation-refresh") >
      successful.events.findIndex((event) => event.startsWith("revalidate:")),
  );

  const refreshFailed = await invoke({
    intent: "archive",
    current: translation({
      translation_status: "published",
      review_state: "reviewed",
      published_at: "2026-08-11T10:00:00.000Z",
      lifecycle_state: "published",
    }),
    refreshed: { success: false, kind: "read-error" },
    clientSlug: "attacker-slug",
  });
  assert.equal(refreshFailed.result.kind, "database-error");
  assert.deepEqual(refreshFailed.paths, [
    "/admin/homestay",
    `/admin/homestay/${HOMESTAY_ID}/edit`,
    "/homestay",
    "/en/homestays",
    "/en",
    "/en/tourism-map",
    `/homestay/${TRUSTED_SLUG}`,
    `/en/homestays/${TRUSTED_SLUG}`,
  ]);
});

test("translation features use RPC-only access and preserve the Indonesian editor", () => {
  const featureSource = [
    "features/homestay-translation/actions.ts",
    "features/homestay-translation/data.ts",
    "features/homestay-translation/model.ts",
    "features/homestay-translation/homestay-translation-form.tsx",
  ]
    .map(read)
    .join("\n");
  for (const table of [
    "homestay_translations",
    "homestay_translation_review_events",
  ]) {
    assert.doesNotMatch(featureSource, new RegExp(`\\b${table}\\b`), table);
  }
  assert.match(featureSource, /homestay_translation_admin_read/);
  assert.match(featureSource, /homestay_translation_review_history/);
  assert.match(read("app/admin/homestay/[id]/edit/page.tsx"), /<HomestayForm/);
});
