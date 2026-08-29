import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import { PUBLIC_NAVIGATION } from "../config/public-navigation.ts";
const read = (path) => readFileSync(path, "utf8");
const page = read("app/(public)/page.tsx");
const layout = read("app/(public)/layout.tsx");
const shell = read("components/public/public-shell.tsx");
const rootLayout = read("app/layout.tsx");
const globalStyles = read("app/globals.css");
const header = read("components/public/public-header.tsx");
const languageSwitcher = read("components/public/language-switcher.tsx");
const mobileNavigation = read("components/public/public-mobile-navigation.tsx");
const footer = read("components/public/public-footer.tsx");
const publicSources = [
  page,
  layout,
  shell,
  header,
  mobileNavigation,
  footer,
].join("\n");

test("homepage is owned by the public route group", () => {
  assert.match(page, /export default (?:async )?function HomePage/);
  assert.equal(existsSync("app/page.tsx"), false);
});

test("public layout provides header, main landmark, footer, and skip link", () => {
  assert.match(layout, /<PublicShell locale="id">/);
  assert.match(shell, /<PublicHeader locale={locale} dictionary={dictionary}/);
  assert.match(shell, /<main[\s\S]*?id={mainContentId}/);
  assert.match(shell, /<PublicFooter/);
  assert.match(shell, /dictionary\.shell\.skipLink/);
  assert.match(shell, /locale === "id" \? "konten-utama" : "main-content"/);
});

test("public navigation exposes the approved foundation labels", () => {
  assert.deepEqual(
    PUBLIC_NAVIGATION.map(({ label }) => label),
    [
      "Beranda",
      "Profil Desa",
      "Destinasi",
      "Paket Wisata",
      "Homestay",
      "UMKM",
      "Rumah Adat",
      "Acara Budaya",
      "Peta Wisata",
      "Kontak",
    ],
  );
});

test("homepage presentation has exactly one primary heading", () => {
  const hero = read("components/public/public-hero.tsx");
  assert.equal([page, hero].join("\n").match(/<h1\b/g)?.length, 1);
});

test("all Milestone 1 homepage sections are represented", () => {
  assert.match(page, /<PublicHero locale="id"/);
  for (const sectionId of [
    "profil-desa",
    "destinasi",
    "paket-wisata",
    "homestay",
    "umkm",
    "budaya",
    "peta-wisata",
  ]) {
    assert.match(page, new RegExp(`id="${sectionId}"`));
  }
  assert.match(page, /Mulai mengenal Karang Bajo/);
});

test("homepage embeds the map immediately after Village Profile without a duplicate CTA", () => {
  const profilePosition = page.indexOf('id="profil-desa"');
  const mapPosition = page.indexOf('id="peta-wisata"');
  const destinationsPosition = page.indexOf('id="destinasi"');

  assert.ok(profilePosition >= 0);
  assert.ok(mapPosition > profilePosition);
  assert.ok(destinationsPosition > mapPosition);
  assert.match(page, /getPublishedPublicMapData\(\)/);
  assert.match(
    page,
    /<PublicMapEmbed[\s\S]*markers=\{tourismMap\.markers\}[\s\S]*locale="id" \/>/,
  );
  assert.doesNotMatch(page, /href="\/peta-wisata"|Buka peta wisata/);
});

test("public presentation imports neither admin code nor service-role configuration", () => {
  assert.doesNotMatch(
    publicSources,
    /@\/components\/admin|@\/features\/.*actions/,
  );
  assert.doesNotMatch(publicSources, /SERVICE_ROLE|service-role|service_role/i);
});

test("mobile navigation exposes explicit controls and closes on navigation", () => {
  assert.match(mobileNavigation, /aria-expanded={isOpen}/);
  assert.match(mobileNavigation, /aria-controls="navigasi-publik-mobile"/);
  assert.match(mobileNavigation, /dictionary\.navigation\.closeButton/);
  assert.equal(
    mobileNavigation.includes("onClick={() => setIsOpen(false)}"),
    true,
  );
});

