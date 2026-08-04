import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  createEnglishVillageProfileTranslationActionState,
  getEnglishVillageProfileTranslationFreshness,
  getEnglishVillageProfileTranslationStatusLabel,
  isEnglishVillageProfileTranslationEditable,
  toEnglishVillageProfileTranslationSource,
  validateEnglishVillageProfileTranslationForPublish,
  validateEnglishVillageProfileTranslationInput,
} from "../features/village-profile-translation/model.ts";

function source(overrides = {}) {
  return {
    id: "source-id",
    name: "Desa Karang Bajo",
    summary: "Ringkasan Indonesia",
    description: "Deskripsi Indonesia",
    history: "Sejarah Indonesia",
    vision: "Visi Indonesia",
    mission: "Misi Indonesia",
    address: "Alamat Indonesia",
    status: "published",
    updated_at: "2026-08-04T10:00:00.000Z",
    ...overrides,
  };
}

function translation(overrides = {}) {
  return {
    id: "translation-id",
    village_profile_id: "source-id",
    locale: "en",
    name: "Karang Bajo Village",
    summary: "English summary",
    description: "English description",
    history: "English history",
    vision: "English vision",
    mission: "English mission",
    address: "English address",
    status: "draft",
    source_updated_at_at_publish: null,
    published_at: null,
    updated_at: "2026-08-04T09:00:00.000Z",

    ...overrides,
  };
}

test("English draft input trims text and normalizes blanks to null", () => {
  const result = validateEnglishVillageProfileTranslationInput({
    name: "  Karang Bajo Village  ",
    summary: " ",
    description: " English description ",
    history: "",
    vision: " English vision ",
    mission: "",
    address: " English address ",
  });

  assert.equal(result.success, true);
  if (!result.success) return;

  assert.deepEqual(result.data, {
    name: "Karang Bajo Village",
    summary: null,
    description: "English description",
    history: null,
    vision: "English vision",
    mission: null,
    address: "English address",
  });
});

test("English draft validation rejects unknown and duplicate fields", () => {
  const unknown = validateEnglishVillageProfileTranslationInput({
    name: "Karang Bajo Village",
    created_by: "forbidden",
  });

  assert.equal(unknown.success, false);
  if (!unknown.success) {
    assert.deepEqual(unknown.formErrors, [
      "Formulir memuat kolom yang tidak dikenali.",
    ]);
  }

  const malformed = validateEnglishVillageProfileTranslationInput({
    name: ["one", "two"],
  });

  assert.equal(malformed.success, false);
  if (!malformed.success) {
    assert.match(malformed.fieldErrors.name ?? "", /tidak valid/);
  }
});

test("publication requires core and source-populated English fields", () => {
  const result = validateEnglishVillageProfileTranslationForPublish(source(), {
    name: null,
    summary: null,
    description: null,
    history: null,
    vision: null,
    mission: null,
    address: null,
  });

  assert.equal(result.success, false);

  if (!result.success) {
    assert.match(result.fieldErrors.name ?? "", /wajib diisi/);
    assert.match(result.fieldErrors.description ?? "", /wajib diisi/);
    assert.match(result.fieldErrors.summary ?? "", /sumber Indonesia/);
    assert.match(result.fieldErrors.history ?? "", /sumber Indonesia/);
    assert.match(result.fieldErrors.vision ?? "", /sumber Indonesia/);
    assert.match(result.fieldErrors.mission ?? "", /sumber Indonesia/);
    assert.match(result.fieldErrors.address ?? "", /sumber Indonesia/);
  }
});

test("source-empty optional sections remain optional for publication", () => {
  const result = validateEnglishVillageProfileTranslationForPublish(
    source({
      summary: null,
      history: " ",
      vision: null,
      mission: null,
      address: null,
    }),
    {
      name: "Karang Bajo Village",
      summary: null,
      description: "English description",
      history: null,
      vision: null,
      mission: null,
      address: null,
    },
  );

  assert.deepEqual(result, { success: true });
});

