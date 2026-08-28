import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import { getPublicNavigation } from "../config/public-navigation.ts";
import {
  getEquivalentPublicRoute,
  getPublicRoute,
  PUBLIC_DETAIL_ROUTE_MANIFEST,
  PUBLIC_ROUTE_KEYS,
  PUBLIC_ROUTE_MANIFEST,
} from "../config/public-routes.ts";
import { classifyEnglishPublicShellData } from "../features/official-contact/public-shell-model.ts";
import { PUBLIC_DICTIONARIES } from "../lib/i18n/dictionaries.ts";

const read = (path) => readFileSync(path, "utf8");

function dictionaryKeys(value, prefix = "") {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof child === "string" ? [path] : dictionaryKeys(child, path);
  });
}

function dictionaryValues(value) {
  return Object.values(value).flatMap((child) =>
    typeof child === "string" ? [child] : dictionaryValues(child),
  );
}

test("Indonesian and English dictionaries have exact nonblank structural parity", () => {
  assert.deepEqual(
    dictionaryKeys(PUBLIC_DICTIONARIES.en),
    dictionaryKeys(PUBLIC_DICTIONARIES.id),
  );

  for (const dictionary of Object.values(PUBLIC_DICTIONARIES)) {
    assert.ok(dictionaryValues(dictionary).every((value) => value.trim()));
  }
});

test("dictionaries contain static copy rather than routes or contact data", () => {
  for (const value of [
    ...dictionaryValues(PUBLIC_DICTIONARIES.id),
    ...dictionaryValues(PUBLIC_DICTIONARIES.en),
  ]) {
    assert.doesNotMatch(value, /https?:\/\/|wa\.me|\/[a-z-]+/i);
    assert.doesNotMatch(value, /\+?\d[\d ()-]{7,}\d/);
  }
});

test("semantic route manifest contains the ten approved keys and exact paths", () => {
  assert.deepEqual(PUBLIC_ROUTE_KEYS, [
    "home",
    "profile",
    "destinations",
    "tourismPackages",
    "homestays",
    "umkm",
    "traditionalHouses",
    "culturalEvents",
    "tourismMap",
    "contact",
  ]);
  assert.deepEqual(PUBLIC_ROUTE_MANIFEST, {
    home: { id: "/", en: "/en" },
    profile: { id: "/profil-desa", en: "/en/village-profile" },
    destinations: { id: "/destinasi", en: "/en/destinations" },
    tourismPackages: { id: "/paket-wisata", en: "/en/tourism-packages" },
    homestays: { id: "/homestay", en: "/en/homestays" },
    umkm: { id: "/umkm", en: "/en/local-businesses" },
    traditionalHouses: {
      id: "/rumah-adat",
      en: "/en/traditional-houses",
    },
    culturalEvents: { id: "/acara-budaya", en: "/en/cultural-events" },
    tourismMap: { id: "/peta-wisata", en: "/en/tourism-map" },
    contact: { id: "/kontak", en: null },
  });
});

