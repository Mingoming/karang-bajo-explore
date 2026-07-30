import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import { PUBLIC_NAVIGATION } from "../config/public-navigation.ts";

const read = (path) => readFileSync(path, "utf8");
const page = read("app/(public)/page.tsx");
const layout = read("app/(public)/layout.tsx");
const header = read("components/public/public-header.tsx");
const mobileNavigation = read("components/public/public-mobile-navigation.tsx");
const footer = read("components/public/public-footer.tsx");
const publicSources = [page, layout, header, mobileNavigation, footer].join(
  "\n",
);

test("homepage is owned by the public route group", () => {
  assert.match(page, /export default function HomePage/);
  assert.equal(existsSync("app/page.tsx"), false);
});

test("public layout provides header, main landmark, footer, and skip link", () => {
  assert.match(layout, /<PublicHeader \/>/);
  assert.match(layout, /<main id="konten-utama"/);
  assert.match(layout, /<PublicFooter \/>/);
  assert.match(layout, /Lewati ke konten utama/);
});

test("public navigation exposes the approved foundation labels", () => {
  assert.deepEqual(
    PUBLIC_NAVIGATION.map(({ label }) => label),
    [
      "Beranda",
      "Destinasi",
      "Paket Wisata",
      "Homestay",
      "UMKM",
      "Budaya",
      "Peta Wisata",
    ],
  );
});

test("homepage presentation has exactly one primary heading", () => {
  const hero = read("components/public/public-hero.tsx");
  assert.equal([page, hero].join("\n").match(/<h1\b/g)?.length, 1);
});

test("all Milestone 1 homepage sections are represented", () => {
  assert.match(page, /<PublicHero \/>/);
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
  assert.match(mobileNavigation, /Tutup/);
  assert.equal(
    mobileNavigation.includes("onClick={() => setIsOpen(false)}"),
    true,
  );
});

test("public foundation presentation has no migration dependency", () => {
  assert.doesNotMatch(publicSources, /supabase[\\/]migrations|\.sql["']/);
});
