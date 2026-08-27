import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";

import {
  emptyTraditionalHouseFormValues,
  getAllowedTraditionalHouseStatuses,
  getTraditionalHouseMutationMode,
  isTraditionalHouseDuplicateConstraintError,
  isValidTraditionalHouseId,
  isValidTraditionalHouseSlug,
  normalizeTraditionalHouseSlug,
  validateTraditionalHouseFormData,
  validateTraditionalHouseInput,
} from "../features/traditional-houses/model.ts";
import { createPublicRevalidationMock } from "./public-revalidation-test-helpers.mjs";

const HOUSE_ID = "10000000-0000-4000-8000-000000000001";
const TRUSTED_OLD_SLUG = "rumah-adat-lama";
const TRUSTED_NEW_SLUG = "rumah-adat-baru";
const TRUSTED_CREATED_SLUG = "rumah-adat-terpercaya";

function validInput(overrides = {}) {
  return {
    name: "Rumah Adat Karang Bajo",
    description: "Deskripsi rumah adat yang sudah diverifikasi",
    display_order: "2",
    status: "draft",
    ...overrides,
  };
}

function context(overrides = {}) {
  return { mode: "create", hasThumbnail: false, ...overrides };
}

test("traditional-house form values become a trimmed typed payload", () => {
  const formData = new FormData();
  for (const [field, value] of Object.entries(
    validInput({
      name: "  Rumah Adat Karang Bajo  ",
      summary: "  Ringkasan terverifikasi  ",
      history: "  Sejarah terverifikasi  ",
      cultural_significance: "  Makna budaya terverifikasi  ",
      location_name: "  Dusun Karang Bajo  ",
      latitude: "-8.2731",
      longitude: "116.4251",
      google_maps_url: " https://maps.google.com/example ",
      visitor_information: "  Hormati aturan kunjungan  ",
    }),
  )) {
    formData.set(field, String(value));
  }
  formData.set("is_featured", "on");

  const result = validateTraditionalHouseFormData(formData, context());
  assert.equal(result.success, true);
  if (!result.success) return;
  assert.equal(result.data.name, "Rumah Adat Karang Bajo");
  assert.equal(result.data.summary, "Ringkasan terverifikasi");
  assert.equal(result.data.history, "Sejarah terverifikasi");
  assert.equal(result.data.latitude, -8.2731);
  assert.equal(result.data.visitor_information, "Hormati aturan kunjungan");
  assert.equal(result.data.is_featured, true);
});

test("required traditional-house fields reject missing and whitespace-only values", () => {
  const result = validateTraditionalHouseInput(
    validInput({ name: " ", description: "   " }),
    context(),
  );
  assert.equal(result.success, false);
  if (result.success) return;
  assert.match(result.fieldErrors.name ?? "", /wajib diisi/);
  assert.match(result.fieldErrors.description ?? "", /wajib diisi/);
});

test("optional traditional-house text normalizes to null", () => {
  const result = validateTraditionalHouseInput(
    validInput({
      summary: " ",
      history: "",
      cultural_significance: "",
      location_name: "",
      latitude: "",
      longitude: "",
      google_maps_url: "",
      visitor_information: "",
    }),
    context(),
  );
  assert.equal(result.success, true);
  if (!result.success) return;
  assert.equal(result.data.summary, null);
  assert.equal(result.data.history, null);
  assert.equal(result.data.cultural_significance, null);
  assert.equal(result.data.location_name, null);
  assert.equal(result.data.latitude, null);
  assert.equal(result.data.visitor_information, null);
});

test("coordinates allow an empty pair or a complete valid pair", () => {
  assert.equal(
    validateTraditionalHouseInput(validInput(), context()).success,
    true,
  );
  assert.equal(
    validateTraditionalHouseInput(
      validInput({ latitude: "-8.2", longitude: "116.4" }),
      context(),
    ).success,
    true,
  );
});

