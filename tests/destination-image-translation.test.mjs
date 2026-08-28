import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";
import { createPublicRevalidationMock } from "./public-revalidation-test-helpers.mjs";

import {
  createDestinationImageTranslationActionState,
  destinationImageTranslationToFormValues,
  emptyDestinationImageTranslationFormValues,
  getDestinationImageTranslationLifecycleLabel,
  getDestinationImageTranslationLifecycleStatus,
  validateDestinationImageTranslationInput,
} from "../features/destination-image-translation/model.ts";
import { isValidDestinationId } from "../features/destinations/model.ts";

const read = (path) => readFileSync(path, "utf8");

test("image translation validation requires English alt text and permits empty caption", () => {
  const missingAlt = validateDestinationImageTranslationInput({
    alt_text: "",
    caption: "Caption",
  });

  assert.equal(missingAlt.success, false);
  if (missingAlt.success) return;
  assert.match(missingAlt.fieldErrors.alt_text ?? "", /wajib diisi/);

  const valid = validateDestinationImageTranslationInput({
    alt_text: "English alt text",
    caption: "",
  });

  assert.equal(valid.success, true);
  if (!valid.success) return;
  assert.deepEqual(valid.data, {
    alt_text: "English alt text",
    caption: null,
  });
});

test("empty English image values never use Indonesian source values", () => {
  const empty = emptyDestinationImageTranslationFormValues();
  const projected = destinationImageTranslationToFormValues(null);

  assert.deepEqual(projected, empty);
  assert.equal(projected.alt_text, "");
  assert.equal(projected.caption, "");
});

test("image translation lifecycle presentation is database-state driven", () => {
  const cases = [
    [null, null, "blocked", "draft", "Draft"],
    ["draft", "pending", "blocked", "awaiting-review", "Awaiting review"],
    ["draft", "reviewed", "blocked", "reviewed", "Reviewed"],
    ["published", "reviewed", "eligible", "published", "Published"],
    ["published", "reviewed", "blocked", "stale", "Stale"],
    ["archived", "pending", "blocked", "archived", "Archived"],
  ];

  for (const [status, reviewState, eligibility, expected, label] of cases) {
    const lifecycleStatus = getDestinationImageTranslationLifecycleStatus(
      status,
      reviewState,
      eligibility,
    );

    assert.equal(lifecycleStatus, expected);
    assert.equal(
      getDestinationImageTranslationLifecycleLabel(lifecycleStatus),
      label,
    );
  }
});

