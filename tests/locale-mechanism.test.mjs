import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import test from "node:test";

import {
  classifyPathnameLocale,
  classifyProxyRequest,
  createTrustedLocaleHeaders,
  INTERNAL_LOCALE_HEADER,
  readTrustedLocale,
} from "../lib/i18n/locale.ts";

const ENGLISH_HOME_PAGE = "app/en/page.tsx";
const ENGLISH_VILLAGE_PROFILE_PAGE = "app/en/village-profile/page.tsx";

function collectTypeScriptSources(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = `${directory}/${entry.name}`;

    if (entry.isDirectory()) {
      return collectTypeScriptSources(path);
    }

    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

test("pathnames use exact English-prefix classification", () => {
  const cases = [
    ["/", "id"],
    ["/en", "en"],
    ["/en/", "en"],
    ["/en/example", "en"],
    ["/en/village-profile", "en"],
    ["/enough", "id"],
    ["/admin", "id"],
    ["/fr", "id"],
    ["/unknown.path", "id"],
  ];

  for (const [pathname, expected] of cases) {
    assert.equal(classifyPathnameLocale(pathname), expected, pathname);
  }
});

test("trusted locale headers overwrite caller-controlled values", () => {
  const spoofedEnglish = new Headers({ [INTERNAL_LOCALE_HEADER]: "en" });
  const spoofedIndonesian = new Headers({ [INTERNAL_LOCALE_HEADER]: "id" });

  const rootHeaders = createTrustedLocaleHeaders(spoofedEnglish, "/");
  const englishHeaders = createTrustedLocaleHeaders(spoofedIndonesian, "/en");

  assert.equal(rootHeaders.get(INTERNAL_LOCALE_HEADER), "id");
  assert.equal(readTrustedLocale(rootHeaders), "id");
  assert.equal(englishHeaders.get(INTERNAL_LOCALE_HEADER), "en");
  assert.equal(readTrustedLocale(englishHeaders), "en");
});

test("auth, admin, and unknown paths reject a spoofed English locale", () => {
  const spoofedEnglish = new Headers({ [INTERNAL_LOCALE_HEADER]: "en" });

  for (const pathname of [
    "/login",
    "/reset-password",
    "/admin",
    "/admin/example",
    "/unknown",
    "/unknown.path",
  ]) {
    const trustedHeaders = createTrustedLocaleHeaders(spoofedEnglish, pathname);

    assert.equal(readTrustedLocale(trustedHeaders), "id", pathname);
  }
});

test("only existing admin and auth paths require session refresh", () => {
  for (const pathname of [
    "/admin",
    "/admin/destinasi",
    "/login",
    "/reset-password",
  ]) {
    assert.equal(classifyProxyRequest(pathname), "session-refresh", pathname);
  }

  for (const pathname of [
    "/",
    "/en",
    "/en/example",
    "/en/village-profile",
    "/destinasi",
    "/fr",
  ]) {
    assert.equal(classifyProxyRequest(pathname), "locale-only", pathname);
  }
});

test("the foundation creates only the approved English routes", () => {
  assert.equal(existsSync(ENGLISH_HOME_PAGE), true);
  assert.equal(existsSync(ENGLISH_VILLAGE_PROFILE_PAGE), true);
  assert.equal(existsSync("app/en/destinations/page.tsx"), true);

  for (const path of ["app/en/admin/page.tsx", "app/en/profile/page.tsx"]) {
    assert.equal(existsSync(path), false, path);
  }
});

test("the English homepage uses only approved English descriptive-content loaders", () => {
  const source = readFileSync(ENGLISH_HOME_PAGE, "utf8");

  for (const loader of [
    "getPublishedEnglishVillageProfile",
    "getPublishedEnglishDestinations",
    "getPublishedEnglishTraditionalHouses",
    "getPublishedEnglishCulturalEvents",
    "getPublishedEnglishHomestays",
    "getPublishedEnglishUmkms",
  ]) {
    assert.match(source, new RegExp(loader));
  }
  assert.doesNotMatch(
    source,
    /getPublished(?:VillageProfile|Destinations|Packages|Homestays|Umkms|TraditionalHouses|CulturalEvents)\(/,
  );
  assert.doesNotMatch(source, /createClient|supabase/i);
  assert.doesNotMatch(source, /locale mechanism spike|English locale spike/i);
});

test("the root layout reads the trusted locale and does not use a client correction", () => {
  const source = readFileSync("app/layout.tsx", "utf8");

  assert.match(source, /readTrustedLocale\(await headers\(\)\)/);
  assert.match(source, /<html lang={locale}/);
  assert.doesNotMatch(source, /document\.documentElement|useEffect/);
});

test("Proxy sanitizes the locale before entering the session-refresh helper", () => {
  const source = readFileSync("proxy.ts", "utf8");
  const trustedHeaderIndex = source.indexOf("createTrustedLocaleHeaders(");
  const branchIndex = source.indexOf("if (classifyProxyRequest(pathname)");
  const deleteIndex = source.indexOf(
    "request.headers.delete(INTERNAL_LOCALE_HEADER)",
  );
  const setIndex = source.indexOf("request.headers.set(", deleteIndex);
  const refreshIndex = source.indexOf("return updateSession(request)");

  assert.ok(trustedHeaderIndex >= 0 && trustedHeaderIndex < branchIndex);
  assert.ok(branchIndex < deleteIndex);
  assert.ok(deleteIndex >= 0);
  assert.ok(setIndex > deleteIndex);
  assert.ok(refreshIndex > setIndex);

  const localeSetBlock = source.slice(setIndex, refreshIndex);

  assert.match(
    localeSetBlock,
    /request\.headers\.set\(\s*INTERNAL_LOCALE_HEADER,\s*trustedHeaders\.get\(INTERNAL_LOCALE_HEADER\)\s*\?\?\s*"id",?\s*\)/,
  );
});

test("the internal locale-header literal has one production definition", () => {
  const productionSources = [
    "proxy.ts",
    ...collectTypeScriptSources("app"),
    ...collectTypeScriptSources("components"),
    ...collectTypeScriptSources("config"),
    ...collectTypeScriptSources("features"),
    ...collectTypeScriptSources("lib"),
  ];
  const headerLiteral = ["x-karang", "-bajo-locale"].join("");
  const definitions = productionSources.filter((path) =>
    readFileSync(path, "utf8").includes(headerLiteral),
  );

  assert.deepEqual(definitions, ["lib/i18n/locale.ts"]);
});
