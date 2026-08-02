import assert from "node:assert/strict";
import test from "node:test";

import {
  createVillageProfileSlug,
  getAllowedVillageProfileStatuses,
  getVillageProfileMutationMode,
  validateVillageProfileFormData,
  validateVillageProfileInput,
} from "../features/village-profile/model.ts";

function validFormData() {
  const formData = new FormData();
  formData.set("name", "  Desa Karang Bajo  ");
  formData.set("summary", "  Ringkasan resmi  ");
  formData.set("description", "");
  formData.set("history", "  Sejarah terverifikasi  ");
  formData.set("vision", "");
  formData.set("mission", "");
  formData.set("address", "  Kecamatan Bayan  ");
  formData.set("latitude", "-8.2731");
  formData.set("longitude", "116.4251");
  formData.set("google_maps_url", " https://maps.google.com/example ");
  formData.set("status", "draft");
  return formData;
}

test("form values are transformed into a trimmed mutation payload", () => {
  const result = validateVillageProfileFormData(validFormData());

  assert.equal(result.success, true);
  if (!result.success) return;

  assert.deepEqual(result.data, {
    name: "Desa Karang Bajo",
    summary: "Ringkasan resmi",
    description: null,
    history: "Sejarah terverifikasi",
    vision: null,
    mission: null,
    address: "Kecamatan Bayan",
    latitude: -8.2731,
    longitude: 116.4251,
    google_maps_url: "https://maps.google.com/example",
    status: "draft",
  });
});

test("required names reject whitespace-only input", () => {
  const result = validateVillageProfileInput({ name: "   " });

  assert.equal(result.success, false);
  if (result.success) return;
  assert.equal(result.fieldErrors.name, "Nama desa wajib diisi.");
  assert.equal(result.values.name, "   ");
});

test("empty optional values are normalized to null", () => {
  const result = validateVillageProfileInput({ name: "Karang Bajo" });

  assert.equal(result.success, true);
  if (!result.success) return;
  assert.equal(result.data.summary, null);
  assert.equal(result.data.latitude, null);
  assert.equal(result.data.longitude, null);
  assert.equal(result.data.google_maps_url, null);
});

test("coordinates must be a complete valid pair", () => {
  const incomplete = validateVillageProfileInput({
    name: "Karang Bajo",
    latitude: "-8.2",
  });
  assert.equal(incomplete.success, false);
  if (!incomplete.success) {
    assert.match(incomplete.fieldErrors.longitude ?? "", /wajib diisi/);
  }

  for (const [field, value] of [
    ["latitude", "90.1"],
    ["longitude", "-180.1"],
  ]) {
    const result = validateVillageProfileInput({
      name: "Karang Bajo",
      latitude: "-8.2",
      longitude: "116.4",
      [field]: value,
    });
    assert.equal(result.success, false);
  }
});

test("an already-published profile retains its description requirement", () => {
  const result = validateVillageProfileInput(
    { name: "Karang Bajo", description: "   ", status: "published" },
    { currentStatus: "published" },
  );

  assert.equal(result.success, false);
  if (!result.success) {
    assert.match(result.fieldErrors.description ?? "", /wajib diisi/);
    assert.equal(result.values.description, "   ");
  }
});

test("singleton save mode is based on the server-read profile", () => {
  assert.equal(getVillageProfileMutationMode(null), "create");
  assert.equal(
    getVillageProfileMutationMode({ id: "server-owned-profile-id" }),
    "update",
  );
});

test("unknown fields and malformed values are rejected", () => {
  const unknown = validateVillageProfileInput({
    name: "Karang Bajo",
    created_by: "tidak-boleh-dikirim",
  });
  assert.equal(unknown.success, false);
  if (!unknown.success) {
    assert.deepEqual(unknown.formErrors, [
      "Formulir memuat kolom yang tidak dikenali.",
    ]);
  }

  const malformed = validateVillageProfileInput({
    name: ["Karang Bajo", "Profil kedua"],
  });
  assert.equal(malformed.success, false);
  if (!malformed.success) {
    assert.match(malformed.fieldErrors.name ?? "", /tidak valid/);
  }

  assert.equal(
    createVillageProfileSlug("  Désa Karang Bajo  "),
    "desa-karang-bajo",
  );
});

test("village-profile lifecycle options match the database transition rules", () => {
  assert.deepEqual(getAllowedVillageProfileStatuses(null), ["draft"]);
  assert.deepEqual(getAllowedVillageProfileStatuses("draft"), [
    "draft",
    "published",
    "archived",
  ]);
  assert.deepEqual(getAllowedVillageProfileStatuses("published"), [
    "published",
    "archived",
  ]);
  assert.deepEqual(getAllowedVillageProfileStatuses("archived"), [
    "archived",
    "draft",
  ]);

  const directRepublish = validateVillageProfileInput(
    {
      name: "Karang Bajo",
      description: "Deskripsi terverifikasi",
      status: "published",
    },
    { currentStatus: "archived" },
  );
  assert.equal(directRepublish.success, false);
  if (!directRepublish.success) {
    assert.match(directRepublish.fieldErrors.status ?? "", /tidak diizinkan/);
  }

  const directUnpublish = validateVillageProfileInput(
    {
      name: "Karang Bajo",
      description: "Deskripsi terverifikasi",
      status: "draft",
    },
    { currentStatus: "published" },
  );
  assert.equal(directUnpublish.success, false);
  if (!directUnpublish.success) {
    assert.match(directUnpublish.fieldErrors.status ?? "", /tidak diizinkan/);
  }

  for (const [currentStatus, status] of [
    ["draft", "published"],
    ["draft", "archived"],
    ["published", "archived"],
    ["archived", "draft"],
  ]) {
    const allowedTransition = validateVillageProfileInput(
      {
        name: "Karang Bajo",
        description: "Deskripsi terverifikasi",
        status,
      },
      { currentStatus },
    );
    assert.equal(
      allowedTransition.success,
      true,
      `${currentStatus} -> ${status} seharusnya diizinkan`,
    );
  }
});