test("home and Village Profile have reciprocal English routes", () => {
  assert.equal(getPublicRoute("home", "id"), "/");
  assert.equal(getPublicRoute("home", "en"), "/en");
  assert.equal(getEquivalentPublicRoute("/", "id"), "/en");
  assert.equal(getEquivalentPublicRoute("/en", "en"), "/");

  assert.equal(getPublicRoute("profile", "id"), "/profil-desa");
  assert.equal(getPublicRoute("profile", "en"), "/en/village-profile");
  assert.equal(
    getEquivalentPublicRoute("/profil-desa", "id"),
    "/en/village-profile",
  );
  assert.equal(
    getEquivalentPublicRoute("/en/village-profile", "en"),
    "/profil-desa",
  );

  assert.equal(getPublicRoute("destinations", "id"), "/destinasi");
  assert.equal(getPublicRoute("destinations", "en"), "/en/destinations");
  assert.equal(
    getEquivalentPublicRoute("/destinasi", "id"),
    "/en/destinations",
  );
  assert.equal(
    getEquivalentPublicRoute("/en/destinations", "en"),
    "/destinasi",
  );

  assert.equal(getPublicRoute("tourismPackages", "en"), "/en/tourism-packages");
  assert.equal(
    getEquivalentPublicRoute("/paket-wisata", "id"),
    "/en/tourism-packages",
  );
  assert.equal(
    getEquivalentPublicRoute("/en/tourism-packages", "en"),
    "/paket-wisata",
  );

  assert.equal(getPublicRoute("homestays", "en"), "/en/homestays");
  assert.equal(getEquivalentPublicRoute("/en/homestays", "en"), "/homestay");

  assert.equal(getPublicRoute("umkm", "en"), "/en/local-businesses");
  assert.equal(getEquivalentPublicRoute("/en/local-businesses", "en"), "/umkm");

  assert.equal(
    getPublicRoute("traditionalHouses", "en"),
    "/en/traditional-houses",
  );
  assert.equal(
    getEquivalentPublicRoute("/en/traditional-houses", "en"),
    "/rumah-adat",
  );

  assert.equal(getPublicRoute("culturalEvents", "en"), "/en/cultural-events");
  assert.equal(
    getEquivalentPublicRoute("/en/cultural-events", "en"),
    "/acara-budaya",
  );

  assert.equal(getPublicRoute("tourismMap", "en"), "/en/tourism-map");
  assert.equal(
    getEquivalentPublicRoute("/en/tourism-map", "en"),
    "/peta-wisata",
  );

  for (const key of ["contact"]) {
    assert.equal(getPublicRoute(key, "en"), null, key);
  }

  for (const path of ["/admin", "/en/destinations"]) {
    assert.equal(getEquivalentPublicRoute(path, "id"), null, path);
  }
});

test("detail language switching uses paired route descriptors and trusted slugs", () => {
  assert.deepEqual(PUBLIC_DETAIL_ROUTE_MANIFEST, {
    destinations: {
      id: "/destinasi/[slug]",
      en: "/en/destinations/[slug]",
    },
    tourismPackages: {
      id: "/paket-wisata/[slug]",
      en: "/en/tourism-packages/[slug]",
    },
    homestays: {
      id: "/homestay/[slug]",
      en: "/en/homestays/[slug]",
    },
    umkm: {
      id: "/umkm/[slug]",
      en: "/en/local-businesses/[slug]",
    },
    traditionalHouses: {
      id: "/rumah-adat/[slug]",
      en: "/en/traditional-houses/[slug]",
    },
    culturalEvents: {
      id: "/acara-budaya/[slug]",
      en: "/en/cultural-events/[slug]",
    },
  });

  for (const [indonesianPath, englishPath] of [
    ["/destinasi/bukit-karang", "/en/destinations/bukit-karang"],
    ["/paket-wisata/paket-karang", "/en/tourism-packages/paket-karang"],
    ["/homestay/rumah-bajo", "/en/homestays/rumah-bajo"],
    ["/umkm/tenun-bajo", "/en/local-businesses/tenun-bajo"],
    [
      "/rumah-adat/rumah-adat-karang",
      "/en/traditional-houses/rumah-adat-karang",
    ],
    ["/acara-budaya/festival-bajo", "/en/cultural-events/festival-bajo"],
  ]) {
    assert.equal(getEquivalentPublicRoute(indonesianPath, "id"), englishPath);
    assert.equal(getEquivalentPublicRoute(englishPath, "en"), indonesianPath);
  }

  for (const pathname of [
    "/homestay/bad slug",
    "/homestay/../x",
    "/en/homestays/x%2Fy",
    "/rumah-adat/bad slug",
    "/rumah-adat/../x",
    "/rumah-adat/x/y",
    "/en/traditional-houses/x%2Fy",
    "/en/traditional-houses/%E0%A4%A",
    "/en/tourism-map/example",
    "/en/unsupported/example",
  ]) {
    assert.equal(
      getEquivalentPublicRoute(
        pathname,
        pathname.startsWith("/en") ? "en" : "id",
      ),
      null,
      pathname,
    );
  }
});

