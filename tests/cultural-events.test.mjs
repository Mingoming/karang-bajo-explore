import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";

import {
  getAllowedCulturalEventStatuses,
  getCulturalEventMutationMode,
  emptyCulturalEventFormValues,
  isCulturalEventDuplicateConstraintError,
  isValidCulturalEventId,
  isValidCulturalEventSlug,
  normalizeCulturalEventSlug,
  isoToWitaLocal,
  validateCulturalEventFormData,
  validateCulturalEventInput,
  witaLocalToIso,
} from "../features/cultural-events/model.ts";

function validInput(overrides = {}) {
  return {
    title: "Festival Budaya Karang Bajo",
    description: "Informasi acara yang telah diverifikasi",
    start_at_local: "2030-08-17T09:30",
    status: "draft",
    ...overrides,
  };
}

function context(overrides = {}) {
  return { mode: "create", hasThumbnail: false, ...overrides };
}

test("cultural-event form values become a trimmed typed payload", () => {
  const formData = new FormData();
  for (const [field, value] of Object.entries(
    validInput({
      title: "  Festival Budaya Karang Bajo  ",
      summary: "  Ringkasan  ",
      event_type: "  Upacara  ",
      end_at_local: "2030-08-17T11:30",
      date_note: "  Jadwal terkonfirmasi  ",
      location_name: "  Bale Desa  ",
      address: "  Karang Bajo  ",
      latitude: "-8.2731",
      longitude: "116.4251",
      google_maps_url: " https://maps.google.com/example ",
      organizer: "  Pemerintah Desa  ",
      contact_phone: "  08123456789  ",
      visitor_information: "  Hadir tepat waktu  ",
    }),
  )) {
    formData.set(field, String(value));
  }
  formData.set("all_day", "on");
  formData.set("contact_consent_confirmed", "on");
  formData.set("is_featured", "on");
  const result = validateCulturalEventFormData(formData, context());
  assert.equal(result.success, true);
  if (!result.success) return;
  assert.equal(result.data.title, "Festival Budaya Karang Bajo");
  assert.equal(result.data.start_at, "2030-08-17T01:30:00.000Z");
  assert.equal(result.data.end_at, "2030-08-17T03:30:00.000Z");
  assert.equal(result.data.contact_phone, "08123456789");
  assert.equal(result.data.all_day, true);
  assert.equal(result.data.is_featured, true);
});

test("required event fields reject missing and whitespace-only values", () => {
  const result = validateCulturalEventInput(
    validInput({ title: " ", description: "   " }),
    context(),
  );
  assert.equal(result.success, false);
  if (!result.success) {
    assert.match(result.fieldErrors.title ?? "", /wajib diisi/);
    assert.match(result.fieldErrors.description ?? "", /wajib diisi/);
  }
});

test("nullable event fields normalize to null", () => {
  const result = validateCulturalEventInput(
    validInput({
      summary: " ",
      event_type: "",
      end_at_local: "",
      date_note: "",
      location_name: "",
      address: "",
      latitude: "",
      longitude: "",
      google_maps_url: "",
      organizer: "",
      contact_phone: "",
      visitor_information: "",
    }),
    context(),
  );
  assert.equal(result.success, true);
  if (!result.success) return;
  assert.equal(result.data.summary, null);
  assert.equal(result.data.end_at, null);
  assert.equal(result.data.latitude, null);
  assert.equal(result.data.contact_phone, null);
});

test("WITA conversion is deterministic and round-trips without browser timezone", () => {
  for (const local of ["2030-01-10T09:30", "2030-07-10T09:30"]) {
    const iso = witaLocalToIso(local);
    assert.ok(iso);
    assert.equal(isoToWitaLocal(iso), local);
    assert.match(iso, /T01:30:00\.000Z$/);
  }
});

