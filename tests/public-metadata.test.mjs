import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const helper = readFileSync("features/seo/public-metadata.ts", "utf8");
const homepage = readFileSync("app/(public)/page.tsx", "utf8");
const destinationList = readFileSync("app/(public)/destinasi/page.tsx", "utf8");
const destinationDetail = readFileSync(
  "app/(public)/destinasi/[slug]/page.tsx",
  "utf8",
);
const mapPage = readFileSync("app/(public)/peta-wisata/page.tsx", "utf8");

const remainingListPages = [
  "app/(public)/paket-wisata/page.tsx",
  "app/(public)/homestay/page.tsx",
  "app/(public)/umkm/page.tsx",
  "app/(public)/rumah-adat/page.tsx",
  "app/(public)/acara-budaya/page.tsx",
].map((path) => readFileSync(path, "utf8"));

const remainingDetailPages = [
  {
    source: readFileSync("app/(public)/paket-wisata/[slug]/page.tsx", "utf8"),
    metadataLoader: "getPublishedPackageMetadata",
    detailLoader: "getPublishedPackage",
  },
  {
    source: readFileSync("app/(public)/homestay/[slug]/page.tsx", "utf8"),
    metadataLoader: "getPublishedHomestayMetadata",
    detailLoader: "getPublishedHomestay",
  },
  {
    source: readFileSync("app/(public)/umkm/[slug]/page.tsx", "utf8"),
    metadataLoader: "getPublishedUmkmMetadata",
    detailLoader: "getPublishedUmkm",
  },
  {
    source: readFileSync("app/(public)/rumah-adat/[slug]/page.tsx", "utf8"),
    metadataLoader: "getPublishedTraditionalHouseMetadata",
    detailLoader: "getPublishedTraditionalHouse",
  },
  {
    source: readFileSync("app/(public)/acara-budaya/[slug]/page.tsx", "utf8"),
    metadataLoader: "getPublishedCulturalEventMetadata",
    detailLoader: "getPublishedCulturalEvent",
  },
];

test("shared public metadata contains search and social descriptions", () => {
  assert.match(helper, /title:\s*safeTitle/);
  assert.match(helper, /description:\s*safeDescription/);

  assert.match(helper, /openGraph:\s*\{[\s\S]*?type:\s*"website"/);
  assert.match(helper, /openGraphLocale = "id_ID"/);
  assert.match(helper, /locale:\s*openGraphLocale/);
  assert.match(helper, /siteName:\s*SITE_CONFIG\.name/);

  assert.match(helper, /twitter:\s*\{[\s\S]*?card:\s*"summary"/);
});

test("shared metadata normalizes empty titles and descriptions", () => {
  assert.match(helper, /title\.trim\(\)\s*\|\|\s*SITE_CONFIG\.name/);
  assert.match(helper, /description\.trim\(\)\s*\|\|\s*SITE_CONFIG\.tagline/);
});

test("not-found public metadata can explicitly prevent indexing", () => {
  assert.match(helper, /noIndex\s*=\s*false/);
  assert.match(
    helper,
    /robots:\s*\{[\s\S]*?index:\s*false[\s\S]*?follow:\s*false/,
  );

  assert.match(
    destinationDetail,
    /title:\s*"Destinasi tidak ditemukan"[\s\S]*?noIndex:\s*true/,
  );
});

test("all public content routes use the shared metadata builder", () => {
  const sources = [
    homepage,
    destinationList,
    destinationDetail,
    mapPage,
    ...remainingListPages,
    ...remainingDetailPages.map(({ source }) => source),
  ];

  for (const source of sources) {
    assert.match(source, /buildPublicMetadata/);
  }
});

test("destination metadata remains published-safe and URL independent", () => {
  assert.match(destinationDetail, /getPublishedDestinationMetadata\(slug\)/);

  const metadataStart = destinationDetail.indexOf(
    "export async function generateMetadata",
  );
  const pageStart = destinationDetail.indexOf("export default async function");

  assert.notEqual(
    metadataStart,
    -1,
    "destination detail must expose generateMetadata",
  );
  assert.notEqual(
    pageStart,
    -1,
    "destination detail must expose its page component",
  );
  assert.ok(
    pageStart > metadataStart,
    "generateMetadata must appear before the page component",
  );

  const metadataBlock = destinationDetail.slice(metadataStart, pageStart);

  assert.doesNotMatch(helper, /\bmetadataBase\b/);
  assert.doesNotMatch(helper, /\bcanonical\b/);
  assert.doesNotMatch(helper, /\bopenGraph\.url\b/);
  assert.doesNotMatch(helper, /\bimages\s*:/);

  assert.doesNotMatch(metadataBlock, /signedUrl/);
  assert.doesNotMatch(metadataBlock, /getPublishedDestinationBySlug/);
});

test("remaining dynamic metadata stays published-safe and noindexes missing content", () => {
  for (const { source, metadataLoader, detailLoader } of remainingDetailPages) {
    const metadataStart = source.indexOf(
      "export async function generateMetadata",
    );
    const pageStart = source.indexOf("export default async function");

    assert.notEqual(metadataStart, -1);
    assert.notEqual(pageStart, -1);
    assert.ok(pageStart > metadataStart);

    const metadataBlock = source.slice(metadataStart, pageStart);

    assert.equal(
      metadataBlock.includes(`${metadataLoader}(`),
      true,
      `${metadataLoader} must be used by generateMetadata`,
    );

    assert.equal(
      metadataBlock.includes(`${detailLoader}(`),
      false,
      `${detailLoader} must not be used by generateMetadata`,
    );

    assert.match(metadataBlock, /noIndex:\s*true/);
    assert.doesNotMatch(metadataBlock, /signedUrl/);
  }
});
