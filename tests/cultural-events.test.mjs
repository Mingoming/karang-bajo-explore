import assert from "node:assert/strict";
import test from "node:test";

import {
  getAllowedCulturalEventStatuses,
  getCulturalEventMutationMode,
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