test("localized navigation preserves Indonesian routes and limits English to approved routes", () => {
  assert.deepEqual(
    getPublicNavigation("id", PUBLIC_DICTIONARIES.id).map(({ label, href }) => [
      label,
      href,
    ]),
    [
      ["Beranda", "/"],
      ["Profil Desa", "/profil-desa"],
      ["Destinasi", "/destinasi"],
      ["Paket Wisata", "/paket-wisata"],
      ["Homestay", "/homestay"],
      ["UMKM", "/umkm"],
      ["Rumah Adat", "/rumah-adat"],
      ["Acara Budaya", "/acara-budaya"],
      ["Peta Wisata", "/peta-wisata"],
      ["Kontak", "/kontak"],
    ],
  );
  assert.deepEqual(getPublicNavigation("en", PUBLIC_DICTIONARIES.en), [
    { key: "home", label: "Home", href: "/en" },
    {
      key: "profile",
      label: "Village Profile",
      href: "/en/village-profile",
    },
    { key: "destinations", label: "Destinations", href: "/en/destinations" },
    {
      key: "tourismPackages",
      label: "Tourism Packages",
      href: "/en/tourism-packages",
    },
    { key: "homestays", label: "Homestays", href: "/en/homestays" },
    {
      key: "umkm",
      label: "Local Businesses",
      href: "/en/local-businesses",
    },
    {
      key: "traditionalHouses",
      label: "Traditional Houses",
      href: "/en/traditional-houses",
    },
    {
      key: "culturalEvents",
      label: "Cultural Events",
      href: "/en/cultural-events",
    },
    { key: "tourismMap", label: "Tourism Map", href: "/en/tourism-map" },
  ]);
});

test("language switcher uses real reciprocal links and semantic current state", () => {
  const source = read("components/public/language-switcher.tsx");
  assert.match(source, /getEquivalentPublicRoute\(pathname, locale\)/);
  assert.match(source, /if \(!equivalent\) return null/);
  assert.match(source, /aria-current="page"/);
  assert.match(source, /<a[\s\S]*?href=\{equivalent\}/);
  assert.match(source, /hrefLang={targetLocale}/);
  assert.match(source, /onClick={onNavigate}/);
  assert.doesNotMatch(source, /next\/link|disabled|preventDefault/);
});