test("invalid calendar dates and malformed times are rejected", () => {
  for (const value of [
    "2030-02-30T09:00",
    "2030-01-10T25:00",
    "2030-01-10 09:00",
    "not-a-date",
  ]) {
    assert.equal(witaLocalToIso(value), null);
    assert.equal(
      validateCulturalEventInput(
        validInput({ start_at_local: value }),
        context(),
      ).success,
      false,
    );
  }
});

test("end time requires a start and cannot precede it", () => {
  assert.equal(
    validateCulturalEventInput(
      validInput({ start_at_local: "", end_at_local: "2030-08-17T10:00" }),
      context(),
    ).success,
    false,
  );
  assert.equal(
    validateCulturalEventInput(
      validInput({ end_at_local: "2030-08-17T08:00" }),
      context(),
    ).success,
    false,
  );
});

test("uncertain-date draft is accepted but publication is rejected", () => {
  assert.equal(
    validateCulturalEventInput(
      validInput({
        start_at_local: "",
        date_note: "Tanggal belum dikonfirmasi",
      }),
      context(),
    ).success,
    true,
  );
  const result = validateCulturalEventInput(
    validInput({
      start_at_local: "",
      date_note: "Tanggal belum dikonfirmasi",
      status: "published",
    }),
    context({ mode: "update", currentStatus: "draft", hasThumbnail: true }),
  );
  assert.equal(result.success, false);
  if (!result.success) {
    assert.match(result.fieldErrors.start_at_local ?? "", /wajib tersedia/);
  }
});

test("coordinates allow an empty pair or valid pair and reject malformed pairs", () => {
  assert.equal(
    validateCulturalEventInput(validInput(), context()).success,
    true,
  );
  assert.equal(
    validateCulturalEventInput(
      validInput({ latitude: "-8.2", longitude: "116.4" }),
      context(),
    ).success,
    true,
  );
  for (const values of [
    { latitude: "-8.2" },
    { longitude: "116.4" },
    { latitude: "NaN", longitude: "116.4" },
    { latitude: "90.1", longitude: "116.4" },
    { latitude: "-8.2", longitude: "Infinity" },
  ]) {
    assert.equal(
      validateCulturalEventInput(validInput(values), context()).success,
      false,
    );
  }
});

test("Google Maps URL accepts HTTP and HTTPS only", () => {
  for (const value of ["bukan-url", "ftp://example.com"]) {
    assert.equal(
      validateCulturalEventInput(
        validInput({ google_maps_url: value }),
        context(),
      ).success,
      false,
    );
  }
  assert.equal(
    validateCulturalEventInput(
      validInput({ google_maps_url: "https://maps.google.com/example" }),
      context(),
    ).success,
    true,
  );
});

test("published contact requires recorded consent", () => {
  const base = {
    status: "published",
    contact_phone: "08123456789",
  };
  const publishContext = context({
    mode: "update",
    currentStatus: "draft",
    hasThumbnail: true,
  });
  assert.equal(
    validateCulturalEventInput(validInput(base), publishContext).success,
    false,
  );
  assert.equal(
    validateCulturalEventInput(
      validInput({ ...base, contact_consent_confirmed: true }),
      publishContext,
    ).success,
    true,
  );
});

test("lifecycle options match the applied migration", () => {
  assert.deepEqual(getAllowedCulturalEventStatuses(null), ["draft"]);
  assert.deepEqual(getAllowedCulturalEventStatuses("draft"), [
    "draft",
    "published",
    "archived",
  ]);
  assert.deepEqual(getAllowedCulturalEventStatuses("published"), [
    "published",
    "archived",
  ]);
  assert.deepEqual(getAllowedCulturalEventStatuses("archived"), [
    "archived",
    "draft",
  ]);
});

