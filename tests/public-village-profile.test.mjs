import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import {
  classifyPublishedVillageProfiles,
  getPublicVillageProfileExcerpt,
  getPublicVillageProfileTextSections,
  mapPublishedVillageProfile,
} from "../features/public-village-profile/model.ts";

const read = (path) => readFileSync(path, "utf8");
const dataSource = read("features/public-village-profile/data.ts");
const pageSource = read("app/(public)/profil-desa/page.tsx");
const homepageSource = read("app/(public)/page.tsx");
const actionSource = read("features/village-profile/actions.ts");

const row = {
  id: "10000000-0000-4000-8000-000000000001",
  name: "  Desa Karang Bajo  ",
  slug: "desa-karang-bajo",
  summary: "  Ringkasan resmi  ",
  description: "  Deskripsi resmi  ",
  history: "   ",
  vision: null,
  mission: "  Misi resmi  ",
  address: "   ",
  latitude: "-8.2",
  longitude: "116.4",
  google_maps_url: "   ",
  published_at: "2026-08-02T00:00:00.000Z",
};

test("public Village Profile route and published-only loader exist", () => {
  assert.equal(existsSync("app/(public)/profil-desa/page.tsx"), true);
  assert.match(dataSource, /PUBLISHED_VILLAGE_PROFILES_VIEW/);
  assert.match(dataSource, /"published_village_profiles"/);
  assert.doesNotMatch(dataSource, /\.from\("village_profiles"\)/);
  assert.match(dataSource, /\.limit\(2\)/);
  assert.match(dataSource, /classifyPublishedVillageProfiles\(data\)/);
});

test("published profile mapping trims text and normalizes coordinate pairs", () => {
  const profile = mapPublishedVillageProfile(row);
  assert.equal(profile.name, "Desa Karang Bajo");
  assert.equal(profile.summary, "Ringkasan resmi");
  assert.equal(profile.history, null);
  assert.equal(profile.vision, null);
  assert.equal(profile.mission, "Misi resmi");
  assert.equal(profile.address, null);
  assert.equal(profile.latitude, -8.2);
  assert.equal(profile.longitude, 116.4);
  assert.equal(profile.googleMapsUrl, null);

  const invalidPair = mapPublishedVillageProfile({
    ...row,
    latitude: "not-a-coordinate",
  });
  assert.equal(invalidPair.latitude, null);
  assert.equal(invalidPair.longitude, null);

  const unsafeMapUrl = mapPublishedVillageProfile({
    ...row,
    google_maps_url: "javascript:alert(1)",
  });
  assert.equal(unsafeMapUrl.googleMapsUrl, null);

  const safeMapUrl = mapPublishedVillageProfile({
    ...row,
    google_maps_url: "https://maps.google.com/example",
  });
  assert.equal(safeMapUrl.googleMapsUrl, "https://maps.google.com/example");
});

test("singleton classification distinguishes zero, one, and multiple published rows", () => {
  assert.deepEqual(classifyPublishedVillageProfiles([]), {
    kind: "not-found",
  });

  const ready = classifyPublishedVillageProfiles([row]);
  assert.equal(ready.kind, "ready");
  if (ready.kind === "ready") {
    assert.equal(ready.profile.name, "Desa Karang Bajo");
  }

  assert.deepEqual(classifyPublishedVillageProfiles([row, row]), {
    kind: "error",
  });

  assert.deepEqual(
    classifyPublishedVillageProfiles([{ ...row, description: "   " }]),
    { kind: "error" },
  );
});

test("homepage excerpt prefers summary and safely shortens description", () => {
  const profile = mapPublishedVillageProfile(row);
  assert.equal(getPublicVillageProfileExcerpt(profile), "Ringkasan resmi");

  const description = `${"Informasi resmi ".repeat(20)}selesai.`;
  const excerpt = getPublicVillageProfileExcerpt({
    summary: null,
    description,
  });
  assert.ok(excerpt.length <= 181);
  assert.match(excerpt, /…$/);
});

test("metadata and page rendering depend on the published singleton", () => {
  assert.match(pageSource, /getPublishedVillageProfileMetadata/);
  assert.match(pageSource, /result\.kind === "not-found"/);
  assert.match(pageSource, /result\.kind === "error"/);
  assert.doesNotMatch(pageSource, /<main\b/);
  assert.match(pageSource, /rel="noreferrer"/);
  assert.doesNotMatch(pageSource, /<Link[^>]+target="_blank"/);
});

test("empty optional Village Profile sections are conditionally omitted", () => {
  assert.deepEqual(
    getPublicVillageProfileTextSections({
      history: null,
      vision: "Visi terverifikasi",
      mission: null,
    }),
    [{ title: "Visi", content: "Visi terverifikasi" }],
  );
  assert.match(pageSource, /getPublicVillageProfileTextSections\(profile\)/);
  assert.match(pageSource, /profile\.summary \?/);
  assert.match(pageSource, /profile\.address \|\| mapHref \?/);
});

test("homepage uses published profile data without the former hard-coded copy", () => {
  assert.match(homepageSource, /getPublishedVillageProfile\(\)/);
  assert.match(homepageSource, /profile\.kind === "error"/);
  assert.match(homepageSource, /profile\.kind === "ready"/);
  assert.match(homepageSource, /href="\/profil-desa"/);
  assert.doesNotMatch(
    homepageSource,
    /Selamat datang di Desa Karang Bajo|Informasi publik hanya menampilkan konten/,
  );
});

test("Village Profile saves revalidate all affected routes", () => {
  assert.ok(
    actionSource.includes("revalidatePath(VILLAGE_PROFILE_ADMIN_PATH)"),
  );
  for (const path of ["/profil-desa", "/"]) {
    assert.ok(actionSource.includes(`revalidatePath("${path}")`));
  }
});
