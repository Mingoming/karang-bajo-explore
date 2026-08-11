import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getAllowedHomestayStatuses,
  getHomestayMutationMode,
  isHomestayDuplicateConstraintError,
  isValidHomestayId,
  isValidHomestaySlug,
  normalizeHomestaySlug,
  validateHomestayFormData,
  validateHomestayInput,
} from "../features/homestays/model.ts";

function validInput(overrides = {}) {
  return {
    name: "Homestay Karang Bajo",
    description: "Informasi homestay yang sudah diverifikasi",
    display_order: "2",
    status: "draft",
    ...overrides,
  };
}

function validationContext(overrides = {}) {
  return {
    mode: "create",
    hasThumbnail: false,
    ...overrides,
  };
}

test("homestay form values become a trimmed typed payload", () => {
  const formData = new FormData();
  for (const [field, value] of Object.entries(
    validInput({
      name: "  Homestay Karang Bajo  ",
      owner_name: "  Pengelola Uji  ",
      phone: "  08123456789  ",
      address: "  Karang Bajo  ",
      latitude: "-8.2731",
      longitude: "116.4251",
      price_per_night: "0",
      price_note: "  Termasuk sarapan  ",
      facilities: " Kamar mandi \n\n Sarapan ",
      google_maps_url: " https://maps.google.com/example ",
    }),
  )) {
    formData.set(field, String(value));
  }
  formData.set("contact_consent_confirmed", "on");
  formData.set("is_featured", "on");

  const result = validateHomestayFormData(formData, validationContext());

  assert.equal(result.success, true);
  if (!result.success) return;
  assert.equal(result.data.name, "Homestay Karang Bajo");
  assert.equal(result.data.owner_name, "Pengelola Uji");
  assert.equal(result.data.phone, "08123456789");
  assert.equal(result.data.latitude, -8.2731);
  assert.equal(result.data.longitude, 116.4251);
  assert.equal(result.data.price_per_night, 0);
  assert.deepEqual(result.data.facilities, ["Kamar mandi", "Sarapan"]);
  assert.equal(result.data.contact_consent_confirmed, true);
  assert.equal(result.data.is_featured, true);
});

test("required homestay text rejects missing and whitespace-only values", () => {
  const result = validateHomestayInput(
    validInput({ name: " ", description: "   " }),
    validationContext(),
  );

  assert.equal(result.success, false);
  if (result.success) return;
  assert.match(result.fieldErrors.name ?? "", /wajib diisi/);
  assert.match(result.fieldErrors.description ?? "", /wajib diisi/);
});

test("empty optional homestay values normalize to null", () => {
  const result = validateHomestayInput(
    validInput({
      owner_name: " ",
      phone: "",
      address: "",
      latitude: "",
      longitude: "",
      google_maps_url: "",
      price_per_night: "",
      price_note: "",
      facilities: "\n",
    }),
    validationContext(),
  );

  assert.equal(result.success, true);
  if (!result.success) return;
  assert.equal(result.data.owner_name, null);
  assert.equal(result.data.phone, null);
  assert.equal(result.data.address, null);
  assert.equal(result.data.latitude, null);
  assert.equal(result.data.longitude, null);
  assert.equal(result.data.price_per_night, null);
  assert.deepEqual(result.data.facilities, []);
});

test("coordinates allow an empty pair or a complete valid pair", () => {
  const emptyPair = validateHomestayInput(validInput(), validationContext());
  assert.equal(emptyPair.success, true);

  const completePair = validateHomestayInput(
    validInput({ latitude: "-8.2", longitude: "116.4" }),
    validationContext(),
  );
  assert.equal(completePair.success, true);
});

test("coordinates reject incomplete, malformed, infinite, and out-of-range values", () => {
  for (const overrides of [
    { latitude: "-8.2" },
    { longitude: "116.4" },
    { latitude: "bukan-angka", longitude: "116.4" },
    { latitude: "-8.2", longitude: "Infinity" },
    { latitude: "90.1", longitude: "116.4" },
    { latitude: "-8.2", longitude: "-180.1" },
  ]) {
    const result = validateHomestayInput(
      validInput(overrides),
      validationContext(),
    );
    assert.equal(result.success, false);
  }
});

test("nightly price accepts null, zero, and positive rupiah values", () => {
  for (const value of ["", "0", "150000", "150000.5"]) {
    const result = validateHomestayInput(
      validInput({ price_per_night: value }),
      validationContext(),
    );
    assert.equal(result.success, true);
  }
});

test("nightly price and display order reject malformed values", () => {
  for (const overrides of [
    { price_per_night: "-1" },
    { price_per_night: "0x10" },
    { price_per_night: "Infinity" },
    { display_order: "1.5" },
    { display_order: "-1" },
    { display_order: "2147483648" },
  ]) {
    const result = validateHomestayInput(
      validInput(overrides),
      validationContext(),
    );
    assert.equal(result.success, false);
  }
});

test("facilities normalize into an ordered text array", () => {
  const result = validateHomestayInput(
    validInput({ facilities: " Wi-Fi \n\n Air minum \n Parkir " }),
    validationContext(),
  );

  assert.equal(result.success, true);
  if (!result.success) return;
  assert.deepEqual(result.data.facilities, ["Wi-Fi", "Air minum", "Parkir"]);
});

