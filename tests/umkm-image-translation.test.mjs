import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";
import { createPublicRevalidationMock } from "./public-revalidation-test-helpers.mjs";

import {
  createUmkmImageTranslationActionState,
  emptyUmkmImageTranslationFormValues,
  validateUmkmImageTranslationForEligibility,
  validateUmkmImageTranslationForSource,
  validateUmkmImageTranslationInput,
} from "../features/umkm-image-translation/model.ts";
import { isValidUmkmId } from "../features/umkm/model.ts";

const read = (path) => readFileSync(path, "utf8");
const UMKM_ID = "10000000-0000-4000-8000-000000000001";
const IMAGE_ID = "30000000-0000-4000-8000-000000000001";
const TRANSLATION_ID = "40000000-0000-4000-8000-000000000001";
const TRUSTED_SLUG = "usaha-karang-bajo";
const REVISION = 3;

const image = (overrides = {}) => ({
  id: IMAGE_ID,
  parentId: UMKM_ID,
  altText: "Alt sumber",
  caption: "Caption sumber",
  displayOrder: 0,
  isPrimary: true,
  previewUrl: null,
  sourceSlug: TRUSTED_SLUG,
  sourceRevision: 2,
  sourceUpdatedAt: "2026-08-12T10:00:00.000Z",
  ...overrides,
});

const translation = (overrides = {}) => ({
  id: TRANSLATION_ID,
  umkm_image_id: IMAGE_ID,
  locale: "en",
  alt_text: "Approved English alt",
  caption: "Approved English caption",
  translation_status: "draft",
  review_state: "pending",
  published_at: null,
  edit_revision: REVISION,
  umkm_id: UMKM_ID,
  source_slug: TRUSTED_SLUG,
  source_revision: 2,
  source_updated_at: "2026-08-12T10:00:00.000Z",
  source_status: "published",
  lifecycle_state: "draft",
  public_eligibility: false,
  review_eligibility: true,
  publication_eligibility: false,
  eligibility_reason: "review is required",
  source_blocked_reason: null,
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
    current: null,
    trustedImage: image(),
    sourceStatus: "published",
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
  const actionSource = read("features/umkm-image-translation/actions.ts")
    .replace(/^"use server";\s*/m, "")
    .replace(/import\s+[\s\S]*?from\s+["'][^"']+["'];\s*/g, "");
  const stripped = stripTypeScriptTypes(actionSource, { mode: "strip" });
  const key = `__umkmImageTranslationDeps_${Math.random().toString(36).slice(2)}`;
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
    isValidUmkmId,
    queryUmkmImageTranslationAdminData: (...args) => runtime.query(...args),
    createUmkmImageTranslationActionState,
    validateUmkmImageTranslationForEligibility,
    validateUmkmImageTranslationForSource,
    validateUmkmImageTranslationFormData: (formData) => {
      const input = {};
      for (const field of new Set(formData.keys())) {
        const values = formData.getAll(field);
        input[field] = values.length === 1 ? values[0] : values;
      }
      return validateUmkmImageTranslationInput(input);
    },
  };
  try {
    return await import(
      `data:text/javascript;charset=utf-8,${encodeURIComponent(`
const deps = globalThis.${key};
const { revalidatePublicDomainPaths, revalidatePublicDomainDetailPaths,
  revalidatePath, requireAdministrator, createClient, isValidUmkmId,
  queryUmkmImageTranslationAdminData, createUmkmImageTranslationActionState,
  validateUmkmImageTranslationForEligibility, validateUmkmImageTranslationForSource,
  validateUmkmImageTranslationFormData } = deps;
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
  runtime.trustedImage = trustedImage;
  runtime.sourceStatus = sourceStatus;
  runtime.responses = [...responses];
  runtime.authorizationError = denyAuthorization
    ? new Error("administrator authorization required")
    : null;
  let readCount = 0;
  runtime.query = async (supabase, id) => {
    assert.equal(supabase, runtime.client);
    assert.equal(id, UMKM_ID);
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
        umkmId: UMKM_ID,
        slug: TRUSTED_SLUG,
        images: [currentImage],
      };
    }
    return (
      refreshed ?? {
        success: true,
        umkmId: UMKM_ID,
        slug: TRUSTED_SLUG,
        images: [currentImage],
      }
    );
  };
  const initial = createUmkmImageTranslationActionState(
    trustedImage,
    current,
    [],
    { sourceStatus },
  );
  const action = (await actions).manageUmkmImageTranslation;
  const result = await action(
    UMKM_ID,
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

test("UMKM image translation starts empty and never falls back to source alt text", () => {
  assert.deepEqual(emptyUmkmImageTranslationFormValues(), {
    alt_text: "",
    caption: "",
  });
  assert.notEqual(
    emptyUmkmImageTranslationFormValues().alt_text,
    image().altText,
  );
});

test("source-empty captions accept empty English values and reject invention", () => {
  for (const sourceCaption of [null, "", "   "]) {
    const empty = validateUmkmImageTranslationInput({
      alt_text: "English alt",
      caption: "",
    });
    assert.equal(empty.success, true);
    if (!empty.success) continue;
    assert.equal(
      validateUmkmImageTranslationForSource(
        image({ caption: sourceCaption }),
        empty.data,
      ).success,
      true,
    );
    const invented = validateUmkmImageTranslationInput({
      alt_text: "English alt",
      caption: "Invented caption",
    });
    assert.equal(invented.success, true);
    if (!invented.success) continue;
    assert.equal(
      validateUmkmImageTranslationForSource(
        image({ caption: sourceCaption }),
        invented.data,
      ).success,
      false,
    );
  }
});

test("all UMKM image lifecycle intents use administrator authorization and exact RPC targets", async () => {
  const cases = [
    ["save-draft", ["umkm_image_translation_save_draft"]],
    [
      "review",
      ["umkm_image_translation_save_draft", "umkm_image_translation_review"],
    ],
    ["reject", ["umkm_image_translation_reject"]],
    ["publish", ["umkm_image_translation_publish"]],
    ["republish", ["umkm_image_translation_republish"]],
    ["archive", ["umkm_image_translation_archive"]],
    ["unpublish", ["umkm_image_translation_unpublish"]],
    ["restore", ["umkm_image_translation_restore"]],
  ];
  for (const [intent, expectedNames] of cases) {
    const current =
      intent === "restore"
        ? translation({ translation_status: "archived" })
        : intent === "publish"
          ? translation({
              review_state: "reviewed",
              publication_eligibility: true,
            })
          : intent === "republish"
            ? translation({
                translation_status: "published",
                review_state: "reviewed",
                published_at: "2026-08-12T11:00:00.000Z",
                publication_eligibility: true,
              })
            : ["archive", "unpublish"].includes(intent)
              ? translation({
                  translation_status: "published",
                  review_state: "reviewed",
                  published_at: "2026-08-12T11:00:00.000Z",
                })
              : translation();
    const outcome = await invoke({ intent, current });
    assert.equal(outcome.authCalls, 1, `${intent} authorization count`);
    assert.deepEqual(
      outcome.calls.map(({ name }) => name),
      expectedNames,
      `${intent} RPC mapping`,
    );
    for (const call of outcome.calls) {
      assert.equal(
        call.args.p_translation_id ?? call.args.p_umkm_image_id,
        call.name.endsWith("_save_draft") ? IMAGE_ID : TRANSLATION_ID,
      );
      assert.equal(
        call.args.p_expected_edit_revision,
        call.name.endsWith("_review") ? REVISION + 1 : REVISION,
      );
      assert.equal("p_actor_id" in call.args, false);
      assert.equal("p_slug" in call.args, false);
      assert.equal("p_source_fingerprint" in call.args, false);
    }
    if (intent === "save-draft" || intent === "review") {
      assert.equal(outcome.calls[0].args.p_alt_text, "Approved English alt");
      assert.equal(outcome.calls[0].args.p_caption, "Approved English caption");
    }
    if (intent === "review") {
      assert.equal(outcome.calls[1].args.p_terminology_review_confirmed, true);
    }
    if (intent === "reject") {
      assert.equal(outcome.calls[0].args.p_reason, "Needs revision");
    }
  }
});

test("authorization failure stops UMKM image translation before reads, RPCs, or revalidation", async () => {
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
      invoke({ intent, denyAuthorization: true }),
      /administrator authorization required/,
    );
    assert.deepEqual(runtime.events, ["authorization"], intent);
    assert.deepEqual(runtime.calls, [], intent);
    assert.deepEqual(runtime.paths, [], intent);
  }
});