test("coordinates reject incomplete, malformed, infinite, and out-of-range values", () => {
  for (const values of [
    { latitude: "-8.2" },
    { longitude: "116.4" },
    { latitude: "NaN", longitude: "116.4" },
    { latitude: "-8.2", longitude: "Infinity" },
    { latitude: "90.1", longitude: "116.4" },
    { latitude: "-8.2", longitude: "-180.1" },
  ]) {
    assert.equal(
      validateTraditionalHouseInput(validInput(values), context()).success,
      false,
    );
  }
});

test("Google Maps URL accepts HTTP or HTTPS only", () => {
  for (const value of ["bukan-url", "ftp://example.com"]) {
    assert.equal(
      validateTraditionalHouseInput(
        validInput({ google_maps_url: value }),
        context(),
      ).success,
      false,
    );
  }
  assert.equal(
    validateTraditionalHouseInput(
      validInput({ google_maps_url: "https://maps.google.com/example" }),
      context(),
    ).success,
    true,
  );
});

test("display order rejects negative, fractional, and oversized values", () => {
  for (const value of ["-1", "1.5", "2147483648"]) {
    assert.equal(
      validateTraditionalHouseInput(
        validInput({ display_order: value }),
        context(),
      ).success,
      false,
    );
  }
});

test("lifecycle options match the applied migration", () => {
  assert.deepEqual(getAllowedTraditionalHouseStatuses(null), ["draft"]);
  assert.deepEqual(getAllowedTraditionalHouseStatuses("draft"), [
    "draft",
    "published",
    "archived",
  ]);
  assert.deepEqual(getAllowedTraditionalHouseStatuses("published"), [
    "published",
    "archived",
  ]);
  assert.deepEqual(getAllowedTraditionalHouseStatuses("archived"), [
    "archived",
    "draft",
  ]);
  assert.equal(
    validateTraditionalHouseInput(
      validInput({ status: "published" }),
      context({
        mode: "update",
        currentStatus: "archived",
        hasThumbnail: true,
      }),
    ).success,
    false,
  );
});

test("publication requires thumbnail metadata", () => {
  const result = validateTraditionalHouseInput(
    validInput({ status: "published" }),
    context({ mode: "update", currentStatus: "draft" }),
  );
  assert.equal(result.success, false);
  if (!result.success) {
    assert.match(result.formErrors.join(" "), /gambar utama/);
  }
});

test("publication rejects placeholder cultural and visitor information", () => {
  for (const values of [
    { history: "Isi nanti" },
    { cultural_significance: "TBD" },
    { visitor_information: "TODO" },
  ]) {
    assert.equal(
      validateTraditionalHouseInput(
        validInput({ status: "published", ...values }),
        context({
          mode: "update",
          currentStatus: "draft",
          hasThumbnail: true,
        }),
      ).success,
      false,
    );
  }
});

test("slug normalization is deterministic and malformed slugs are rejected", () => {
  assert.equal(
    normalizeTraditionalHouseSlug("  Rumah Adat Déda & Keluarga  "),
    "rumah-adat-deda-keluarga",
  );
  assert.equal(isValidTraditionalHouseSlug("rumah-adat-deda-keluarga"), true);
  assert.equal(isValidTraditionalHouseSlug(""), false);
  assert.equal(isValidTraditionalHouseSlug("Rumah Adat"), false);
});

test("duplicate handling recognizes only traditional-house name and slug constraints", () => {
  assert.equal(
    isTraditionalHouseDuplicateConstraintError(
      "23505",
      'unique constraint "traditional_houses_slug_key"',
    ),
    true,
  );
  assert.equal(
    isTraditionalHouseDuplicateConstraintError(
      "23505",
      'unique constraint "traditional_houses_active_name_idx"',
    ),
    true,
  );
  assert.equal(
    isTraditionalHouseDuplicateConstraintError(
      "23505",
      'unique constraint "traditional_houses_pkey"',
    ),
    false,
  );
});

