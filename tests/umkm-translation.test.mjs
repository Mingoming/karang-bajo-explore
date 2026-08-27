import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";
import { createPublicRevalidationMock } from "./public-revalidation-test-helpers.mjs";

import {
  createUmkmTranslationActionState,
  emptyUmkmTranslationFormValues,
  validateUmkmTranslationForSource,
  validateUmkmTranslationInput,
} from "../features/umkm-translation/model.ts";
import { isValidUmkmId } from "../features/umkm/model.ts";

const read = (path) => readFileSync(path, "utf8");
const UMKM_ID = "10000000-0000-4000-8000-000000000001";
const TRANSLATION_ID = "20000000-0000-4000-8000-000000000001";
const TRUSTED_SLUG = "usaha-karang-bajo";
const REVISION = 4;

const source = (overrides = {}) => ({
  id: UMKM_ID,
  business_name: "Usaha Karang Bajo",
  category: "Kerajinan",
  description: "Deskripsi usaha sumber",
  address: "Alamat sumber",
  slug: TRUSTED_SLUG,
  source_revision: 2,
  status: "published",
  updated_at: "2026-08-12T10:00:00.000Z",
  ...overrides,
});

const translation = (overrides = {}) => ({
  id: TRANSLATION_ID,
  umkm_id: UMKM_ID,
  locale: "en",
  business_name: "Karang Bajo Business",
  category: "Crafts",
  description: "An approved English business description.",
  address: "English address",
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

const completeInput = (overrides = {}) => ({
  business_name: "Karang Bajo Business",
  category: "Crafts",
  description: "An approved English business description.",
  address: "English address",
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
  const actionSource = read("features/umkm-translation/actions.ts")
    .replace(/^"use server";\s*/m, "")
    .replace(/import\s+[\s\S]*?from\s+["'][^"']+["'];\s*/g, "");
  const stripped = stripTypeScriptTypes(actionSource, { mode: "strip" });
  const key = `__umkmTranslationDeps_${Math.random().toString(36).slice(2)}`;
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
    queryUmkmTranslationAdminData: (...args) => runtime.query(...args),
    createUmkmTranslationActionState,
    validateUmkmTranslationForEligibility: () => ({ success: true }),
    validateUmkmTranslationForSource,
    validateUmkmTranslationFormData: (formData) => {
      const input = {};
      for (const field of new Set(formData.keys())) {
        const values = formData.getAll(field);
        input[field] = values.length === 1 ? values[0] : values;
      }
      return validateUmkmTranslationInput(input);
    },
  };
  try {
    return await import(
      `data:text/javascript;charset=utf-8,${encodeURIComponent(`
const deps = globalThis.${key};
const { revalidatePublicDomainPaths, revalidatePublicDomainDetailPaths,
  revalidatePath, requireAdministrator, createClient, isValidUmkmId,
  queryUmkmTranslationAdminData, createUmkmTranslationActionState,
  validateUmkmTranslationForEligibility, validateUmkmTranslationForSource,
  validateUmkmTranslationFormData } = deps;
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
    assert.equal(id, UMKM_ID);
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
  const initial = createUmkmTranslationActionState(trustedSource, current);
  const action = (await actions).manageUmkmTranslation;
  const result = await action(
    UMKM_ID,
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

test("UMKM translation starts empty and never falls back to Indonesian values", () => {
  assert.deepEqual(emptyUmkmTranslationFormValues(), {
    business_name: "",
    category: "",
    description: "",
    address: "",
  });
  assert.notEqual(
    emptyUmkmTranslationFormValues().business_name,
    source().business_name,
  );
});

test("UMKM source-mirroring allows an empty optional address and rejects invention", () => {
  const empty = validateUmkmTranslationForSource(
    source({ address: null }),
    validateUmkmTranslationInput(completeInput({ address: "" })).success
      ? validateUmkmTranslationInput(completeInput({ address: "" })).data
      : completeInput(),
  );
  assert.equal(empty.success, true);

  const invented = validateUmkmTranslationForSource(
    source({ address: "" }),
    validateUmkmTranslationInput(completeInput({ address: "Invented address" }))
      .success
      ? validateUmkmTranslationInput(
          completeInput({ address: "Invented address" }),
        ).data
      : completeInput(),
  );
  assert.equal(invented.success, false);
});

test("all UMKM lifecycle intents use administrator authorization and exact RPC targets", async () => {
  const cases = [
    ["save-draft", ["umkm_translation_save_draft"]],
    ["review", ["umkm_translation_save_draft", "umkm_translation_review"]],
    ["reject", ["umkm_translation_reject"]],
    ["publish", ["umkm_translation_publish"]],
    ["republish", ["umkm_translation_republish"]],
    ["archive", ["umkm_translation_archive"]],
    ["unpublish", ["umkm_translation_unpublish"]],
    ["restore", ["umkm_translation_restore"]],
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
      if (call.args.p_translation_id !== undefined) {
        assert.equal(call.args.p_translation_id, TRANSLATION_ID);
      }
      assert.equal(
        call.args.p_expected_edit_revision,
        call.name.endsWith("_review") ? REVISION + 1 : REVISION,
      );
      assert.equal("p_actor_id" in call.args, false);
      assert.equal("p_slug" in call.args, false);
      assert.equal("p_source_fingerprint" in call.args, false);
    }
    if (intent === "save-draft" || intent === "review") {
      assert.equal(outcome.calls[0].args.p_umkm_id, UMKM_ID);
      assert.equal(
        outcome.calls[0].args.p_business_name,
        "Karang Bajo Business",
      );
      assert.equal(outcome.calls[0].args.p_category, "Crafts");
      assert.equal(
        outcome.calls[0].args.p_description,
        "An approved English business description.",
      );
      assert.equal(outcome.calls[0].args.p_address, "English address");
    }
    if (intent === "review") {
      assert.equal(outcome.calls[1].args.p_terminology_review_confirmed, true);
    }
    if (intent === "reject") {
      assert.equal(outcome.calls[0].args.p_reason, "Needs revision");
    }
  }
});

test("authorization failure stops UMKM translation before reads, RPCs, or revalidation", async () => {
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

test("real UMKM action rejects invented address content before any mutation RPC", async () => {
  const outcome = await invoke({
    intent: "save-draft",
    trustedSource: source({ address: null }),
    input: { address: "Invented address" },
  });
  assert.equal(outcome.result.kind, "validation-error");
  assert.deepEqual(outcome.calls, []);
  assert.deepEqual(outcome.paths, []);
});

test("successful UMKM translation mutation revalidates only after the RPC and uses trusted slug", async () => {
  const outcome = await invoke({ intent: "save-draft" });
  const mutationIndex = outcome.events.indexOf(
    "rpc:umkm_translation_save_draft",
  );
  const revalidationIndex = outcome.events.findIndex((event) =>
    event.startsWith("revalidate:"),
  );
  assert.ok(mutationIndex >= 0);
  assert.ok(revalidationIndex > mutationIndex);
  assert.ok(outcome.paths.includes("/en/local-businesses"));
  assert.ok(outcome.paths.includes(`/en/local-businesses/${TRUSTED_SLUG}`));
});

test("client-supplied UMKM slug is rejected and cannot influence mutation or cache paths", async () => {
  const outcome = await invoke({
    intent: "save-draft",
    clientSlug: "attacker-controlled-slug",
  });
  assert.equal(outcome.result.kind, "validation-error");
  assert.deepEqual(outcome.calls, []);
  assert.deepEqual(outcome.paths, []);
});

test("trusted refreshed slug invalidates the new UMKM detail path", async () => {
  const outcome = await invoke({
    intent: "save-draft",
    refreshed: {
      success: true,
      source: source({ slug: "new-trusted-umkm-slug" }),
      slug: "new-trusted-umkm-slug",
      translation: translation({ edit_revision: REVISION + 1 }),
      history: [],
    },
  });
  assert.ok(outcome.paths.includes(`/en/local-businesses/${TRUSTED_SLUG}`));
  assert.ok(
    outcome.paths.includes("/en/local-businesses/new-trusted-umkm-slug"),
  );
});

test("UMKM actions remain RPC-only and never read translation tables directly", () => {
  const actions = read("features/umkm-translation/actions.ts");
  const data = read("features/umkm-translation/data.ts");
  assert.doesNotMatch(actions + data, /\.from\(["']umkm_translations["']\)/);
  assert.doesNotMatch(
    actions + data,
    /\.from\(["']umkm_translation_review_events["']\)/,
  );
  assert.match(actions + data, /umkm_translation_admin_read/);
  assert.match(actions + data, /umkm_translation_review_history/);
});
