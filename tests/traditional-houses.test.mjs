import assert from "node:assert/strict";
import test from "node:test";

import {
  getAllowedTraditionalHouseStatuses,
  getTraditionalHouseMutationMode,
  isTraditionalHouseDuplicateConstraintError,
  isValidTraditionalHouseId,
  isValidTraditionalHouseSlug,
  normalizeTraditionalHouseSlug,
  validateTraditionalHouseFormData,
  validateTraditionalHouseInput,
} from "../features/traditional-houses/model.ts";

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
