import assert from "node:assert/strict";
import test from "node:test";

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