test("an unpublished Indonesian source blocks English publication", () => {
  const result = validateEnglishVillageProfileTranslationForPublish(
    source({ status: "draft" }),
    {
      name: "Karang Bajo Village",
      summary: "English summary",
      description: "English description",
      history: "English history",
      vision: "English vision",
      mission: "English mission",
      address: "English address",
    },
  );

  assert.equal(result.success, false);

  if (!result.success) {
    assert.match(result.formErrors[0] ?? "", /harus diterbitkan/);
  }
});

test("published translation freshness follows the source review snapshot", () => {
  const currentTranslation = translation({
    status: "published",
    source_updated_at_at_publish: "2026-08-04T10:00:00.000Z",
    published_at: "2026-08-04T10:05:00.000Z",
  });

  assert.equal(
    getEnglishVillageProfileTranslationFreshness(source(), currentTranslation),
    "current",
  );

  assert.equal(
    getEnglishVillageProfileTranslationFreshness(
      source({ updated_at: "2026-08-04T11:00:00.000Z" }),
      currentTranslation,
    ),
    "stale",
  );

  assert.equal(
    getEnglishVillageProfileTranslationFreshness(source(), translation()),
    "not-applicable",
  );
});

test("translation lifecycle presentation distinguishes all admin states", () => {
  assert.equal(isEnglishVillageProfileTranslationEditable(null), true);
  assert.equal(isEnglishVillageProfileTranslationEditable("draft"), true);
  assert.equal(isEnglishVillageProfileTranslationEditable("published"), false);
  assert.equal(isEnglishVillageProfileTranslationEditable("archived"), false);

  assert.equal(
    getEnglishVillageProfileTranslationStatusLabel(null, "not-applicable"),
    "Belum ada terjemahan",
  );
  assert.equal(
    getEnglishVillageProfileTranslationStatusLabel("published", "current"),
    "Diterbitkan - terkini",
  );
  assert.equal(
    getEnglishVillageProfileTranslationStatusLabel("published", "stale"),
    "Diterbitkan - perlu ditinjau ulang",
  );

  const state = createEnglishVillageProfileTranslationActionState(
    source(),
    translation(),
  );

  assert.equal(state.status, "draft");
  assert.equal(state.sourceStatus, "published");
});

test("client source projection excludes server-only profile metadata", () => {
  const projected = toEnglishVillageProfileTranslationSource({
    ...source(),
    slug: "karang-bajo",
    latitude: -8.3,
    longitude: 116.2,
    google_maps_url: "https://maps.google.com/example",
    published_at: "2026-08-04T09:00:00.000Z",
    created_at: "2026-08-04T08:00:00.000Z",
    created_by: "administrator-created-id",
    updated_by: "administrator-updated-id",
  });

  assert.deepEqual(projected, source());
  assert.equal("slug" in projected, false);
  assert.equal("latitude" in projected, false);
  assert.equal("longitude" in projected, false);
  assert.equal("google_maps_url" in projected, false);
  assert.equal("created_by" in projected, false);
  assert.equal("updated_by" in projected, false);
});
test("admin loader reads the English base row under administrator access", () => {
  const dataSource = readFileSync(
    "features/village-profile-translation/data.ts",
    "utf8",
  );

  assert.match(dataSource, /requireAdministrator\(\)/);
  assert.match(dataSource, /\.from\("village_profile_translations"\)/);
  assert.match(dataSource, /\.eq\("village_profile_id", source\.id\)/);
  assert.match(dataSource, /\.eq\("locale", "en"\)/);
  assert.match(dataSource, /\.limit\(2\)/);
  assert.doesNotMatch(dataSource, /"created_at"|"created_by"|"updated_by"/);
  assert.doesNotMatch(
    dataSource,
    /\.from\("published_english_village_profiles"\)/,
  );
});