test("route IDs and mutation mode use trusted server values", () => {
  assert.equal(
    isValidTraditionalHouseId("10000000-0000-4000-8000-000000000001"),
    true,
  );
  assert.equal(isValidTraditionalHouseId("not-a-uuid"), false);
  assert.equal(isValidTraditionalHouseId("../rahasia"), false);
  assert.equal(getTraditionalHouseMutationMode(null), "create");
  assert.equal(
    getTraditionalHouseMutationMode({ id: "server-read-id" }),
    "update",
  );
});

test("unknown contact, price, source-note, audit, and slug fields are rejected", () => {
  for (const values of [
    { contact_phone: "0812" },
    { contact_consent_confirmed: true },
    { entrance_fee: "10000" },
    { source_note: "internal" },
    { id: "client-id" },
    { created_by: "client-audit-id" },
    { slug: "client-slug" },
  ]) {
    const result = validateTraditionalHouseInput(validInput(values), context());
    assert.equal(result.success, false);
    if (!result.success) {
      assert.deepEqual(result.formErrors, [
        "Formulir memuat kolom yang tidak dikenali.",
      ]);
    }
  }
});

test("malformed text and featured values are rejected", () => {
  assert.equal(
    validateTraditionalHouseInput(
      validInput({ name: ["Satu", "Dua"] }),
      context(),
    ).success,
    false,
  );
  assert.equal(
    validateTraditionalHouseInput(validInput({ is_featured: "ya" }), context())
      .success,
    false,
  );
});

function trustedSource(overrides = {}) {
  return {
    id: HOUSE_ID,
    name: "Rumah Adat Karang Bajo",
    slug: TRUSTED_OLD_SLUG,
    source_revision: 1,
    summary: null,
    description: "Deskripsi rumah adat yang sudah diverifikasi",
    history: null,
    cultural_significance: null,
    location_name: null,
    latitude: null,
    longitude: null,
    google_maps_url: null,
    visitor_information: null,
    thumbnail_path: null,
    thumbnail_bucket: null,
    status: "draft",
    published_at: null,
    is_featured: false,
    display_order: 0,
    created_at: "2026-08-10T10:00:00.000Z",
    updated_at: "2026-08-10T10:00:00.000Z",
    ...overrides,
  };
}

function sourceForm(overrides = {}) {
  const formData = new FormData();
  for (const [field, value] of Object.entries({
    name: "Rumah Adat Karang Bajo",
    description: "Deskripsi rumah adat yang sudah diverifikasi",
    display_order: "0",
    status: "draft",
    ...overrides,
  })) {
    formData.set(field, String(value));
  }
  return formData;
}

function previousSourceActionState() {
  return {
    kind: "idle",
    values: emptyTraditionalHouseFormValues(),
    fieldErrors: {},
    formErrors: [],
    message: null,
    revision: 0,
  };
}

function createSourceRuntime() {
  const runtime = {
    client: null,
    events: [],
    paths: [],
    writes: [],
    reads: [],
    authCalls: 0,
    authorizationError: null,
    insertResponse: { error: null },
    createdReadResponse: {
      data: { id: HOUSE_ID, slug: TRUSTED_CREATED_SLUG },
      error: null,
    },
    updateResponse: { error: null },
    refreshResponse: {
      success: true,
      house: trustedSource(),
    },
    queryCalls: 0,
  };

  runtime.client = {
    from(table) {
      assert.equal(table, "traditional_houses");
      return {
        insert(payload) {
          runtime.events.push("mutation:insert");
          runtime.writes.push({ operation: "insert", payload });
          return Promise.resolve(runtime.insertResponse);
        },
        update(payload) {
          runtime.events.push("mutation:update");
          runtime.writes.push({ operation: "update", payload });
          return {
            eq(field, value) {
              runtime.events.push(`update-filter:${field}:${value}`);
              return Promise.resolve(runtime.updateResponse);
            },
          };
        },
        select(columns) {
          runtime.events.push(`post-write-read:${columns}`);
          const chain = {
            eq(field, value) {
              runtime.reads.push({ field, value });
              return chain;
            },
            maybeSingle() {
              return chain;
            },
            overrideTypes() {
              return Promise.resolve(runtime.createdReadResponse);
            },
          };
          return chain;
        },
      };
    },
  };

  return runtime;
}