test("English homepage uses approved English projections and localized static copy", () => {
  const page = read("app/en/page.tsx");
  assert.match(page, /getEnglishPublicShellData/);
  assert.match(page, /PUBLIC_DICTIONARIES\.en/);
  assert.match(page, /<PublicShell[\s\S]*?locale="en"/);
  for (const loader of [
    "getPublishedEnglishVillageProfile",
    "getPublishedEnglishDestinations",
    "getPublishedEnglishTraditionalHouses",
    "getPublishedEnglishCulturalEvents",
    "getPublishedEnglishHomestays",
    "getPublishedEnglishUmkms",
  ]) {
    assert.match(page, new RegExp(loader));
  }
  assert.doesNotMatch(
    page,
    /getPublished(?:VillageProfile|Destinations|Packages|Homestays|Umkms|TraditionalHouses|CulturalEvents)\(/,
  );
  assert.doesNotMatch(page, /\/kontak|\/paket-wisata|Paket Wisata/);
});

test("English contact data returns no labels, descriptions, IDs, or phone display values", () => {
  const result = classifyEnglishPublicShellData(
    { key: "primary_whatsapp_number", value: "6281234567890" },
    [
      {
        label: "Google Maps Wisata",
        contact_type: "url",
        value: "https://example.test/maps",
        display_order: 0,
      },
      {
        label: "Unrelated private description",
        contact_type: "url",
        value: "https://example.test/private",
        display_order: 1,
      },
    ],
  );
  assert.deepEqual(result, {
    kind: "ready",
    data: {
      whatsappHref: "https://wa.me/6281234567890",
      externalLinks: [
        { platform: "google-maps", href: "https://example.test/maps" },
      ],
    },
  });
  assert.doesNotMatch(JSON.stringify(result), /label|description|private|id/i);

  const dataSource = read("features/official-contact/public-shell-data.ts");
  assert.match(
    dataSource,
    /\.select\("label,contact_type,value,display_order"\)/,
  );
  assert.doesNotMatch(dataSource, /\.select\([^\n]*description|displayValue/);
});

test("English contact and footer have localized unavailable behavior without /kontak", () => {
  const cta = read("features/official-contact/official-contact-cta.tsx");
  const footer = read("components/public/public-footer.tsx");
  assert.match(cta, /EnglishOfficialContactCta/);
  assert.match(cta, /if \(!whatsappHref\)/);
  assert.doesNotMatch(
    cta.slice(cta.indexOf("EnglishOfficialContactCta")),
    /href="\/kontak"/,
  );
  assert.match(footer, /kind: "unavailable"/);
  assert.match(footer, /dictionary\.footer\.unavailable/);
});

test("English metadata is localized without canonical or alternate output", () => {
  const page = read("app/en/page.tsx");
  const metadata = read("features/seo/public-metadata.ts");
  assert.match(page, /openGraphLocale: "en_US"/);
  assert.match(metadata, /openGraphLocale = "id_ID"/);
  assert.doesNotMatch(
    `${page}\n${metadata}`,
    /metadataBase|alternates|canonical|hreflang/,
  );
});

test("only approved English routes are created and Proxy excludes actual assets", () => {
  const proxy = read("proxy.ts");
  assert.equal(existsSync("app/en/page.tsx"), true);
  assert.equal(existsSync("app/en/village-profile/page.tsx"), true);
  assert.equal(existsSync("app/en/traditional-houses/page.tsx"), true);
  assert.equal(existsSync("app/en/cultural-events/page.tsx"), true);
  assert.equal(existsSync("app/en/homestays/page.tsx"), true);
  assert.equal(existsSync("app/en/local-businesses/page.tsx"), true);
  for (const path of [
    "app/id/page.tsx",
    "app/en/admin/page.tsx",
    "app/en/profile/page.tsx",
    "app/en/unsupported/page.tsx",
    "app/en/contact/page.tsx",
  ]) {
    assert.equal(existsSync(path), false, path);
  }
  assert.match(proxy, /_next\/static\|_next\/image/);
  assert.match(proxy, /favicon\.ico\|images\//);
  assert.doesNotMatch(proxy, /\.\*\\\\\.\.\*/);
});

test("Indonesian homepage keeps every existing descriptive-content loader", () => {
  const page = read("app/(public)/page.tsx");
  for (const loader of [
    "getPublishedVillageProfile",
    "getPublishedDestinations",
    "getPublishedPackages",
    "getPublishedHomestays",
    "getPublishedUmkms",
    "getPublishedTraditionalHouses",
    "getPublishedCulturalEvents",
  ]) {
    assert.match(page, new RegExp(loader));
  }
});

test("unsupported English routes use localized not-found UI", () => {
  const englishNotFound = readFileSync("app/en/not-found.tsx", "utf8");
  const englishCatchAll = readFileSync("app/en/[...notFound]/page.tsx", "utf8");

  assert.match(englishNotFound, /const copy = PUBLIC_DICTIONARIES\.en\.states/);
  assert.match(englishNotFound, /copy\.notFoundTitle/);
  assert.match(englishNotFound, /copy\.notFoundDescription/);
  assert.match(englishNotFound, /copy\.notFoundAction/);
  assert.match(englishNotFound, /href="\/en"/);

  assert.equal(PUBLIC_DICTIONARIES.en.states.notFoundTitle, "Page not found");
  assert.equal(
    PUBLIC_DICTIONARIES.en.states.notFoundAction,
    "Back to homepage",
  );
  assert.doesNotMatch(
    englishNotFound,
    /Halaman tidak ditemukan|Kembali ke beranda/,
  );
  assert.doesNotMatch(englishNotFound, /href="\/kontak"/);

  assert.match(englishCatchAll, /notFound\(\)/);
});
