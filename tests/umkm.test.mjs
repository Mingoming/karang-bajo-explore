import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getAllowedUmkmStatuses,
  getUmkmMutationMode,
  isUmkmDuplicateConstraintError,
  isValidUmkmId,
  isValidUmkmSlug,
  normalizeUmkmSlug,
  validateUmkmFormData,
  validateUmkmInput,
} from "../features/umkm/model.ts";

function validInput(overrides = {}) {
  return {
    business_name: "Tenun Karang Bajo",
    category: "Kerajinan",
    description: "Informasi usaha yang sudah diverifikasi",
    display_order: "2",
    status: "draft",
    ...overrides,
  };
}

function context(overrides = {}) {
  return { mode: "create", hasThumbnail: false, ...overrides };
}

test("UMKM form values become a trimmed typed payload", () => {
  const formData = new FormData();
  for (const [field, value] of Object.entries(
    validInput({
      business_name: "  Tenun Karang Bajo  ",
      owner_name: "  Pemilik Uji  ",
      category: "  Kerajinan  ",
      address: "  Karang Bajo  ",
      latitude: "-8.2731",
      longitude: "116.4251",
      google_maps_url: " https://maps.google.com/example ",
      contact_name: "  Kontak Uji  ",
      contact_phone: "  08123456789  ",
      contact_whatsapp: "  08129876543  ",
    }),
  ))
    formData.set(field, String(value));
  formData.set("contact_consent_confirmed", "on");
  formData.set("is_featured", "on");

  const result = validateUmkmFormData(formData, context());
  assert.equal(result.success, true);
  if (!result.success) return;
  assert.equal(result.data.business_name, "Tenun Karang Bajo");
  assert.equal(result.data.category, "Kerajinan");
  assert.equal(result.data.owner_name, "Pemilik Uji");
  assert.equal(result.data.latitude, -8.2731);
  assert.equal(result.data.contact_whatsapp, "08129876543");
  assert.equal(result.data.contact_consent_confirmed, true);
});

test("required UMKM fields reject missing and whitespace-only values", () => {
  const result = validateUmkmInput(
    validInput({ business_name: " ", category: "", description: "   " }),
    context(),
  );
  assert.equal(result.success, false);
  if (result.success) return;
  assert.match(result.fieldErrors.business_name ?? "", /wajib diisi/);
  assert.match(result.fieldErrors.category ?? "", /wajib diisi/);
  assert.match(result.fieldErrors.description ?? "", /wajib diisi/);
});

test("empty optional UMKM values normalize to null", () => {
  const result = validateUmkmInput(
    validInput({
      owner_name: " ",
      address: "",
      latitude: "",
      longitude: "",
      google_maps_url: "",
      contact_name: "",
      contact_phone: "",
      contact_whatsapp: "",
    }),
    context(),
  );
  assert.equal(result.success, true);
  if (!result.success) return;
  assert.equal(result.data.owner_name, null);
  assert.equal(result.data.address, null);
  assert.equal(result.data.latitude, null);
  assert.equal(result.data.longitude, null);
  assert.equal(result.data.contact_phone, null);
});

test("coordinates allow an empty pair or a complete valid pair", () => {
  assert.equal(validateUmkmInput(validInput(), context()).success, true);
  assert.equal(
    validateUmkmInput(
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
  ])
    assert.equal(
      validateUmkmInput(validInput(values), context()).success,
      false,
    );
});

test("URL and display-order validation follows database-compatible rules", () => {
  for (const values of [
    { google_maps_url: "bukan-url" },
    { google_maps_url: "ftp://example.com" },
    { display_order: "1.5" },
    { display_order: "-1" },
    { display_order: "2147483648" },
  ])
    assert.equal(
      validateUmkmInput(validInput(values), context()).success,
      false,
    );
});

test("contact publication requires recorded consent", () => {
  const invalid = validateUmkmInput(
    validInput({ status: "published", contact_phone: "0812" }),
    context({ mode: "update", currentStatus: "draft", hasThumbnail: true }),
  );
  assert.equal(invalid.success, false);
  if (!invalid.success)
    assert.match(
      invalid.fieldErrors.contact_consent_confirmed ?? "",
      /persetujuan/i,
    );

  const valid = validateUmkmInput(
    validInput({
      status: "published",
      contact_phone: "0812",
      contact_consent_confirmed: true,
    }),
    context({ mode: "update", currentStatus: "draft", hasThumbnail: true }),
  );
  assert.equal(valid.success, true);
});

test("publication requires thumbnail metadata", () => {
  const result = validateUmkmInput(
    validInput({ status: "published", latitude: "-8.2", longitude: "116.4" }),
    context({ mode: "update", currentStatus: "draft" }),
  );
  assert.equal(result.success, false);
  if (!result.success)
    assert.match(result.formErrors.join(" "), /gambar utama/);
});

