import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

const page = read("app/en/page.tsx");
const dictionary = read("lib/i18n/dictionaries.ts");
const hero = read("components/public/public-hero.tsx");
const card = read("components/public/public-content-card.tsx");

test("English homepage exposes every supported English public route", () => {
  for (const route of [
    "PUBLIC_ENGLISH_VILLAGE_PROFILE_PATH",
    "PUBLIC_ENGLISH_DESTINATIONS_PATH",
    "PUBLIC_ENGLISH_TOURISM_PACKAGES_PATH",
    "PUBLIC_ENGLISH_TRADITIONAL_HOUSES_PATH",
    "PUBLIC_ENGLISH_CULTURAL_EVENTS_PATH",
    "PUBLIC_ENGLISH_HOMESTAYS_PATH",
    "PUBLIC_ENGLISH_UMKMS_PATH",
    "PUBLIC_ENGLISH_TOURISM_MAP_PATH",
  ]) {
    assert.match(page, new RegExp(route));
  }

  for (const section of [
    "english-village-profile",
    "english-destinations",
    "english-tourism-packages",
    "english-traditional-houses",
    "english-cultural-events",
    "english-homestays",
    "english-local-businesses",
    "english-tourism-map",
  ]) {
    assert.match(page, new RegExp(`id=\\"${section}\\"`));
  }

  assert.match(page, /<PublicHero[\s\S]*?primaryHref=/);
  assert.match(page, /<PublicHero[\s\S]*?secondaryHref=/);
  assert.match(page, /<EmptyContentState/);
});

test("English homepage uses approved English loaders and fail-closed list results", () => {
  for (const loader of [
    "getPublishedEnglishVillageProfile",
    "getPublishedEnglishDestinations",
    "getPublishedEnglishTourismPackages",
    "getPublishedEnglishTraditionalHouses",
    "getPublishedEnglishCulturalEvents",
    "getPublishedEnglishHomestays",
    "getPublishedEnglishUmkms",
  ]) {
    assert.match(page, new RegExp(loader));
  }

  assert.match(page, /requireEnglishItems/);
  assert.match(page, /PUBLIC_ENGLISH_HOMEPAGE_[A-Z_]+_UNAVAILABLE/);
  assert.doesNotMatch(
    page,
    /getPublished(?:VillageProfile|Destinations|Homestays|Umkms|TraditionalHouses|CulturalEvents)\(/,
  );
  assert.doesNotMatch(page, /\bOfficialContactCta\b/);
  assert.doesNotMatch(page, /\/kontak|\/paket-wisata|Paket Wisata/);
  assert.doesNotMatch(
    page,
    /from\(["'](?:destinations|traditional_houses|cultural_events|homestays|umkms)["']\)/,
  );
});

test("English public loaders stay inside their approved projection boundary", () => {
  const loaderSources = [
    [
      "features/public-village-profile/english-data.ts",
      "published_english_village_profiles",
    ],
    [
      "features/public-destinations/english-data.ts",
      "published_english_destinations",
    ],
    [
      "features/public-traditional-houses/english-data.ts",
      "published_english_traditional_houses",
    ],
    [
      "features/public-cultural-events/english-data.ts",
      "published_english_cultural_events",
    ],
    [
      "features/public-homestays/english-data.ts",
      "published_english_homestays",
    ],
    ["features/public-umkms/english-data.ts", "published_english_umkms"],
  ];

  for (const [path, projection] of loaderSources) {
    const source = read(path);
    assert.match(source, new RegExp(projection));
    assert.match(source, /server-only|createClient/);
    assert.doesNotMatch(
      source,
      /\.from\(["'](?:village_profiles|village_profile_translations|destinations|destination_translations|traditional_houses|traditional_house_translations|cultural_events|cultural_event_translations|homestays|homestay_translations|umkms|umkm_translations)["']\)/,
    );
  }
});

test("English homepage has no stale foundation copy or Indonesian card fallback", () => {
  for (const staleCopy of [
    "A carefully prepared English starting point",
    "Verified English tourism information is being prepared",
    "Detailed village and tourism content is not shown here",
    "English information status",
  ]) {
    assert.doesNotMatch(
      `${page}\n${dictionary}\n${hero}`,
      new RegExp(staleCopy),
    );
  }

  assert.match(card, /copy\?: PublicContentCardCopy/);
  assert.match(page, /copy=\{ENGLISH_CARD_COPY\}/);
  assert.match(page, /summary: tourismPackage\.summary/);
  assert.match(page, /primaryImage: tourismPackage\.primaryImage/);
  assert.doesNotMatch(page, /tourismPackage\.(?:description|itinerary)/);
  assert.doesNotMatch(
    page,
    /Lihat detail|Profil Desa|Destinasi|Rumah Adat|Acara Budaya/,
  );
});

test("English card copy remains explicit while Indonesian card defaults remain available", () => {
  assert.match(card, /const INDONESIAN_COPY/);
  assert.match(card, /detailAction: "Lihat detail"/);
  assert.match(card, /copy = INDONESIAN_COPY/);
  assert.match(page, /detailAction: "View details"/);
});
