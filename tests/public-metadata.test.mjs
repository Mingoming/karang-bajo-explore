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

test("shared public metadata contains search and social descriptions", () => {
  assert.match(helper, /title:\s*safeTitle/);
  assert.match(helper, /description:\s*safeDescription/);

  assert.match(helper, /openGraph:\s*\{[\s\S]*?type:\s*"website"/);
  assert.match(helper, /locale:\s*"id_ID"/);
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

test("representative public routes use the shared metadata builder", () => {
  for (const source of [
    homepage,
    destinationList,
    destinationDetail,
    mapPage,
  ]) {
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