test("publication requires thumbnail and rejects placeholder content", () => {
  const noThumbnail = validateCulturalEventInput(
    validInput({ status: "published" }),
    context({ mode: "update", currentStatus: "draft", hasThumbnail: false }),
  );
  assert.equal(noThumbnail.success, false);
  if (!noThumbnail.success) {
    assert.match(noThumbnail.formErrors.join(" "), /gambar utama/);
  }
  for (const values of [
    { description: "TODO" },
    { date_note: "Isi nanti" },
    { location_name: "TBD" },
  ]) {
    assert.equal(
      validateCulturalEventInput(
        validInput({ ...values, status: "published" }),
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

test("slug generation is deterministic and duplicate classification is exact", () => {
  assert.equal(
    normalizeCulturalEventSlug("  Festival Dédé & Budaya  "),
    "festival-dede-budaya",
  );
  assert.equal(isValidCulturalEventSlug("festival-dede-budaya"), true);
  assert.equal(isValidCulturalEventSlug(""), false);
  assert.equal(
    isCulturalEventDuplicateConstraintError(
      "23505",
      'unique constraint "cultural_events_slug_key"',
    ),
    true,
  );
  assert.equal(
    isCulturalEventDuplicateConstraintError(
      "23505",
      'unique constraint "cultural_events_pkey"',
    ),
    false,
  );
});

test("route IDs and mutation mode use trusted server values", () => {
  assert.equal(
    isValidCulturalEventId("10000000-0000-4000-8000-000000000001"),
    true,
  );
  assert.equal(isValidCulturalEventId("not-a-uuid"), false);
  assert.equal(isValidCulturalEventId("../rahasia"), false);
  assert.equal(getCulturalEventMutationMode(null), "create");
  assert.equal(
    getCulturalEventMutationMode({ id: "server-read-id" }),
    "update",
  );
});

test("unknown fields and malformed boolean values are rejected", () => {
  for (const values of [
    { id: "client-id" },
    { slug: "client-slug" },
    { created_by: "client-audit-id" },
    { thumbnail_path: "client-media" },
    { recurrence_rule: "yearly" },
  ]) {
    const result = validateCulturalEventInput(validInput(values), context());
    assert.equal(result.success, false);
    if (!result.success) {
      assert.deepEqual(result.formErrors, [
        "Formulir memuat kolom yang tidak dikenali.",
      ]);
    }
  }
  assert.equal(
    validateCulturalEventInput(validInput({ all_day: "ya" }), context())
      .success,
    false,
  );
});

test("source mutations revalidate trusted English Cultural Event paths", () => {
  const actions = readFileSync("features/cultural-events/actions.ts", "utf8");
  const helperStart = actions.indexOf(
    "function revalidateEnglishCulturalEventDetailPath",
  );
  const createStart = actions.indexOf(
    "export async function createCulturalEvent",
  );
  const updateStart = actions.indexOf(
    "export async function updateCulturalEvent",
  );
  const helperEnd = actions.indexOf("function nextState", helperStart);
  const helperSource = actions.slice(helperStart, helperEnd);
  const createSource = actions.slice(createStart, updateStart);
  const updateSource = actions.slice(updateStart);

  for (const offset of [helperStart, createStart, updateStart, helperEnd]) {
    assert.notEqual(offset, -1);
  }

  assert.match(helperSource, /PUBLIC_ENGLISH_CULTURAL_EVENTS_PATH/);
  assert.match(
    helperSource,
    /getPublicEnglishCulturalEventPath\(trustedSlug\)/,
  );
  assert.match(createSource, /\.select\("id,slug"\)/);
  assert.match(
    createSource,
    /revalidateEnglishCulturalEventPaths\(\[createdEvent\.slug\]\)/,
  );
  assert.match(updateSource, /queryCulturalEventById\(\s*supabase/);
  assert.match(
    updateSource,
    /revalidateEnglishCulturalEventPaths\(\[existing\.slug\]\)/,
  );
  assert.match(
    updateSource,
    /revalidateEnglishCulturalEventDetailPath\(refreshedResult\.event\.slug\)/,
  );
  assert.doesNotMatch(actions, /formData\.get\(["']slug["']\)/);

  const updateMutation = updateSource.indexOf(".update(payload)");
  const knownPathRevalidation = updateSource.indexOf(
    "revalidateEnglishCulturalEventPaths([existing.slug])",
  );
  const refresh = updateSource.indexOf("const refreshedResult");
  assert.ok(updateMutation >= 0);
  assert.ok(knownPathRevalidation > updateMutation);
  assert.ok(refresh > knownPathRevalidation);
});

function sourceActionForm(overrides = {}) {
  const formData = new FormData();
  for (const [field, value] of Object.entries(
    validInput({
      status: "draft",
      ...overrides,
    }),
  )) {
    formData.set(field, String(value));
  }
  return formData;
}

function sourceActionPrevious() {
  return {
    kind: "idle",
    values: emptyCulturalEventFormValues(),
    fieldErrors: {},
    formErrors: [],
    message: null,
    revision: 0,
  };
}

function trustedEvent(overrides = {}) {
  return {
    id: "10000000-0000-4000-8000-000000000001",
    title: "Festival Budaya Karang Bajo",
    slug: "festival-budaya-karang-bajo",
    summary: null,
    description: "Informasi acara yang telah diverifikasi",
    event_type: null,
    start_at: "2030-08-17T01:30:00.000Z",
    end_at: null,
    all_day: false,
    date_note: null,
    location_name: null,
    address: null,
    latitude: null,
    longitude: null,
    google_maps_url: null,
    organizer: null,
    contact_phone: null,
    contact_consent_confirmed: false,
    visitor_information: null,
    thumbnail_path: null,
    thumbnail_bucket: null,
    status: "draft",
    is_featured: false,
    published_at: null,
    updated_at: "2030-08-16T00:00:00.000Z",
    ...overrides,
  };
}

function createCulturalEventActionRuntime({
  mutationResponse = {
    data: [
      {
        id: "10000000-0000-4000-8000-000000000001",
        slug: "festival-budaya-karang-bajo",
      },
    ],
    error: null,
  },
  existing = trustedEvent(),
  refreshed = trustedEvent(),
} = {}) {
  const runtime = {
    events: [],
    paths: [],
    reads: [],
    writes: [],
    authCalls: 0,
    authorizationError: null,
    mutationResponse,
    existing,
    refreshed,
    client: null,
  };

  function writeChain(operation, payload) {
    runtime.events.push(`mutation:${operation}`);
    runtime.writes.push({ operation, payload });
    const chain = {
      eq(field, value) {
        runtime.events.push(`update-filter:${field}:${value}`);
        return chain;
      },
      select(columns) {
        runtime.events.push(`mutation-select:${columns}`);
        return chain;
      },
      overrideTypes() {
        return Promise.resolve(runtime.mutationResponse);
      },
    };
    return chain;
  }

  runtime.client = {
    from(table) {
      assert.equal(table, "cultural_events");
      return {
        insert(payload) {
          return writeChain("insert", payload);
        },
        update(payload) {
          return writeChain("update", payload);
        },
      };
    },
  };

  return runtime;
}

async function loadCulturalEventActions(runtime) {
  const source = readFileSync("features/cultural-events/actions.ts", "utf8")
    .replace(/^"use server";\s*/m, "")
    .replace(/import\s+[\s\S]*?from\s+["'][^"']+["'];\s*/g, "");
  const stripped = stripTypeScriptTypes(source, { mode: "strip" });
  const key = `__culturalEventActionDeps_${Math.random()
    .toString(36)
    .slice(2)}`;
  globalThis[key] = {
    revalidatePath: (path) => {
      runtime.paths.push(path);
      runtime.events.push(`revalidate:${path}`);
    },
    getPublicEnglishCulturalEventPath: (slug) =>
      `/en/cultural-events/${encodeURIComponent(slug)}`,
    PUBLIC_ENGLISH_CULTURAL_EVENTS_PATH: "/en/cultural-events",
    redirect: (path) => {
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
    queryCulturalEventById: async (_supabase, id) => {
      assert.equal(id, runtime.existing.id);
      runtime.events.push(
        runtime.reads.length === 0
          ? "authoritative-read"
          : "post-mutation-refresh",
      );
      const result =
        runtime.reads.length === 0 ? runtime.existing : runtime.refreshed;
      runtime.reads.push(result);
      return { success: true, event: result };
    },
    isCulturalEventDuplicateConstraintError,
    isValidCulturalEventId,
    isValidCulturalEventSlug,
    normalizeCulturalEventSlug,
    validateCulturalEventFormData,
  };

  try {
    return await import(
      `data:text/javascript;charset=utf-8,${encodeURIComponent(
        `const deps = globalThis.${key};
const {
  revalidatePath,
  getPublicEnglishCulturalEventPath,
  PUBLIC_ENGLISH_CULTURAL_EVENTS_PATH,
  redirect,
  requireAdministrator,
  createClient,
  queryCulturalEventById,
  isCulturalEventDuplicateConstraintError,
  isValidCulturalEventId,
  isValidCulturalEventSlug,
  normalizeCulturalEventSlug,
  validateCulturalEventFormData,
} = deps;
${stripped}`,
      )}`
    );
  } finally {
    delete globalThis[key];
  }
}

async function invokeCulturalEventAction(runtime, actionName, id) {
  const actions = await loadCulturalEventActions(runtime);
  try {
    const result =
      actionName === "create"
        ? await actions.createCulturalEvent(
            sourceActionPrevious(),
            sourceActionForm(),
          )
        : await actions.updateCulturalEvent(
            id,
            sourceActionPrevious(),
            sourceActionForm(),
          );
    return { result, redirectPath: null };
  } catch (error) {
    if (error?.message === "REDIRECT") {
      return { result: null, redirectPath: error.path };
    }
    throw error;
  }
}

test("Cultural Event source action revalidation is behavioral and failure-safe", async () => {
  const createRuntime = createCulturalEventActionRuntime();
  const created = await invokeCulturalEventAction(createRuntime, "create");
  assert.ok(created.redirectPath);
  assert.ok(createRuntime.paths.includes("/en/cultural-events"));
  assert.ok(
    createRuntime.paths.includes(
      "/en/cultural-events/festival-budaya-karang-bajo",
    ),
  );
  assert.ok(
    createRuntime.events.indexOf("mutation:insert") <
      createRuntime.events.indexOf("revalidate:/en/cultural-events"),
  );

  const updateRuntime = createCulturalEventActionRuntime({
    refreshed: trustedEvent({ slug: "festival-budaya-baru" }),
  });
  const updated = await invokeCulturalEventAction(
    updateRuntime,
    "update",
    updateRuntime.existing.id,
  );
  assert.ok(updated.redirectPath);
  assert.ok(
    updateRuntime.paths.includes(
      "/en/cultural-events/festival-budaya-karang-bajo",
    ),
  );
  assert.ok(
    updateRuntime.paths.includes("/en/cultural-events/festival-budaya-baru"),
  );
  assert.ok(
    updateRuntime.events.indexOf("mutation:update") <
      updateRuntime.events.indexOf("revalidate:/en/cultural-events"),
  );
  assert.ok(
    updateRuntime.events.indexOf(
      "revalidate:/en/cultural-events/festival-budaya-baru",
    ) > updateRuntime.events.indexOf("post-mutation-refresh"),
  );

  const failedRuntime = createCulturalEventActionRuntime({
    mutationResponse: {
      data: [],
      error: { code: "mutation-failed" },
    },
  });
  const failed = await invokeCulturalEventAction(
    failedRuntime,
    "update",
    failedRuntime.existing.id,
  );
  assert.equal(failed.redirectPath, null);
  assert.equal(failedRuntime.paths.length, 0);
});