test("public language switcher shows compact flags beside the brand without mobile duplication", () => {
  assert.match(
    header,
    /<LanguageSwitcher locale=\{locale\} dictionary=\{dictionary\} \/>/,
  );
  assert.equal(header.match(/<LanguageSwitcher\b/g)?.length, 1);
  const brandLink = header.match(/<Link[\s\S]*?<\/Link>/)?.[0];
  assert.ok(brandLink);
  assert.doesNotMatch(brandLink, /\bflex-1\b/);
  assert.match(
    header,
    /<PublicContainer className="relative flex min-h-20 items-center justify-between gap-3 sm:gap-6 min-\[1600px\]:max-w-\[1800px\] min-\[1600px\]:px-4">/,
  );
  assert.match(
    header,
    /<div className="flex min-w-0 flex-initial items-center gap-2 sm:gap-3">[\s\S]*?<\/Link>[\s\S]*?<LanguageSwitcher locale=\{locale\} dictionary=\{dictionary\} \/>[\s\S]*?<\/div>/,
  );
  assert.match(
    header,
    /<div className="hidden shrink-0 items-center gap-2 min-\[1600px\]:flex">[\s\S]*?<PublicNavigationLinks/s,
  );
  assert.match(
    header,
    /<LanguageSwitcher[\s\S]*?\/>[\s\S]*?<\/div>\s*\n\s*\n\s*<div className="hidden shrink-0 items-center gap-2 min-\[1600px\]:flex/s,
  );
  assert.match(
    mobileNavigation,
    /<div className="shrink-0 min-\[1600px\]:hidden">/,
  );
  assert.doesNotMatch(languageSwitcher, /className="[^"]*\bhidden\b/);
  assert.match(
    languageSwitcher,
    /currentFlagSrc =\s*locale === "id"\s*\? "\/icons\/flags\/indonesia\.svg"\s*:\s*"\/icons\/flags\/united-kingdom\.svg"/s,
  );
  assert.match(
    languageSwitcher,
    /targetFlagSrc =\s*targetLocale === "id"\s*\? "\/icons\/flags\/indonesia\.svg"\s*:\s*"\/icons\/flags\/united-kingdom\.svg"/s,
  );
  assert.match(languageSwitcher, /aria-current="page"/);
  assert.match(languageSwitcher, /aria-label=\{currentLabel\}/);
  assert.match(languageSwitcher, /aria-label=\{targetLabel\}/);
  assert.match(
    languageSwitcher,
    /<Image[\s\S]*?src=\{currentFlagSrc\}[\s\S]*?alt=""[\s\S]*?aria-hidden="true"[\s\S]*?width=\{24\}[\s\S]*?height=\{16\}/,
  );
  assert.match(
    languageSwitcher,
    /<Image[\s\S]*?src=\{targetFlagSrc\}[\s\S]*?alt=""[\s\S]*?aria-hidden="true"[\s\S]*?width=\{24\}[\s\S]*?height=\{16\}/,
  );
  assert.equal(languageSwitcher.match(/<Image\b/g)?.length, 2);
  assert.equal(
    languageSwitcher.match(/className="h-4 w-6 shrink-0"/g)?.length,
    2,
  );
  assert.doesNotMatch(
    languageSwitcher,
    />\s*\{(?:currentLabel|targetLabel)\}\s*</,
  );
  assert.doesNotMatch(languageSwitcher, />\s*(?:ID|GB)\s*</);
  assert.doesNotMatch(languageSwitcher, /[\u{1f1e6}-\u{1f1ff}]/u);
  assert.match(languageSwitcher, /hrefLang=\{targetLocale\}/);
  assert.match(languageSwitcher, /lang=\{targetLocale\}/);
  assert.match(languageSwitcher, /aria-hidden="true"/);
  assert.equal(existsSync("public/icons/flags/indonesia.svg"), true);
  assert.equal(existsSync("public/icons/flags/united-kingdom.svg"), true);
  assert.doesNotMatch(mobileNavigation, /LanguageSwitcher/);
});

test("public foundation presentation has no migration dependency", () => {
  assert.doesNotMatch(publicSources, /supabase[\\/]migrations|\.sql["']/);
});

test("public shell reserves viewport space and footer copyright meets contrast", () => {
  assert.match(
    shell,
    /className="[^"]*\bflex\b[^"]*\bmin-h-screen\b[^"]*\bflex-col\b/,
  );
  assert.match(shell, /className="[^"]*\bmin-h-screen\b[^"]*\bflex-1\b/);

  assert.match(footer, /pt-6 text-sm text-slate-400/);
  assert.doesNotMatch(footer, /pt-6 text-sm text-slate-500/);
});

test("root layout declares the configured smooth scroll behavior", () => {
  assert.match(globalStyles, /scroll-behavior:\s*smooth/);
  assert.match(rootLayout, /data-scroll-behavior="smooth"/);
});
