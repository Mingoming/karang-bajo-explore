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