async function loadTraditionalHouseActions(runtime) {
  const actionSource = readFileSync(
    "features/traditional-houses/actions.ts",
    "utf8",
  )
    .replace(/^"use server";\s*/m, "")
    .replace(/import\s+[\s\S]*?from\s+["'][^"']+["'];\s*/g, "");
  const stripped = stripTypeScriptTypes(actionSource, { mode: "strip" });
  const key = `__traditionalHouseActionDeps_${Math.random().toString(36).slice(2)}`;
  globalThis[key] = {
    ...createPublicRevalidationMock(runtime),
    revalidatePath: (path) => {
      runtime.paths.push(path);
      runtime.events.push(`revalidate:${path}`);
    },
    getPublicTraditionalHousePath: (slug) =>
      `/rumah-adat/${encodeURIComponent(slug)}`,
    getPublicEnglishTraditionalHousePath: (slug) =>
      `/en/traditional-houses/${encodeURIComponent(slug)}`,
    PUBLIC_TRADITIONAL_HOUSES_PATH: "/rumah-adat",
    PUBLIC_ENGLISH_TRADITIONAL_HOUSES_PATH: "/en/traditional-houses",
    redirect: (path) => {
      runtime.events.push(`redirect:${path}`);
      const error = new Error("REDIRECT");
      error.path = path;
      throw error;
    },
    requireAdministrator: async () => {
      runtime.authCalls += 1;
      runtime.events.push("authorization");
      if (runtime.authorizationError) throw runtime.authorizationError;
      return { id: "administrator-id" };
    },
    createClient: async () => runtime.client,
    queryTraditionalHouseById: async (supabase, id) => {
      assert.equal(supabase, runtime.client);
      assert.equal(id, HOUSE_ID);
      runtime.queryCalls += 1;
      runtime.events.push(
        runtime.queryCalls === 1
          ? "authoritative-read"
          : "post-mutation-refresh",
      );
      return runtime.queryCalls === 1
        ? { success: true, house: trustedSource() }
        : runtime.refreshResponse;
    },
    isTraditionalHouseDuplicateConstraintError,
    isValidTraditionalHouseId,
    isValidTraditionalHouseSlug,
    normalizeTraditionalHouseSlug,
    validateTraditionalHouseFormData,
  };

  try {
    return await import(
      `data:text/javascript;charset=utf-8,${encodeURIComponent(
        `const deps = globalThis.${key};
const { revalidatePublicDomainPaths, revalidatePublicDomainDetailPaths,
  revalidatePath, getPublicTraditionalHousePath,
  getPublicEnglishTraditionalHousePath, PUBLIC_TRADITIONAL_HOUSES_PATH,
  PUBLIC_ENGLISH_TRADITIONAL_HOUSES_PATH, redirect, requireAdministrator, createClient,
  queryTraditionalHouseById, isTraditionalHouseDuplicateConstraintError,
  isValidTraditionalHouseId, isValidTraditionalHouseSlug,
  normalizeTraditionalHouseSlug, validateTraditionalHouseFormData } = deps;
${stripped}`,
      )}`
    );
  } finally {
    delete globalThis[key];
  }
}

const sourceRuntime = createSourceRuntime();
const sourceActions = loadTraditionalHouseActions(sourceRuntime);

