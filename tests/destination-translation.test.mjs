import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";

import { createPublicRevalidationMock } from "./public-revalidation-test-helpers.mjs";

import {
  createDestinationTranslationActionState,
  destinationTranslationToMutationValues,
  destinationTranslationToFormValues,
  emptyDestinationTranslationFormValues,
  getDestinationTranslationStatusLabel,
  isDestinationTranslationEditable,
  validateDestinationTranslationForEligibility,
  validateDestinationTranslationFormData,
  validateDestinationTranslationInput,
} from "../features/destination-translation/model.ts";
import { isValidDestinationId } from "../features/destinations/model.ts";

const source = (overrides = {}) => ({
  id: "b1100000-0000-4000-8000-000000000001",
  name: "Destinasi Indonesia",
  summary: "Ringkasan Indonesia",
  description: "Deskripsi Indonesia",
  history: "Sejarah Indonesia",
  opening_hours: "Setiap hari",
  price_note: "Gratis",
  facilities: ["Parkir", "Toilet"],
  status: "published",
  updated_at: "2026-08-09T10:00:00.000Z",
  hasThumbnail: true,
  ...overrides,
});

const completeInput = (overrides = {}) => ({
  name: "English Destination",
  summary: "English summary",
  description: "English description",
  history: "English history",
  opening_hours: "Every day",
  price_note: "Free",
  facilities: "Parking\nToilets",
  thumbnail_alt_text: "English destination thumbnail",
  ...overrides,
});

test("destination translation validation requires every database core field", () => {
  const result = validateDestinationTranslationInput(
    completeInput({ summary: "", description: "", thumbnail_alt_text: "" }),
  );

  assert.equal(result.success, false);
  if (result.success) return;
  assert.match(result.fieldErrors.summary ?? "", /wajib diisi/);
  assert.match(result.fieldErrors.description ?? "", /wajib diisi/);
  assert.match(result.fieldErrors.thumbnail_alt_text ?? "", /wajib diisi/);
});

test("review validation enforces source parity and facility cardinality", () => {
  const draft = validateDestinationTranslationInput(
    completeInput({ history: "", facilities: "Parking" }),
  );

  assert.equal(draft.success, true);
  if (!draft.success) return;

  const result = validateDestinationTranslationForEligibility(
    source(),
    draft.data,
  );

  assert.equal(result.success, false);
  if (result.success) return;
  assert.match(result.fieldErrors.history ?? "", /wajib diisi/);
  assert.match(result.fieldErrors.facilities ?? "", /Jumlah fasilitas/);
});

test("source-empty optional sections cannot receive invented English content", () => {
  const result = validateDestinationTranslationInput(
    completeInput({ history: "Invented history", opening_hours: "Always" }),
  );

  assert.equal(result.success, true);
  if (!result.success) return;

  const eligibility = validateDestinationTranslationForEligibility(
    source({ history: null, opening_hours: null, price_note: null }),
    result.data,
  );

  assert.equal(eligibility.success, false);
  if (eligibility.success) return;
  assert.match(eligibility.fieldErrors.history ?? "", /dikosongkan/);
  assert.match(eligibility.fieldErrors.opening_hours ?? "", /dikosongkan/);
});

test("empty English draft values never use Indonesian source values", () => {
  const empty = emptyDestinationTranslationFormValues();
  const projected = destinationTranslationToFormValues(null);

  assert.deepEqual(projected, empty);
  assert.equal(projected.name, "");
  assert.equal(projected.description, "");
  assert.notEqual(projected.name, source().name);
  assert.notEqual(projected.description, source().description);
});

test("lifecycle presentation keeps reviewed and public eligibility distinct", () => {
  assert.equal(isDestinationTranslationEditable(null, null), true);
  assert.equal(isDestinationTranslationEditable("draft", "pending"), true);
  assert.equal(isDestinationTranslationEditable("draft", "reviewed"), false);
  assert.equal(
    isDestinationTranslationEditable("published", "reviewed"),
    false,
  );
  assert.equal(
    getDestinationTranslationStatusLabel("published", "reviewed", "blocked"),
    "Diterbitkan - perlu ditinjau ulang",
  );

  const state = createDestinationTranslationActionState(
    source(),
    null,
    "blocked",
  );
  assert.equal(state.translationId, null);
  assert.equal(state.values.name, "");
});

