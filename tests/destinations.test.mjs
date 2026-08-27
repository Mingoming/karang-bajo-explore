import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";

import { createPublicRevalidationMock } from "./public-revalidation-test-helpers.mjs";

import {
  getAllowedDestinationStatuses,
  getDestinationMutationMode,
  isDestinationDuplicateConstraintError,
  isValidDestinationId,
  isValidDestinationSlug,
  normalizeDestinationSlug,
  validateDestinationFormData,
  validateDestinationInput,
} from "../features/destinations/model.ts";

const CATEGORY_ID = "10000000-0000-4000-8000-000000000001";

function validInput(overrides = {}) {
  return {
    category_id: CATEGORY_ID,
    name: "Kampung Adat",
    summary: "Ringkasan yang sudah diverifikasi",
    description: "Deskripsi destinasi yang sudah diverifikasi",
    latitude: "-8.2731",
    longitude: "116.4251",
    display_order: "2",
    status: "draft",
    ...overrides,
  };
}

function validationContext(overrides = {}) {
  return {
    mode: "create",
    hasThumbnail: false,
    allowedCategoryIds: [CATEGORY_ID],
    ...overrides,
  };
}

test("destination form values become a trimmed typed payload", () => {
  const formData = new FormData();
  for (const [field, value] of Object.entries(
    validInput({
      name: "  Kampung Adat  ",
      summary: "  Ringkasan resmi  ",
      history: "  Sejarah terverifikasi  ",
      entrance_fee: "0",
      facilities: " Parkir \n\n Toilet ",
      google_maps_url: " https://maps.google.com/example ",
    }),
  )) {
    formData.set(field, String(value));
  }
  formData.set("is_featured", "on");

  const result = validateDestinationFormData(formData, validationContext());

  assert.equal(result.success, true);
  if (!result.success) return;
  assert.equal(result.data.name, "Kampung Adat");
  assert.equal(result.data.summary, "Ringkasan resmi");
  assert.equal(result.data.history, "Sejarah terverifikasi");
  assert.equal(result.data.entrance_fee, 0);
  assert.deepEqual(result.data.facilities, ["Parkir", "Toilet"]);
  assert.equal(result.data.is_featured, true);
  assert.equal(result.data.contact_consent_confirmed, false);
  assert.equal(result.data.display_order, 2);
});

test("required destination text rejects missing and whitespace-only values", () => {
  const result = validateDestinationInput(
    validInput({ name: " ", summary: "", description: "   " }),
    validationContext(),
  );

  assert.equal(result.success, false);
  if (result.success) return;
  assert.match(result.fieldErrors.name ?? "", /wajib diisi/);
  assert.match(result.fieldErrors.summary ?? "", /wajib diisi/);
  assert.match(result.fieldErrors.description ?? "", /wajib diisi/);
});

test("empty optional fields normalize to null and empty facilities", () => {
  const result = validateDestinationInput(
    validInput({
      history: " ",
      google_maps_url: "",
      opening_hours: "",
      entrance_fee: "",
      price_note: "",
      facilities: "\n",
      contact_name: "",
      contact_phone: "",
    }),
    validationContext(),
  );

  assert.equal(result.success, true);
  if (!result.success) return;
  assert.equal(result.data.history, null);
  assert.equal(result.data.google_maps_url, null);
  assert.equal(result.data.entrance_fee, null);
  assert.equal(result.data.contact_phone, null);
  assert.deepEqual(result.data.facilities, []);
});

test("category IDs must be valid UUIDs and available database options", () => {
  const malformed = validateDestinationInput(
    validInput({ category_id: "alam" }),
    validationContext(),
  );
  assert.equal(malformed.success, false);
  if (!malformed.success) {
    assert.match(malformed.fieldErrors.category_id ?? "", /tidak valid/);
  }

  const unavailable = validateDestinationInput(
    validInput({ category_id: "20000000-0000-4000-8000-000000000001" }),
    validationContext(),
  );
  assert.equal(unavailable.success, false);
  if (!unavailable.success) {
    assert.match(unavailable.fieldErrors.category_id ?? "", /tidak tersedia/);
  }
});