async function invokeSource({
  mode,
  formOverrides = {},
  clientSlug = null,
  insertResponse = { error: null },
  createdReadResponse = sourceRuntime.createdReadResponse,
  updateResponse = { error: null },
  refreshResponse = { success: true, house: trustedSource() },
}) {
  sourceRuntime.events = [];
  sourceRuntime.paths = [];
  sourceRuntime.writes = [];
  sourceRuntime.reads = [];
  sourceRuntime.authCalls = 0;
  sourceRuntime.authorizationError = null;
  sourceRuntime.insertResponse = insertResponse;
  sourceRuntime.createdReadResponse = createdReadResponse;
  sourceRuntime.updateResponse = updateResponse;
  sourceRuntime.refreshResponse = refreshResponse;
  sourceRuntime.queryCalls = 0;

  const formData = sourceForm(formOverrides);
  if (clientSlug) formData.set("slug", clientSlug);
  const actionModule = await sourceActions;
  const previous = previousSourceActionState();

  try {
    const result =
      mode === "create"
        ? await actionModule.createTraditionalHouse(previous, formData)
        : await actionModule.updateTraditionalHouse(
            HOUSE_ID,
            previous,
            formData,
          );
    return { result, redirectPath: null };
  } catch (error) {
    if (error?.message === "REDIRECT") {
      return { result: null, redirectPath: error.path };
    }
    throw error;
  }
}

test("Traditional House create preserves committed success when post-read is unavailable", async () => {
  const created = await invokeSource({
    mode: "create",
    createdReadResponse: {
      data: { id: HOUSE_ID, slug: TRUSTED_CREATED_SLUG },
      error: null,
    },
  });
  assert.equal(
    created.redirectPath,
    `/admin/rumah-adat/${HOUSE_ID}/edit?success=created`,
  );
  assert.deepEqual(sourceRuntime.paths, [
    "/admin/rumah-adat",
    "/rumah-adat",
    "/en/traditional-houses",
    "/en",
    "/en/tourism-map",
    `/admin/rumah-adat/${HOUSE_ID}/edit`,
    `/rumah-adat/${TRUSTED_CREATED_SLUG}`,
    `/en/traditional-houses/${TRUSTED_CREATED_SLUG}`,
  ]);
  assert.ok(
    sourceRuntime.events.indexOf("mutation:insert") <
      sourceRuntime.events.indexOf("revalidate:/en/traditional-houses"),
  );
  assert.ok(
    sourceRuntime.events.indexOf("revalidate:/en/traditional-houses") <
      sourceRuntime.events.indexOf("post-write-read:id,slug"),
  );

  const createdReadFailure = await invokeSource({
    mode: "create",
    createdReadResponse: {
      data: null,
      error: { code: "read-failed" },
    },
  });
  assert.equal(createdReadFailure.result.kind, "success");
  assert.match(createdReadFailure.result.message, /berhasil disimpan/);
  assert.deepEqual(sourceRuntime.paths, [
    "/admin/rumah-adat",
    "/rumah-adat",
    "/en/traditional-houses",
    "/en",
    "/en/tourism-map",
  ]);
  assert.equal(
    sourceRuntime.events.some((event) => event.startsWith("redirect:")),
    false,
  );

  const createdRowAbsent = await invokeSource({
    mode: "create",
    createdReadResponse: {
      data: null,
      error: null,
    },
  });
  assert.equal(createdRowAbsent.result.kind, "success");
  assert.deepEqual(sourceRuntime.paths, [
    "/admin/rumah-adat",
    "/rumah-adat",
    "/en/traditional-houses",
    "/en",
    "/en/tourism-map",
  ]);
  assert.equal(
    sourceRuntime.paths.some((path) => path.includes(TRUSTED_CREATED_SLUG)),
    false,
  );

  const mutationFailure = await invokeSource({
    mode: "create",
    insertResponse: {
      error: {
        code: "23505",
        message: 'unique constraint "traditional_houses_slug_key"',
      },
    },
  });
  assert.equal(mutationFailure.result.kind, "duplicate-error");
  assert.deepEqual(sourceRuntime.paths, []);
});