test("image admin data uses RPCs and the database-owned public image view", () => {
  const dataSource = read("features/destination-image-translation/data.ts");

  assert.match(dataSource, /requireAdministrator\(\)/);
  assert.match(dataSource, /destination_image_translation_admin_read/);
  assert.match(dataSource, /destination_image_translation_review_history/);
  assert.match(dataSource, /published_english_destination_images/);
  assert.match(dataSource, /queryMediaImages/);
  assert.doesNotMatch(
    dataSource,
    /\.from\(["']destination_image_translations["']\)/,
  );
  assert.doesNotMatch(dataSource, /\.storage\.(upload|remove)/);
});

test("image translation actions preserve administrator and RPC boundaries", () => {
  const actionSource = read(
    "features/destination-image-translation/actions.ts",
  );

  assert.match(actionSource, /await requireAdministrator\(\)/);
  assert.match(actionSource, /p_expected_edit_revision/);
  assert.doesNotMatch(
    actionSource,
    /formData\.get\(["'](?:actor|actor_id|created_by|updated_by)/i,
  );
  assert.doesNotMatch(
    actionSource,
    /\.from\(["']destination_image_translations["']\)/,
  );
  assert.doesNotMatch(actionSource, /\.storage\.(upload|remove)/);

  for (const rpc of [
    "destination_image_translation_save_draft",
    "destination_image_translation_review",
    "destination_image_translation_reject",
    "destination_image_translation_publish",
    "destination_image_translation_republish",
    "destination_image_translation_archive",
    "destination_image_translation_unpublish",
    "destination_image_translation_restore",
  ]) {
    assert.match(actionSource, new RegExp(rpc));
  }

  assert.match(
    actionSource,
    /revalidatePublicDomainPaths\("destination", trustedSlugs\)/,
  );
  assert.match(
    actionSource,
    /revalidatePublicDomainDetailPaths\("destination", \[current\.slug\]\)/,
  );
});

test("image translation form separates source reference from English inputs", () => {
  const formSource = read(
    "features/destination-image-translation/destination-image-translation-form.tsx",
  );

  assert.match(formSource, /Referensi Indonesia/);
  assert.match(formSource, /sourceReference\.previewUrl/);
  assert.match(formSource, /state\.values\[field\]/);
  assert.match(formSource, /lifecycleStatus === "stale"/);
  for (const cause of ["media", "binary revision", "fingerprint"]) {
    assert.match(formSource, new RegExp(cause, "i"));
  }
  assert.match(formSource, /Database\s+tetap menjadi satu-satunya/);
  assert.doesNotMatch(formSource, /state\.values\[[^\]]+\]\s*\?\?/);
  assert.doesNotMatch(formSource, /sourceReference\.[a-zA-Z]+\s*\?\?/);

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
    assert.match(
      formSource,
      new RegExp(`name="intent"[\\s\\S]*?value="${intent}"`),
    );
  }
});

test("destination edit page preserves both destination workflows", () => {
  const pageSource = read("app/admin/destinasi/[id]/edit/page.tsx");

  assert.match(pageSource, /<DestinationForm/);
  assert.match(pageSource, /<DestinationTranslationForm/);
  assert.match(pageSource, /<DestinationImageTranslationForm/);
  assert.match(pageSource, /getDestinationImageTranslationAdminData/);
  assert.match(pageSource, /createDestinationImageTranslationActionState/);
});

test("destination image refresh invalidates before querying or returning a missing-image result", () => {
  const actionSource = read(
    "features/destination-image-translation/actions.ts",
  );
  const refreshStart = actionSource.indexOf(
    "async function refreshAfterMutation",
  );
  const refreshEnd = actionSource.indexOf(
    "function checkpointMatches",
    refreshStart,
  );
  assert.notEqual(refreshStart, -1);
  assert.notEqual(refreshEnd, -1);

  const refreshSource = actionSource.slice(refreshStart, refreshEnd);
  const initialRevalidation = refreshSource.indexOf(
    "revalidateDestinationImageTranslationPaths",
  );
  const query = refreshSource.indexOf(
    "queryDestinationImageTranslationAdminData",
  );
  const refreshedDetailRevalidation = refreshSource.indexOf(
    "revalidatePublicDomainDetailPaths",
  );
  const missingImageLookup = refreshSource.indexOf("current.images.find");

  assert.ok(initialRevalidation >= 0);
  assert.ok(query > initialRevalidation);
  assert.ok(refreshedDetailRevalidation > query);
  assert.ok(missingImageLookup > refreshedDetailRevalidation);
  assert.match(refreshSource, /trustedPreMutationSlug/);
});

const DESTINATION_ID = "10000000-0000-4000-8000-000000000001";
const DESTINATION_IMAGE_ID = "30000000-0000-4000-8000-000000000001";
const DESTINATION_TRANSLATION_ID = "40000000-0000-4000-8000-000000000001";
const DESTINATION_SLUG = "bukit-karang-bajo";

const destinationSource = (overrides = {}) => ({
  id: DESTINATION_IMAGE_ID,
  parentId: DESTINATION_ID,
  altText: "Alt Indonesia",
  caption: "Caption Indonesia",
  displayOrder: 0,
  isPrimary: true,
  previewUrl: null,
  ...overrides,
});

const destinationTranslation = (overrides = {}) => ({
  id: DESTINATION_TRANSLATION_ID,
  destination_image_id: DESTINATION_IMAGE_ID,
  locale: "en",
  alt_text: "Approved English alt",
  caption: "Approved English caption",
  translation_status: "draft",
  review_state: "pending",
  review_reason: null,
  rejected_at: null,
  published_at: null,
  archived_at: null,
  reviewed_at: null,
  updated_at: "2026-08-12T10:00:00.000Z",
  edit_revision: 3,
  ...overrides,
});

function destinationImageForm(intent, currentTranslation) {
  const formData = new FormData();
  formData.set("intent", intent);
  formData.set("translation_id", currentTranslation?.id ?? "");
  formData.set(
    "edit_revision",
    currentTranslation ? String(currentTranslation.edit_revision) : "",
  );
  if (intent === "save-draft" || intent === "review") {
    formData.set("alt_text", "Approved English alt");
    formData.set("caption", "Approved English caption");
  }
  return formData;
}

function createDestinationRuntime() {
  const runtime = {
    client: null,
    calls: [],
    events: [],
    paths: [],
    authCalls: 0,
    authorizationError: null,
    currentTranslation: null,
    responses: [],
    query: null,
  };
  runtime.client = {
    rpc(name, args) {
      runtime.calls.push({ name, args });
      runtime.events.push(`rpc:${name}`);
      const current = runtime.currentTranslation ?? destinationTranslation();
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

async function loadDestinationImageActions(runtime) {
  const actionSource = read("features/destination-image-translation/actions.ts")
    .replace(/^"use server";\s*/m, "")
    .replace(/import\s+[\s\S]*?from\s+["'][^"']+["'];\s*/g, "");
  const stripped = stripTypeScriptTypes(actionSource, { mode: "strip" });
  const key = `__destinationImageActionDeps_${Math.random().toString(36).slice(2)}`;
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
      return { id: "database-derived-admin" };
    },
    createClient: async () => runtime.client,
    isValidDestinationId,
    queryDestinationImageTranslationAdminData: (...args) =>
      runtime.query(...args),
    createDestinationImageTranslationActionState,
    validateDestinationImageTranslationFormData: (formData) => {
      const input = {};
      for (const field of new Set(formData.keys())) {
        const values = formData.getAll(field);
        input[field] = values.length === 1 ? values[0] : values;
      }
      return validateDestinationImageTranslationInput(input);
    },
  };
  try {
    return await import(
      `data:text/javascript;charset=utf-8,${encodeURIComponent(`
const deps = globalThis.${key};
const { captureRelatedTourismPackageSlugs, revalidateRelatedTourismPackagePaths,
  revalidatePublicDomainPaths, revalidatePublicDomainDetailPaths,
  revalidatePath, requireAdministrator, createClient, isValidDestinationId,
  queryDestinationImageTranslationAdminData,
  createDestinationImageTranslationActionState,
  validateDestinationImageTranslationFormData } = deps;
${stripped}`)}`
    );
  } finally {
    delete globalThis[key];
  }
}

const destinationRuntime = createDestinationRuntime();
const destinationActions = loadDestinationImageActions(destinationRuntime);

async function invokeDestinationImage({
  currentTranslation = destinationTranslation(),
  refreshed,
  responses = [],
} = {}) {
  destinationRuntime.calls = [];
  destinationRuntime.events = [];
  destinationRuntime.paths = [];
  destinationRuntime.authCalls = 0;
  destinationRuntime.responses = [...responses];
  destinationRuntime.currentTranslation = currentTranslation;
  let readCount = 0;
  const trustedSource = destinationSource();
  destinationRuntime.query = async (supabase, id) => {
    assert.equal(supabase, destinationRuntime.client);
    assert.equal(id, DESTINATION_ID);
    readCount += 1;
    destinationRuntime.events.push(
      readCount === 1 ? "authoritative-read" : "post-mutation-refresh",
    );
    const item = {
      source: trustedSource,
      translation: currentTranslation,
      history: [],
      publicEligibility: "blocked",
    };
    if (readCount === 1) {
      return {
        success: true,
        destinationId: DESTINATION_ID,
        slug: DESTINATION_SLUG,
        images: [item],
      };
    }
    return (
      refreshed ?? {
        success: true,
        destinationId: DESTINATION_ID,
        slug: DESTINATION_SLUG,
        images: [item],
      }
    );
  };
  const initialState = createDestinationImageTranslationActionState(
    currentTranslation,
    "blocked",
    [],
  );
  const action = (await destinationActions).manageDestinationImageTranslation;
  const result = await action(
    DESTINATION_ID,
    DESTINATION_IMAGE_ID,
    initialState,
    destinationImageForm("save-draft", currentTranslation),
  );
  return {
    result,
    calls: destinationRuntime.calls,
    paths: destinationRuntime.paths,
  };
}

test("Destination image mutation preserves committed success across refresh races", async () => {
  const missingTarget = await invokeDestinationImage({
    refreshed: {
      success: true,
      destinationId: DESTINATION_ID,
      slug: DESTINATION_SLUG,
      images: [],
    },
  });
  assert.equal(missingTarget.result.kind, "success");
  assert.match(missingTarget.result.message ?? "", /Perubahan tersimpan/);
  assert.deepEqual(missingTarget.paths, [
    `/admin/destinasi/${DESTINATION_ID}/edit`,
    "/destinasi",
    "/en/destinations",
    "/en",
    "/en/tourism-map",
    `/destinasi/${DESTINATION_SLUG}`,
    `/en/destinations/${DESTINATION_SLUG}`,
  ]);

  const refreshError = await invokeDestinationImage({
    refreshed: { success: false, kind: "read-error" },
  });
  assert.equal(refreshError.result.kind, "success");
  assert.match(refreshError.result.message ?? "", /status terbaru/);
  assert.ok(refreshError.paths.includes("/en"));
  assert.ok(refreshError.paths.includes("/en/tourism-map"));

  const mutationFailure = await invokeDestinationImage({
    responses: [{ data: null, error: { code: "55000" } }],
  });
  assert.equal(mutationFailure.result.kind, "conflict");
  assert.deepEqual(mutationFailure.paths, []);
});