test("mandatory coordinates reject missing, malformed, infinite, and out-of-range values", () => {
  for (const overrides of [
    { latitude: "" },
    { longitude: " " },
    { latitude: "bukan-angka" },
    { longitude: "Infinity" },
    { latitude: "90.1" },
    { longitude: "-180.1" },
  ]) {
    const result = validateDestinationInput(
      validInput(overrides),
      validationContext(),
    );
    assert.equal(result.success, false);
  }
});

test("price, display order, and Google Maps URL enforce their database-facing types", () => {
  for (const overrides of [
    { entrance_fee: "-1" },
    { entrance_fee: "0x10" },
    { display_order: "1.5" },
    { display_order: "-1" },
    { display_order: "2147483648" },
    { google_maps_url: "bukan-url" },
    { google_maps_url: "ftp://maps.example.test" },
  ]) {
    const result = validateDestinationInput(
      validInput(overrides),
      validationContext(),
    );
    assert.equal(result.success, false);
  }
});

test("lifecycle validation follows the applied migration transitions", () => {
  assert.deepEqual(getAllowedDestinationStatuses(null), ["draft"]);
  assert.deepEqual(getAllowedDestinationStatuses("draft"), [
    "draft",
    "published",
    "archived",
  ]);
  assert.deepEqual(getAllowedDestinationStatuses("published"), [
    "published",
    "archived",
  ]);
  assert.deepEqual(getAllowedDestinationStatuses("archived"), [
    "archived",
    "draft",
  ]);

  const invalidRestore = validateDestinationInput(
    validInput({ status: "published" }),
    validationContext({
      mode: "update",
      currentStatus: "archived",
      hasThumbnail: true,
    }),
  );
  assert.equal(invalidRestore.success, false);

  const unsupportedStatus = validateDestinationInput(
    validInput({ status: "scheduled" }),
    validationContext(),
  );
  assert.equal(unsupportedStatus.success, false);
  if (!unsupportedStatus.success) {
    assert.match(unsupportedStatus.fieldErrors.status ?? "", /tidak valid/);
  }
});

test("publication checks thumbnail, consent, and placeholder content", () => {
  const missingThumbnail = validateDestinationInput(
    validInput({ status: "published" }),
    validationContext({
      mode: "update",
      currentStatus: "draft",
      hasThumbnail: false,
    }),
  );
  assert.equal(missingThumbnail.success, false);
  if (!missingThumbnail.success) {
    assert.match(missingThumbnail.formErrors.join(" "), /gambar utama/);
  }

  const missingConsent = validateDestinationInput(
    validInput({ status: "published", contact_name: "Kontak Uji" }),
    validationContext({
      mode: "update",
      currentStatus: "draft",
      hasThumbnail: true,
    }),
  );
  assert.equal(missingConsent.success, false);
  if (!missingConsent.success) {
    assert.match(
      missingConsent.fieldErrors.contact_consent_confirmed ?? "",
      /persetujuan/i,
    );
  }

  const placeholder = validateDestinationInput(
    validInput({ status: "published", summary: "Isi nanti" }),
    validationContext({
      mode: "update",
      currentStatus: "draft",
      hasThumbnail: true,
    }),
  );
  assert.equal(placeholder.success, false);
  if (!placeholder.success) {
    assert.match(placeholder.fieldErrors.summary ?? "", /placeholder/);
  }
});

test("slug normalization is deterministic and malformed slugs are rejected", () => {
  assert.equal(
    normalizeDestinationSlug("  Désa & Kampung Adat  "),
    "desa-kampung-adat",
  );
  assert.equal(isValidDestinationSlug("desa-kampung-adat"), true);
  assert.equal(isValidDestinationSlug(""), false);
  assert.equal(isValidDestinationSlug("Destinasi Tidak Valid"), false);
  assert.equal(isValidDestinationSlug("-destinasi-"), false);
});