test("Traditional House updates invalidate trusted old/current slugs around refresh", async () => {
  const unchanged = await invokeSource({
    mode: "update",
    refreshResponse: { success: true, house: trustedSource() },
  });
  assert.equal(
    unchanged.redirectPath,
    `/admin/rumah-adat/${HOUSE_ID}/edit?success=updated`,
  );
  assert.deepEqual(sourceRuntime.paths, [
    "/rumah-adat",
    "/en/traditional-houses",
    "/en",
    "/en/tourism-map",
    `/rumah-adat/${TRUSTED_OLD_SLUG}`,
    `/en/traditional-houses/${TRUSTED_OLD_SLUG}`,
    "/admin/rumah-adat",
    `/admin/rumah-adat/${HOUSE_ID}/edit`,
  ]);
  assert.ok(
    sourceRuntime.events.indexOf("mutation:update") <
      sourceRuntime.events.indexOf("revalidate:/en/traditional-houses"),
  );
  assert.ok(
    sourceRuntime.events.indexOf(
      `revalidate:/en/traditional-houses/${TRUSTED_OLD_SLUG}`,
    ) < sourceRuntime.events.indexOf("post-mutation-refresh"),
  );

  const changed = await invokeSource({
    mode: "update",
    refreshResponse: {
      success: true,
      house: trustedSource({ slug: TRUSTED_NEW_SLUG }),
    },
  });
  assert.equal(
    changed.redirectPath,
    `/admin/rumah-adat/${HOUSE_ID}/edit?success=updated`,
  );
  assert.deepEqual(sourceRuntime.paths, [
    "/rumah-adat",
    "/en/traditional-houses",
    "/en",
    "/en/tourism-map",
    `/rumah-adat/${TRUSTED_OLD_SLUG}`,
    `/en/traditional-houses/${TRUSTED_OLD_SLUG}`,
    "/admin/rumah-adat",
    `/admin/rumah-adat/${HOUSE_ID}/edit`,
    `/rumah-adat/${TRUSTED_NEW_SLUG}`,
    `/en/traditional-houses/${TRUSTED_NEW_SLUG}`,
  ]);

  const refreshFailure = await invokeSource({
    mode: "update",
    refreshResponse: { success: false },
  });
  assert.equal(refreshFailure.result.kind, "success");
  assert.match(refreshFailure.result.message, /berhasil disimpan/);
  assert.deepEqual(sourceRuntime.paths, [
    "/rumah-adat",
    "/en/traditional-houses",
    "/en",
    "/en/tourism-map",
    `/rumah-adat/${TRUSTED_OLD_SLUG}`,
    `/en/traditional-houses/${TRUSTED_OLD_SLUG}`,
    "/admin/rumah-adat",
    `/admin/rumah-adat/${HOUSE_ID}/edit`,
  ]);

  const refreshedRowAbsent = await invokeSource({
    mode: "update",
    refreshResponse: { success: true, house: null },
  });
  assert.equal(refreshedRowAbsent.result.kind, "success");
  assert.deepEqual(sourceRuntime.paths, [
    "/rumah-adat",
    "/en/traditional-houses",
    "/en",
    "/en/tourism-map",
    `/rumah-adat/${TRUSTED_OLD_SLUG}`,
    `/en/traditional-houses/${TRUSTED_OLD_SLUG}`,
    "/admin/rumah-adat",
    `/admin/rumah-adat/${HOUSE_ID}/edit`,
  ]);
  assert.equal(
    sourceRuntime.paths.some((path) => path.includes(TRUSTED_NEW_SLUG)),
    false,
  );

  const failedUpdate = await invokeSource({
    mode: "update",
    updateResponse: {
      error: {
        code: "23505",
        message: 'unique constraint "traditional_houses_slug_key"',
      },
    },
  });
  assert.equal(failedUpdate.result.kind, "duplicate-error");
  assert.deepEqual(sourceRuntime.paths, []);

  const clientSlug = await invokeSource({
    mode: "update",
    clientSlug: "attacker-controlled-slug",
  });
  assert.equal(clientSlug.result.kind, "validation-error");
  assert.deepEqual(sourceRuntime.paths, []);
  assert.equal(
    sourceRuntime.paths.includes(
      "/en/traditional-houses/attacker-controlled-slug",
    ),
    false,
  );
});
