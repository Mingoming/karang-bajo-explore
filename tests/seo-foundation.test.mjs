import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const rootLayout = readFileSync("app/layout.tsx", "utf8");
const adminLayout = readFileSync("app/admin/layout.tsx", "utf8");
const authLayout = readFileSync("app/(auth)/layout.tsx", "utf8");
const homepage = readFileSync("app/(public)/page.tsx", "utf8");
const robotsRoute = readFileSync("app/robots.ts", "utf8");
const siteConfig = readFileSync("config/site.ts", "utf8");

test("root metadata keeps the Indonesian site identity and uses the trusted locale", () => {
  assert.match(rootLayout, /applicationName:\s*SITE_CONFIG\.name/);
  assert.match(rootLayout, /default:\s*SITE_CONFIG\.name/);
  assert.match(rootLayout, /template:\s*`%s \| \$\{SITE_CONFIG\.name\}`/);
  assert.match(rootLayout, /description:\s*SITE_CONFIG\.tagline/);
  assert.match(rootLayout, /readTrustedLocale\(await headers\(\)\)/);
  assert.match(rootLayout, /<html[^>]*lang=\{locale\}[^>]*>/);
  assert.match(siteConfig, /locale:\s*"id"/);
});

test("administrator and authentication routes remain noindex", () => {
  for (const source of [adminLayout, authLayout]) {
    assert.match(
      source,
      /robots:\s*\{[\s\S]*?index:\s*false[\s\S]*?follow:\s*false/,
    );
  }
});

test("robots allows public pages and blocks protected surfaces", () => {
  assert.match(robotsRoute, /userAgent:\s*"\*"/);
  assert.match(robotsRoute, /allow:\s*"\/"/);

  assert.match(robotsRoute, /"\/admin"/);
  assert.match(robotsRoute, /"\/auth"/);
  assert.match(robotsRoute, /"\/login"/);
  assert.match(robotsRoute, /"\/lupa-password"/);
  assert.match(robotsRoute, /"\/reset-password"/);

  assert.doesNotMatch(robotsRoute, /"\/destinasi"/);
  assert.doesNotMatch(robotsRoute, /"\/peta-wisata"/);
  assert.doesNotMatch(robotsRoute, /"\/_next"/);
});

test("homepage advertises the implemented tourism map", () => {
  assert.match(homepage, /href="\/peta-wisata"/);
  assert.match(homepage, />\s*Buka peta wisata\s*</);

  assert.doesNotMatch(homepage, /Peta wisata belum tersedia/);
  assert.doesNotMatch(homepage, /Peta interaktif tetap ditunda/);
});

test("SEO foundation does not invent a production origin", () => {
  const metadataFoundation = `${rootLayout}\n${robotsRoute}`;

  assert.doesNotMatch(metadataFoundation, /https?:\/\//);
  assert.doesNotMatch(rootLayout, /\bmetadataBase\s*:/);
  assert.doesNotMatch(robotsRoute, /\bsitemap\s*:/);
  assert.doesNotMatch(robotsRoute, /\bhost\s*:/);
});