test("duplicate handling recognizes only destination name and slug constraints", () => {
  assert.equal(
    isDestinationDuplicateConstraintError(
      "23505",
      'duplicate key violates unique constraint "destinations_slug_key"',
    ),
    true,
  );
  assert.equal(
    isDestinationDuplicateConstraintError(
      "23505",
      'duplicate key violates unique constraint "destinations_active_name_idx"',
    ),
    true,
  );
  assert.equal(
    isDestinationDuplicateConstraintError(
      "23505",
      'duplicate key violates unique constraint "destinations_pkey"',
    ),
    false,
  );
  assert.equal(
    isDestinationDuplicateConstraintError(
      "23503",
      'violates foreign key constraint "destinations_category_id_fkey"',
    ),
    false,
  );
});

test("route ID validation accepts UUIDs and rejects malformed IDs", () => {
  assert.equal(isValidDestinationId(CATEGORY_ID), true);
  assert.equal(isValidDestinationId("not-a-uuid"), false);
  assert.equal(isValidDestinationId("../rahasia"), false);
});

test("create versus update mode depends on the server-read record", () => {
  assert.equal(getDestinationMutationMode(null), "create");
  assert.equal(
    getDestinationMutationMode({ id: "server-read-destination-id" }),
    "update",
  );
});

