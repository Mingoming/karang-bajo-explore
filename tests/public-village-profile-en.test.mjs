import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import {
  classifyPublishedEnglishVillageProfiles,
  getPublicEnglishVillageProfileTextSections,
  mapPublishedEnglishVillageProfile,
} from "../features/public-village-profile/english-model.ts";
import { PUBLIC_DICTIONARIES } from "../lib/i18n/dictionaries.ts";

const read = (path) => readFileSync(path, "utf8");

const loaderSource = read("features/public-village-profile/english-data.ts");
const pageSource = read("app/en/village-profile/page.tsx");

const row = {
  id: "10000000-0000-4000-8000-000000000001",
  name: "  Karang Bajo Village  ",
  summary: "  An approved English summary.  ",
  description: "  An approved English description.  ",
  history: "   ",
  vision: "  An approved vision.  ",
  mission: null,
  address: "  Karang Bajo, North Lombok  ",
  latitude: "-8.2",
  longitude: "116.4",
  google_maps_url: "   ",
  published_at: "2026-08-04T00:00:00.000Z",
};

test("English Village Profile mapping normalizes public-safe values", () => {
  const profile = mapPublishedEnglishVillageProfile(row);

  assert.equal(profile.name, "Karang Bajo Village");
  assert.equal(profile.summary, "An approved English summary.");
  assert.equal(profile.description, "An approved English description.");
  assert.equal(profile.history, null);
  assert.equal(profile.vision, "An approved vision.");
  assert.equal(profile.mission, null);
  assert.equal(profile.address, "Karang Bajo, North Lombok");
  assert.equal(profile.latitude, -8.2);
  assert.equal(profile.longitude, 116.4);
  assert.equal(profile.googleMapsUrl, null);
  assert.equal("slug" in profile, false);
});

test("English Village Profile mapper rejects malformed required values without throwing", () => {
  for (const [field, values] of [
    ["name", [null, undefined, "", "   "]],
    ["description", [null, undefined, "", "   "]],
  ]) {
    for (const value of values) {
      assert.doesNotThrow(
        () => {
          assert.equal(
            mapPublishedEnglishVillageProfile({ ...row, [field]: value }),
            null,
          );
        },
        `${field}=${String(value)} must fail closed`,
      );
    }
  }
});

test("English Village Profile mapper rejects malformed optional and publication fields", () => {
  for (const field of [
    "summary",
    "history",
    "vision",
    "mission",
    "address",
    "google_maps_url",
    "latitude",
    "longitude",
    "published_at",
  ]) {
    assert.doesNotThrow(() => {
      assert.equal(
        mapPublishedEnglishVillageProfile({ ...row, [field]: {} }),
        null,
      );
    }, `${field} wrong type must fail closed`);
  }
});

test("English Village Profile mapping rejects unsafe location values", () => {
  const invalidCoordinates = mapPublishedEnglishVillageProfile({
    ...row,
    latitude: "invalid",
  });

  assert.equal(invalidCoordinates.latitude, null);
  assert.equal(invalidCoordinates.longitude, null);

  const unsafeMapUrl = mapPublishedEnglishVillageProfile({
    ...row,
    google_maps_url: "javascript:alert(1)",
  });

  assert.equal(unsafeMapUrl.googleMapsUrl, null);

  const safeMapUrl = mapPublishedEnglishVillageProfile({
    ...row,
    google_maps_url: "https://maps.google.com/example",
  });

  assert.equal(safeMapUrl.googleMapsUrl, "https://maps.google.com/example");
});

test("English Village Profile classification is fail-closed", () => {
  assert.deepEqual(classifyPublishedEnglishVillageProfiles([]), {
    kind: "not-found",
  });

  const ready = classifyPublishedEnglishVillageProfiles([row]);
  assert.equal(ready.kind, "ready");

  assert.deepEqual(classifyPublishedEnglishVillageProfiles([row, row]), {
    kind: "error",
  });

  assert.deepEqual(
    classifyPublishedEnglishVillageProfiles([{ ...row, name: "   " }]),
    { kind: "error" },
  );

  assert.deepEqual(
    classifyPublishedEnglishVillageProfiles([{ ...row, description: "   " }]),
    { kind: "error" },
  );

  for (const field of ["name", "description"]) {
    assert.deepEqual(
      classifyPublishedEnglishVillageProfiles([{ ...row, [field]: null }]),
      { kind: "error" },
    );
  }
});

test("English optional text sections use localized static labels", () => {
  const profile = mapPublishedEnglishVillageProfile(row);
  const copy = PUBLIC_DICTIONARIES.en.villageProfile;

  assert.deepEqual(
    getPublicEnglishVillageProfileTextSections(profile, {
      history: copy.historyHeading,
      vision: copy.visionHeading,
      mission: copy.missionHeading,
    }),
    [{ title: "Vision", content: "An approved vision." }],
  );
});

test("English loader reads only the public-safe English view", () => {
  assert.match(loaderSource, /"published_english_village_profiles"/);
  assert.match(loaderSource, /\.limit\(2\)/);
  assert.match(loaderSource, /classifyPublishedEnglishVillageProfiles\(data\)/);

  for (const column of [
    "id",
    "name",
    "summary",
    "description",
    "history",
    "vision",
    "mission",
    "address",
    "latitude",
    "longitude",
    "google_maps_url",
    "published_at",
  ]) {
    assert.match(loaderSource, new RegExp(`"${column}"`));
  }

  for (const forbiddenTable of [
    "village_profiles",
    "village_profile_translations",
    "published_village_profiles",
  ]) {
    assert.doesNotMatch(
      loaderSource,
      new RegExp(`\\.from\\("${forbiddenTable}"\\)`),
    );
  }

  assert.doesNotMatch(loaderSource, /created_by|updated_by|status|locale/);
});

test("English Village Profile page uses no Indonesian descriptive fallback", () => {
  assert.equal(existsSync("app/en/village-profile/page.tsx"), true);
  assert.match(pageSource, /getPublishedEnglishVillageProfile/);
  assert.match(pageSource, /getPublishedEnglishVillageProfileMetadata/);
  assert.match(pageSource, /PUBLIC_DICTIONARIES\.en/);
  assert.match(pageSource, /<PublicShell[\s\S]*?locale="en"/);
  assert.match(pageSource, /getEnglishPublicShellData/);
  assert.match(pageSource, /result\.kind === "not-found"/);
  assert.match(pageSource, /result\.kind === "error"/);
  assert.match(pageSource, /PUBLIC_ENGLISH_VILLAGE_PROFILE_UNAVAILABLE/);
  assert.match(pageSource, /openGraphLocale: "en_US"/);
  assert.match(pageSource, /rel="noreferrer"/);

  assert.doesNotMatch(pageSource, /getPublishedVillageProfile/);
  assert.doesNotMatch(
    pageSource,
    /Mengenal desa|Sejarah|Visi|Misi|Lokasi|Buka lokasi di peta/,
  );
});