test("real UMKM image action rejects invented source-empty caption before mutation", async () => {
  for (const sourceCaption of [null, "", "   "]) {
    const outcome = await invoke({
      intent: "save-draft",
      trustedImage: image({ caption: sourceCaption }),
      input: { caption: "Invented caption" },
    });
    assert.equal(outcome.result.kind, "validation-error");
    assert.deepEqual(outcome.calls, []);
    assert.deepEqual(outcome.paths, []);
  }
});

test("primary alt remains explicit and image translation never mutates generic media or Storage", async () => {
  const outcome = await invoke({
    intent: "review",
    input: { alt_text: "   " },
  });
  assert.equal(outcome.result.kind, "validation-error");
  assert.deepEqual(outcome.calls, []);
  assert.deepEqual(outcome.mediaCalls, []);
  assert.deepEqual(outcome.storageCalls, []);
});

test("successful UMKM image translation revalidates after the RPC and ignores client slug", async () => {
  const outcome = await invoke({ intent: "save-draft" });
  const mutationIndex = outcome.events.indexOf(
    "rpc:umkm_image_translation_save_draft",
  );
  const revalidationIndex = outcome.events.findIndex((event) =>
    event.startsWith("revalidate:"),
  );
  assert.ok(mutationIndex >= 0);
  assert.ok(revalidationIndex > mutationIndex);
  assert.ok(outcome.paths.includes("/en/local-businesses"));
  assert.ok(outcome.paths.includes(`/en/local-businesses/${TRUSTED_SLUG}`));

  const crafted = await invoke({
    intent: "save-draft",
    clientSlug: "attacker-controlled-slug",
  });
  assert.equal(crafted.result.kind, "validation-error");
  assert.deepEqual(crafted.calls, []);
  assert.deepEqual(crafted.paths, []);
});

test("successful UMKM mutations remain successful when refresh cannot find the target", async () => {
  const missingTarget = await invoke({
    intent: "save-draft",
    refreshed: {
      success: true,
      umkmId: UMKM_ID,
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

test("UMKM image actions remain RPC-only and preserve database-derived eligibility state", () => {
  const actions = read("features/umkm-image-translation/actions.ts");
  const data = read("features/umkm-image-translation/data.ts");
  assert.doesNotMatch(
    actions + data,
    /\.from\(["']umkm_image_translations["']\)/,
  );
  assert.doesNotMatch(
    actions + data,
    /\.from\(["']umkm_image_translation_review_events["']\)/,
  );
  assert.match(actions + data, /umkm_image_translation_admin_read/);
  assert.match(actions + data, /umkm_image_translation_review_history/);
  assert.match(
    read("features/umkm-image-translation/model.ts"),
    /sourceBlockedReason/,
  );
});