test("translation mutations use trusted RPCs without direct table writes", () => {
  const actionSource = readFileSync(
    "features/village-profile-translation/actions.ts",
    "utf8",
  );

  for (const rpc of [
    "village_profile_translation_save_draft",
    "village_profile_translation_publish",
    "village_profile_translation_archive",
    "village_profile_translation_restore",
  ]) {
    assert.match(actionSource, new RegExp(`\\.rpc\\("${rpc}"`));
  }

  assert.doesNotMatch(actionSource, /\.from\("village_profile_translations"\)/);
  assert.doesNotMatch(actionSource, /service[_-]?role|SUPABASE_SERVICE_ROLE/i);
});

test("publish flow authorizes and publishes the exact saved draft row", () => {
  const actionSource = readFileSync(
    "features/village-profile-translation/actions.ts",
    "utf8",
  );

  assert.match(actionSource, /await requireAdministrator\(\)/);

  assert.equal((actionSource.match(/\.single\(\)/g) ?? []).length, 4);

  assert.equal(
    (
      actionSource.match(
        /\.overrideTypes<TranslationRpcRow, \{ merge: false \}>\(\)/g,
      ) ?? []
    ).length,
    4,
  );

  assert.doesNotMatch(actionSource, /overrideTypes<TranslationRpcRow\[\]/);

  assert.match(actionSource, /data: savedRow/);
  assert.match(
    actionSource,
    /savedRow === null \? "unexpected-row-count" : null/,
  );
  assert.match(actionSource, /const translationId = savedRow\.id;/);
  assert.match(actionSource, /p_translation_id: translationId/);

  const saveDraftPosition = actionSource.indexOf(
    '.rpc("village_profile_translation_save_draft"',
  );
  const publishPosition = actionSource.indexOf(
    '.rpc("village_profile_translation_publish"',
  );

  assert.notEqual(saveDraftPosition, -1);
  assert.notEqual(publishPosition, -1);
  assert.ok(
    saveDraftPosition < publishPosition,
    "draft harus disimpan sebelum RPC publish dijalankan",
  );
});

test("translation actions revalidate only the affected admin and English routes", () => {
  const actionSource = readFileSync(
    "features/village-profile-translation/actions.ts",
    "utf8",
  );

  assert.match(actionSource, /revalidatePath\(VILLAGE_PROFILE_ADMIN_PATH\)/);
  assert.match(
    actionSource,
    /revalidatePath\(ENGLISH_VILLAGE_PROFILE_PUBLIC_PATH\)/,
  );
  assert.doesNotMatch(actionSource, /revalidatePath\("\/"\)/);
  assert.doesNotMatch(actionSource, /revalidatePath\("\/profil-desa"\)/);
});

test("the existing admin route keeps Indonesian editing available", () => {
  const pageSource = readFileSync("app/admin/profil-desa/page.tsx", "utf8");

  assert.match(pageSource, /<VillageProfileForm/);
  assert.match(pageSource, /<EnglishVillageProfileTranslationForm/);
  assert.match(
    pageSource,
    /toEnglishVillageProfileTranslationSource\(result\.source\)/,
  );
  assert.match(
    pageSource,
    /key=\{sourceReference\?\.updated_at \?\? "no-source"\}/,
  );
  assert.match(pageSource, /sourceReference=\{sourceReference\}/);
  assert.doesNotMatch(pageSource, /sourceReference=\{result\.source\}/);
  assert.match(
    pageSource,
    /Formulir profil\s+Indonesia\s+tetap dapat digunakan/,
  );
});
test("translation source files do not contain mojibake markers", () => {
  const mojibakePattern = /\u0393\u00c7|\u00c3|\u00c2/;

  for (const path of [
    "features/village-profile-translation/model.ts",
    "features/village-profile-translation/village-profile-translation-form.tsx",
  ]) {
    assert.doesNotMatch(readFileSync(path, "utf8"), mojibakePattern);
  }
});