test("admin data uses the destination translation read RPCs and no base-table read", () => {
  const dataSource = readFileSync(
    "features/destination-translation/data.ts",
    "utf8",
  );

  assert.match(dataSource, /requireAdministrator\(\)/);
  assert.match(dataSource, /destination_translation_admin_read/);
  assert.match(dataSource, /destination_translation_review_history/);
  assert.match(dataSource, /published_english_destinations/);
  assert.doesNotMatch(dataSource, /\.from\(["']destination_translations["']\)/);
});

test("server action authorization, checkpointing, RPC mapping, and revalidation are explicit", () => {
  const actionSource = readFileSync(
    "features/destination-translation/actions.ts",
    "utf8",
  );

  assert.match(actionSource, /await requireAdministrator\(\)/);
  assert.match(actionSource, /p_expected_edit_revision/);
  assert.match(actionSource, /readTranslationId/);
  assert.match(actionSource, /readExpectedEditRevision/);
  assert.doesNotMatch(
    actionSource,
    /formData\.get\(["'](?:actor|actor_id|created_by|updated_by)/i,
  );
  assert.doesNotMatch(
    actionSource,
    /\.from\(["']destination_translations["']\)/,
  );

  for (const rpc of [
    "destination_translation_save_draft",
    "destination_translation_review",
    "destination_translation_reject",
    "destination_translation_publish",
    "destination_translation_republish",
    "destination_translation_archive",
    "destination_translation_unpublish",
    "destination_translation_restore",
  ]) {
    assert.match(
      actionSource,
      new RegExp(
        `destination_translation_${rpc.replace("destination_translation_", "")}`,
      ),
    );
  }

  assert.match(actionSource, /code === "55000"/);
  assert.match(
    actionSource,
    /revalidatePublicDomainPaths\("destination", \[sourceSlug\]\)/,
  );
  assert.match(actionSource, /refreshed\.slug !== current\.slug/);
  assert.match(
    actionSource,
    /function revalidateDestinationTranslationDetailPath[\s\S]*?revalidatePublicDomainDetailPaths\("destination", \[sourceSlug\]\)/,
  );
  assert.match(actionSource, /destination_translation_review/);
  assert.match(actionSource, /destination_translation_publish/);
  assert.match(actionSource, /destination_translation_republish/);
});

test("the admin page embeds the translation form without replacing Indonesian editing", () => {
  const pageSource = readFileSync(
    "app/admin/destinasi/[id]/edit/page.tsx",
    "utf8",
  );

  assert.match(pageSource, /<DestinationForm/);
  assert.match(pageSource, /<DestinationTranslationForm/);
  assert.match(pageSource, /getDestinationTranslationAdminData/);
  assert.match(pageSource, /createDestinationTranslationActionState/);
});

test("the form keeps source content in a separate reference and has no fallback injection", () => {
  const formSource = readFileSync(
    "features/destination-translation/destination-translation-form.tsx",
    "utf8",
  );

  assert.match(formSource, /Referensi Indonesia/);
  assert.match(formSource, /state\.values\[field\]/);
  assert.match(formSource, /sourceFieldValue\(sourceReference, field\)/);
  assert.doesNotMatch(formSource, /state\.values\[[^\]]+\]\s*\?\?/);
  assert.doesNotMatch(formSource, /sourceReference\.[a-z_]+\s*\?\?/);
});

const DESTINATION_TRANSLATION_ID = "b1200000-0000-4000-8000-000000000001";
const DESTINATION_TRANSLATION_OLD_SLUG = "destinasi-lama";
const DESTINATION_TRANSLATION_NEW_SLUG = "destinasi-baru";

function translation(overrides = {}) {
  return {
    id: DESTINATION_TRANSLATION_ID,
    destination_id: source().id,
    locale: "en",
    name: "English Destination",
    summary: "English summary",
    description: "English description",
    history: "English history",
    opening_hours: "Every day",
    price_note: "Free",
    facilities: ["Parking", "Toilets"],
    thumbnail_alt_text: "English destination thumbnail",
    translation_status: "draft",
    review_state: "pending",
    review_reason: null,
    rejected_at: null,
    published_at: null,
    archived_at: null,
    reviewed_at: null,
    updated_at: "2026-08-10T10:00:00.000Z",
    edit_revision: 4,
    ...overrides,
  };
}

function destinationTranslationForm(intent, currentTranslation, options = {}) {
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
  if (intent === "reject") formData.set("rejection_reason", "Needs revision");
  if (options.clientSlug) formData.set("slug", options.clientSlug);
  return formData;
}

function createDestinationTranslationRuntime() {
  const runtime = {
    client: null,
    calls: [],
    events: [],
    paths: [],
    authCalls: 0,
    authorizationError: null,
    currentTranslation: null,
    responses: [],
    refreshed: null,
    query: null,
  };

  runtime.client = {
    rpc(name, args) {
      runtime.calls.push({ name, args });
      runtime.events.push(`rpc:${name}`);
      const current =
        runtime.currentTranslation ?? translation({ edit_revision: 0 });
      const response = runtime.responses.shift() ?? {
        data: { ...current, edit_revision: current.edit_revision + 1 },
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

async function loadDestinationTranslationActions(runtime) {
  const actionSource = readFileSync(
    "features/destination-translation/actions.ts",
    "utf8",
  )
    .replace(/^"use server";\s*/m, "")
    .replace(/import\s+[\s\S]*?from\s+["'][^"']+["'];\s*/g, "");
  const stripped = stripTypeScriptTypes(actionSource, { mode: "strip" });
  const key = `__destinationTranslationDeps_${Math.random()
    .toString(36)
    .slice(2)}`;
  globalThis[key] = {
    ...createPublicRevalidationMock(runtime),
    captureRelatedTourismPackageSlugs: async () => [],
    revalidateRelatedTourismPackagePaths: async () => {},
    revalidatePath: (path) => {
      runtime.paths.push(path);
      runtime.events.push(`revalidate:${path}`);
    },
    requireAdministrator: async () => {
      runtime.authCalls += 1;
      runtime.events.push("authorization");
      if (runtime.authorizationError) throw runtime.authorizationError;
      return { id: "administrator-id" };
    },
    createClient: async () => runtime.client,
    isValidDestinationId,
    queryDestinationTranslationAdminData: (...args) => runtime.query(...args),
    createDestinationTranslationActionState,
    destinationTranslationToMutationValues,
    validateDestinationTranslationForEligibility,
    validateDestinationTranslationFormData,
  };

  try {
    return await import(
      `data:text/javascript;charset=utf-8,${encodeURIComponent(`
const deps = globalThis.${key};
const { captureRelatedTourismPackageSlugs, revalidateRelatedTourismPackagePaths,
  revalidatePublicDomainPaths, revalidatePublicDomainDetailPaths,
  revalidatePath, requireAdministrator, createClient, isValidDestinationId,
  queryDestinationTranslationAdminData, createDestinationTranslationActionState,
  destinationTranslationToMutationValues, validateDestinationTranslationForEligibility,
  validateDestinationTranslationFormData } = deps;
${stripped}`)}`
    );
  } finally {
    delete globalThis[key];
  }
}

async function invokeDestinationTranslation({
  intent,
  currentTranslation = null,
  refreshed = null,
  responses = [],
  clientSlug = null,
} = {}) {
  const runtime = createDestinationTranslationRuntime();
  runtime.currentTranslation = currentTranslation;
  runtime.responses = [...responses];
  let readCount = 0;
  const trustedSource = source();
  runtime.query = async (supabase, destinationId) => {
    assert.equal(supabase, runtime.client);
    assert.equal(destinationId, trustedSource.id);
    readCount += 1;
    runtime.events.push(
      readCount === 1 ? "authoritative-read" : "post-mutation-refresh",
    );
    if (readCount === 1) {
      return {
        success: true,
        source: trustedSource,
        slug: DESTINATION_TRANSLATION_OLD_SLUG,
        translation: currentTranslation,
        history: [],
        publicEligibility: "blocked",
      };
    }
    return (
      refreshed ?? {
        success: true,
        source: trustedSource,
        slug: DESTINATION_TRANSLATION_OLD_SLUG,
        translation: currentTranslation,
        history: [],
        publicEligibility: "blocked",
      }
    );
  };

  const actions = await loadDestinationTranslationActions(runtime);
  const initialState = createDestinationTranslationActionState(
    trustedSource,
    currentTranslation,
    "blocked",
  );
  const result = await actions.manageDestinationTranslation(
    trustedSource.id,
    initialState,
    destinationTranslationForm(intent, currentTranslation, { clientSlug }),
  );
  return { result, runtime };
}

test("Destination translation lifecycle uses runtime RPCs and trusted old/new slugs", async () => {
  const reviewed = await invokeDestinationTranslation({
    intent: "review",
    currentTranslation: translation(),
  });
  assert.deepEqual(
    reviewed.runtime.calls.map((call) => call.name),
    ["destination_translation_save_draft", "destination_translation_review"],
  );
  assert.equal(reviewed.result.kind, "success");
  assert.ok(reviewed.runtime.paths.includes("/destinasi"));
  assert.ok(reviewed.runtime.paths.includes("/en/destinations"));
  assert.ok(reviewed.runtime.paths.includes("/en"));
  assert.ok(reviewed.runtime.paths.includes("/en/tourism-map"));

  const changedSlug = await invokeDestinationTranslation({
    intent: "save-draft",
    refreshed: {
      success: true,
      source: source(),
      slug: DESTINATION_TRANSLATION_NEW_SLUG,
      translation: null,
      history: [],
      publicEligibility: "blocked",
    },
  });
  assert.equal(changedSlug.result.kind, "success");
  assert.ok(
    changedSlug.runtime.paths.includes(
      `/en/destinations/${DESTINATION_TRANSLATION_OLD_SLUG}`,
    ),
  );
  assert.ok(
    changedSlug.runtime.paths.includes(
      `/en/destinations/${DESTINATION_TRANSLATION_NEW_SLUG}`,
    ),
  );

  const clientSlug = await invokeDestinationTranslation({
    intent: "publish",
    currentTranslation: translation({ review_state: "reviewed" }),
    clientSlug: "attacker-controlled-slug",
  });
  assert.equal(clientSlug.result.kind, "success");
  assert.equal(
    clientSlug.runtime.paths.some((path) =>
      path.includes("attacker-controlled"),
    ),
    false,
  );

  const failed = await invokeDestinationTranslation({
    intent: "save-draft",
    responses: [{ data: null, error: { code: "55000" } }],
  });
  assert.equal(failed.result.kind, "conflict");
  assert.deepEqual(failed.runtime.paths, []);
});
