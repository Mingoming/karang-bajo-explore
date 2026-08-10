import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import { getPublicNavigation } from "../config/public-navigation.ts";
import {
  getEquivalentPublicRoute,
  getPublicRoute,
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
    tourismPackages: { id: "/paket-wisata", en: null },
    homestays: { id: "/homestay", en: null },
    umkm: { id: "/umkm", en: null },
    traditionalHouses: {
      id: "/rumah-adat",
      en: "/en/traditional-houses",
    },
    culturalEvents: { id: "/acara-budaya", en: null },
    tourismMap: { id: "/peta-wisata", en: null },
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

  assert.equal(
    getPublicRoute("traditionalHouses", "en"),
    "/en/traditional-houses",
  );
  assert.equal(
    getEquivalentPublicRoute("/en/traditional-houses", "en"),
    "/rumah-adat",
  );

  for (const key of [
    "tourismPackages",
    "homestays",
    "umkm",
    "culturalEvents",
    "tourismMap",
    "contact",
  ]) {
    assert.equal(getPublicRoute(key, "en"), null, key);
  }

  for (const path of ["/admin", "/en/destinations"]) {
    assert.equal(getEquivalentPublicRoute(path, "id"), null, path);
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
      key: "traditionalHouses",
      label: "Traditional Houses",
      href: "/en/traditional-houses",
    },
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

test("English homepage uses only static copy and narrow language-neutral data", () => {
  const page = read("app/en/page.tsx");
  assert.match(page, /getEnglishPublicShellData/);
  assert.match(page, /PUBLIC_DICTIONARIES\.en/);
  assert.match(page, /<PublicShell[\s\S]*?locale="en"/);
  assert.doesNotMatch(
    page,
    /public-village-profile|public-destinations|public-domains|public-map|public-media|getPublicOfficialContacts/,
  );
  assert.doesNotMatch(page, /Profil Desa|Destinasi|Paket Wisata|Rumah Adat/);
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
  for (const path of [
    "app/id/page.tsx",
    "app/en/admin/page.tsx",
    "app/en/profile/page.tsx",
    "app/en/tourism-packages/page.tsx",
    "app/en/homestays/page.tsx",
    "app/en/local-businesses/page.tsx",
    "app/en/cultural-events/page.tsx",
    "app/en/tourism-map/page.tsx",
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