test("contact publication requires recorded consent", () => {
  const missingConsent = validateHomestayInput(
    validInput({ status: "published", owner_name: "Pengelola Uji" }),
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

  const consented = validateHomestayInput(
    validInput({
      status: "published",
      phone: "08123456789",
      contact_consent_confirmed: true,
    }),
    validationContext({
      mode: "update",
      currentStatus: "draft",
      hasThumbnail: true,
    }),
  );
  assert.equal(consented.success, true);
});

test("lifecycle validation follows the applied migration transitions", () => {
  assert.deepEqual(getAllowedHomestayStatuses(null), ["draft"]);
  assert.deepEqual(getAllowedHomestayStatuses("draft"), [
    "draft",
    "published",
    "archived",
  ]);
  assert.deepEqual(getAllowedHomestayStatuses("published"), [
    "published",
    "archived",
  ]);
  assert.deepEqual(getAllowedHomestayStatuses("archived"), [
    "archived",
    "draft",
  ]);

  const invalidRestore = validateHomestayInput(
    validInput({ status: "published" }),
    validationContext({
      mode: "update",
      currentStatus: "archived",
      hasThumbnail: true,
    }),
  );
  assert.equal(invalidRestore.success, false);
});

test("publication requires a thumbnail and rejects placeholder content", () => {
  const missingThumbnail = validateHomestayInput(
    validInput({ status: "published" }),
    validationContext({ mode: "update", currentStatus: "draft" }),
  );
  assert.equal(missingThumbnail.success, false);
  if (!missingThumbnail.success) {
    assert.match(missingThumbnail.formErrors.join(" "), /gambar utama/);
  }

  const placeholder = validateHomestayInput(
    validInput({ status: "published", description: "Isi nanti" }),
    validationContext({
      mode: "update",
      currentStatus: "draft",
      hasThumbnail: true,
    }),
  );
  assert.equal(placeholder.success, false);
});

test("slug normalization is deterministic and malformed slugs are rejected", () => {
  assert.equal(
    normalizeHomestaySlug("  Homestay Dédari & Keluarga  "),
    "homestay-dedari-keluarga",
  );
  assert.equal(isValidHomestaySlug("homestay-dedari-keluarga"), true);
  assert.equal(isValidHomestaySlug(""), false);
  assert.equal(isValidHomestaySlug("Homestay Tidak Valid"), false);
  assert.equal(isValidHomestaySlug("-homestay-"), false);
});

test("duplicate handling recognizes only homestay name and slug constraints", () => {
  assert.equal(
    isHomestayDuplicateConstraintError(
      "23505",
      'duplicate key violates unique constraint "homestays_slug_key"',
    ),
    true,
  );
  assert.equal(
    isHomestayDuplicateConstraintError(
      "23505",
      'duplicate key violates unique constraint "homestays_active_name_idx"',
    ),
    true,
  );
  assert.equal(
    isHomestayDuplicateConstraintError(
      "23505",
      'duplicate key violates unique constraint "homestays_pkey"',
    ),
    false,
  );
});

test("route IDs and create-versus-update mode use trusted server values", () => {
  assert.equal(isValidHomestayId("10000000-0000-4000-8000-000000000001"), true);
  assert.equal(isValidHomestayId("not-a-uuid"), false);
  assert.equal(isValidHomestayId("../rahasia"), false);
  assert.equal(getHomestayMutationMode(null), "create");
  assert.equal(
    getHomestayMutationMode({ id: "server-read-homestay-id" }),
    "update",
  );
});

test("unknown, capacity, audit, and malformed fields are rejected", () => {
  for (const overrides of [
    { capacity: "4" },
    { id: "client-supplied-id" },
    { created_by: "client-supplied-audit-id" },
    { slug: "client-supplied-slug" },
  ]) {
    const result = validateHomestayInput(
      validInput(overrides),
      validationContext(),
    );
    assert.equal(result.success, false);
    if (!result.success) {
      assert.deepEqual(result.formErrors, [
        "Formulir memuat kolom yang tidak dikenali.",
      ]);
    }
  }

  const malformed = validateHomestayInput(
    validInput({ name: ["Satu", "Dua"] }),
    validationContext(),
  );
  assert.equal(malformed.success, false);

  const malformedBoolean = validateHomestayInput(
    validInput({ is_featured: "ya" }),
    validationContext(),
  );
  assert.equal(malformedBoolean.success, false);
});

test("source mutations invalidate trusted English Homestay collection and detail paths", () => {
  const actions = readFileSync("features/homestays/actions.ts", "utf8");
  const createStart = actions.indexOf("export async function createHomestay");
  const updateStart = actions.indexOf("export async function updateHomestay");
  assert.ok(createStart >= 0);
  assert.ok(updateStart > createStart);
  const createSource = actions.slice(createStart, updateStart);
  const updateSource = actions.slice(updateStart);

  assert.match(actions, /getPublicEnglishHomestayPath/);
  assert.match(actions, /PUBLIC_ENGLISH_HOMESTAYS_PATH/);
  assert.match(createSource, /\.select\("id,slug"\)/);
  assert.match(
    createSource,
    /revalidateEnglishHomestayPaths\(\[createdHomestay\.slug\]\)/,
  );
  assert.match(
    updateSource,
    /revalidateEnglishHomestayPaths\(\[\s*existingHomestay\.slug,[\s\S]*?data\[0\]\.slug/,
  );
  assert.doesNotMatch(actions, /formData\.get\(["']slug["']\)/);

  const createMutation = createSource.indexOf('from("homestays")');
  const createRevalidation = createSource.indexOf(
    "revalidateEnglishHomestayPaths",
  );
  const updateMutation = updateSource.indexOf('from("homestays")');
  const updateRevalidation = updateSource.indexOf(
    "revalidateEnglishHomestayPaths",
  );
  assert.ok(createMutation >= 0 && createRevalidation > createMutation);
  assert.ok(updateMutation >= 0 && updateRevalidation > updateMutation);
});