test("publication requires usable coordinates, phone, or WhatsApp", () => {
  const result = validateUmkmInput(
    validInput({ status: "published" }),
    context({ mode: "update", currentStatus: "draft", hasThumbnail: true }),
  );
  assert.equal(result.success, false);
  if (!result.success)
    assert.match(result.formErrors.join(" "), /koordinat|telepon|WhatsApp/);
});

test("publication rejects placeholder content", () => {
  const result = validateUmkmInput(
    validInput({
      status: "published",
      description: "Isi nanti",
      latitude: "-8.2",
      longitude: "116.4",
    }),
    context({ mode: "update", currentStatus: "draft", hasThumbnail: true }),
  );
  assert.equal(result.success, false);
});

test("lifecycle options match the applied migration", () => {
  assert.deepEqual(getAllowedUmkmStatuses(null), ["draft"]);
  assert.deepEqual(getAllowedUmkmStatuses("draft"), [
    "draft",
    "published",
    "archived",
  ]);
  assert.deepEqual(getAllowedUmkmStatuses("published"), [
    "published",
    "archived",
  ]);
  assert.deepEqual(getAllowedUmkmStatuses("archived"), ["archived", "draft"]);
  assert.equal(
    validateUmkmInput(
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

test("slug normalization is deterministic and malformed slugs are rejected", () => {
  assert.equal(
    normalizeUmkmSlug("  Tenun Déda & Keluarga  "),
    "tenun-deda-keluarga",
  );
  assert.equal(isValidUmkmSlug("tenun-deda-keluarga"), true);
  assert.equal(isValidUmkmSlug(""), false);
  assert.equal(isValidUmkmSlug("UMKM Tidak Valid"), false);
});

test("duplicate handling recognizes only UMKM name and slug constraints", () => {
  assert.equal(
    isUmkmDuplicateConstraintError(
      "23505",
      'unique constraint "umkms_slug_key"',
    ),
    true,
  );
  assert.equal(
    isUmkmDuplicateConstraintError(
      "23505",
      'unique constraint "umkms_active_name_idx"',
    ),
    true,
  );
  assert.equal(
    isUmkmDuplicateConstraintError("23505", 'unique constraint "umkms_pkey"'),
    false,
  );
  assert.equal(
    isUmkmDuplicateConstraintError(
      "23514",
      'unique constraint "umkms_slug_key"',
    ),
    false,
  );
});

test("route IDs and create-versus-update mode use trusted server values", () => {
  assert.equal(isValidUmkmId("10000000-0000-4000-8000-000000000001"), true);
  assert.equal(isValidUmkmId("not-a-uuid"), false);
  assert.equal(isValidUmkmId("../rahasia"), false);
  assert.equal(getUmkmMutationMode(null), "create");
  assert.equal(getUmkmMutationMode({ id: "server-read-id" }), "update");
});

test("unknown, commerce, price, audit, slug, and malformed fields are rejected", () => {
  for (const values of [
    { product_inventory: "10" },
    { price: "10000" },
    { id: "client-id" },
    { created_by: "client-audit-id" },
    { slug: "client-slug" },
  ]) {
    const result = validateUmkmInput(validInput(values), context());
    assert.equal(result.success, false);
    if (!result.success)
      assert.deepEqual(result.formErrors, [
        "Formulir memuat kolom yang tidak dikenali.",
      ]);
  }
  assert.equal(
    validateUmkmInput(validInput({ business_name: ["Satu", "Dua"] }), context())
      .success,
    false,
  );
  assert.equal(
    validateUmkmInput(validInput({ is_featured: "ya" }), context()).success,
    false,
  );
});

test("UMKM source mutations invalidate trusted English collection and detail paths", () => {
  const actions = readFileSync("features/umkm/actions.ts", "utf8");
  assert.match(actions, /revalidatePublicDomainPaths\("umkm", \[\]\)/);
  assert.match(
    actions,
    /revalidatePublicDomainDetailPaths\("umkm", \[trustedSlug\]\)/,
  );
  assert.match(actions, /revalidateEnglishUmkmCollection\(\)/);
  assert.match(actions, /revalidateEnglishUmkmDetail\(existing\.slug\)/);
  assert.match(
    actions,
    /const refreshedResult = await queryUmkmById\(supabase, existing\.id\)/,
  );
  assert.match(actions, /refreshedResult\.umkm\.slug !== existing\.slug/);
  assert.match(
    actions,
    /const createdResult = await queryUmkmById\(supabase, id\)/,
  );
  assert.doesNotMatch(actions, /formData\.get\(["']slug["']\)/);
});