test("successful source mutations revalidate trusted English destination paths", () => {
  const actions = readFileSync("features/destinations/actions.ts", "utf8");
  const helperStart = actions.indexOf(
    "function revalidateEnglishDestinationPaths",
  );
  const helperEnd = actions.indexOf("function nextState", helperStart);
  const helperSource = actions.slice(helperStart, helperEnd);
  const createStart = actions.indexOf(
    "export async function createDestination",
  );
  const updateStart = actions.indexOf(
    "export async function updateDestination",
  );
  const createSource = actions.slice(createStart, updateStart);
  const updateSource = actions.slice(updateStart);

  assert.notEqual(helperStart, -1);
  assert.notEqual(helperEnd, -1);
  assert.match(
    helperSource,
    /revalidatePublicDomainPaths\("destination", trustedSlugs\)/,
  );

  assert.match(createSource, /\.select\("id,slug"\)/);
  assert.match(
    createSource,
    /revalidateEnglishDestinationPaths\(createdDestination\.slug\)/,
  );
  assert.match(updateSource, /\.select\("id,slug"\)/);
  assert.match(
    updateSource,
    /revalidateEnglishDestinationPaths\(\s*existingDestination\.slug,\s*updatedDestination\.slug,\s*\)/,
  );
  assert.doesNotMatch(updateSource, /formData\.get\(["']slug["']\)/);

  for (const source of [createSource, updateSource]) {
    assert.match(source, /revalidatePath\(DESTINATION_LIST_PATH\)/);
    assert.match(source, /revalidatePath\(`\$\{DESTINATION_LIST_PATH\}/);
  }
});

test("unknown fields and malformed values are rejected", () => {
  const unknown = validateDestinationInput(
    validInput({ created_by: "client-supplied-audit-id" }),
    validationContext(),
  );
  assert.equal(unknown.success, false);
  if (!unknown.success) {
    assert.deepEqual(unknown.formErrors, [
      "Formulir memuat kolom yang tidak dikenali.",
    ]);
  }

  const malformed = validateDestinationInput(
    validInput({ name: ["Satu", "Dua"] }),
    validationContext(),
  );
  assert.equal(malformed.success, false);
  if (!malformed.success) {
    assert.match(malformed.fieldErrors.name ?? "", /tidak valid/);
  }

  const malformedBoolean = validateDestinationInput(
    validInput({ is_featured: "ya" }),
    validationContext(),
  );
  assert.equal(malformedBoolean.success, false);
  if (!malformedBoolean.success) {
    assert.match(malformedBoolean.fieldErrors.is_featured ?? "", /tidak valid/);
  }
});

const DESTINATION_ACTION_ID = "b1100000-0000-4000-8000-000000000001";
const DESTINATION_OLD_SLUG = "destinasi-lama";
const DESTINATION_NEW_SLUG = "destinasi-baru";

function destinationActionForm(overrides = {}) {
  const formData = new FormData();
  for (const [field, value] of Object.entries(
    validInput({ ...overrides, status: overrides.status ?? "draft" }),
  )) {
    formData.set(field, String(value));
  }
  return formData;
}

function trustedDestination(overrides = {}) {
  return {
    id: DESTINATION_ACTION_ID,
    name: "Destinasi Karang Bajo",
    slug: DESTINATION_OLD_SLUG,
    status: "draft",
    thumbnail_bucket: null,
    thumbnail_path: null,
    ...overrides,
  };
}

function createDestinationActionRuntime() {
  const runtime = {
    client: null,
    events: [],
    paths: [],
    writes: [],
    authCalls: 0,
    categoryResult: {
      success: true,
      categories: [{ id: CATEGORY_ID, name: "Alam", slug: "alam" }],
    },
    existingResult: { success: true, destination: trustedDestination() },
    writeResponse: {
      data: [{ id: DESTINATION_ACTION_ID, slug: DESTINATION_OLD_SLUG }],
      error: null,
    },
    authorizationError: null,
  };

  runtime.client = {
    from(table) {
      assert.equal(table, "destinations");
      return {
        insert(payload) {
          runtime.events.push("mutation:insert");
          runtime.writes.push({ operation: "insert", payload });
          return {
            select(columns) {
              runtime.events.push(`post-write-read:${columns}`);
              return {
                overrideTypes: () => Promise.resolve(runtime.writeResponse),
              };
            },
          };
        },
        update(payload) {
          runtime.events.push("mutation:update");
          runtime.writes.push({ operation: "update", payload });
          return {
            eq(field, value) {
              runtime.events.push(`update-filter:${field}:${value}`);
              return {
                select(columns) {
                  runtime.events.push(`post-write-read:${columns}`);
                  return {
                    overrideTypes: () => Promise.resolve(runtime.writeResponse),
                  };
                },
              };
            },
          };
        },
      };
    },
  };

  return runtime;
}

async function loadDestinationActions(runtime) {
  const actionSource = readFileSync("features/destinations/actions.ts", "utf8")
    .replace(/^"use server";\s*/m, "")
    .replace(/import\s+[\s\S]*?from\s+["'][^"']+["'];\s*/g, "");
  const stripped = stripTypeScriptTypes(actionSource, { mode: "strip" });
  const key = `__destinationActionDeps_${Math.random().toString(36).slice(2)}`;
  globalThis[key] = {
    ...createPublicRevalidationMock(runtime),
    revalidatePath: (path) => {
      runtime.paths.push(path);
      runtime.events.push(`revalidate:${path}`);
    },
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
    queryDestinationById: async (supabase, id) => {
      assert.equal(supabase, runtime.client);
      assert.equal(id, DESTINATION_ACTION_ID);
      return runtime.existingResult;
    },
    queryDestinationCategories: async () => runtime.categoryResult,
    isValidDestinationId,
    isValidDestinationSlug,
    isDestinationDuplicateConstraintError,
    normalizeDestinationSlug,
    validateDestinationFormData,
  };

  try {
    return await import(
      `data:text/javascript;charset=utf-8,${encodeURIComponent(`
const deps = globalThis.${key};
const { revalidatePublicDomainPaths, revalidatePath, redirect,
  requireAdministrator, createClient, queryDestinationById,
  queryDestinationCategories, isValidDestinationId, isValidDestinationSlug,
  isDestinationDuplicateConstraintError, normalizeDestinationSlug,
  validateDestinationFormData } = deps;
${stripped}`)}`
    );
  } finally {
    delete globalThis[key];
  }
}

async function invokeDestinationAction(runtime, mode, options = {}) {
  runtime.events = [];
  runtime.paths = [];
  runtime.writes = [];
  runtime.authCalls = 0;
  runtime.authorizationError = null;
  runtime.writeResponse = options.writeResponse ?? {
    data: [{ id: DESTINATION_ACTION_ID, slug: DESTINATION_OLD_SLUG }],
    error: null,
  };
  runtime.existingResult = options.existingResult ?? {
    success: true,
    destination: trustedDestination(),
  };

  const actionModule = await loadDestinationActions(runtime);
  const previous = { revision: 0 };
  const formData = destinationActionForm(options.formOverrides);
  if (options.clientSlug) formData.set("slug", options.clientSlug);

  try {
    const result =
      mode === "create"
        ? await actionModule.createDestination(previous, formData)
        : await actionModule.updateDestination(
            DESTINATION_ACTION_ID,
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

test("Destination source actions revalidate trusted old and new slugs at runtime", async () => {
  const createdRuntime = createDestinationActionRuntime();
  const created = await invokeDestinationAction(createdRuntime, "create", {
    writeResponse: {
      data: [{ id: DESTINATION_ACTION_ID, slug: DESTINATION_NEW_SLUG }],
      error: null,
    },
  });
  assert.equal(
    created.redirectPath,
    `/admin/destinasi/${DESTINATION_ACTION_ID}/edit?success=created`,
  );
  assert.deepEqual(createdRuntime.paths, [
    "/admin/destinasi",
    `/admin/destinasi/${DESTINATION_ACTION_ID}/edit`,
    "/destinasi",
    "/en/destinations",
    "/en",
    "/en/tourism-map",
    `/destinasi/${DESTINATION_NEW_SLUG}`,
    `/en/destinations/${DESTINATION_NEW_SLUG}`,
  ]);

  const updatedRuntime = createDestinationActionRuntime();
  const updated = await invokeDestinationAction(updatedRuntime, "update", {
    writeResponse: {
      data: [{ id: DESTINATION_ACTION_ID, slug: DESTINATION_NEW_SLUG }],
      error: null,
    },
  });
  assert.equal(
    updated.redirectPath,
    `/admin/destinasi/${DESTINATION_ACTION_ID}/edit?success=updated`,
  );
  assert.deepEqual(updatedRuntime.paths, [
    "/admin/destinasi",
    `/admin/destinasi/${DESTINATION_ACTION_ID}/edit`,
    "/destinasi",
    "/en/destinations",
    "/en",
    "/en/tourism-map",
    `/destinasi/${DESTINATION_OLD_SLUG}`,
    `/en/destinations/${DESTINATION_OLD_SLUG}`,
    `/destinasi/${DESTINATION_NEW_SLUG}`,
    `/en/destinations/${DESTINATION_NEW_SLUG}`,
  ]);
  assert.ok(
    updatedRuntime.events.indexOf("mutation:update") <
      updatedRuntime.events.indexOf("revalidate:/en/destinations"),
  );

  const failedRuntime = createDestinationActionRuntime();
  const failed = await invokeDestinationAction(failedRuntime, "update", {
    writeResponse: {
      data: null,
      error: {
        code: "23505",
        message: 'unique constraint "destinations_slug_key"',
      },
    },
  });
  assert.equal(failed.result.kind, "duplicate-error");
  assert.deepEqual(failedRuntime.paths, []);

  const clientSlugRuntime = createDestinationActionRuntime();
  const clientSlug = await invokeDestinationAction(
    clientSlugRuntime,
    "update",
    { clientSlug: "attacker-controlled-slug" },
  );
  assert.equal(clientSlug.result.kind, "validation-error");
  assert.deepEqual(clientSlugRuntime.paths, []);
});
