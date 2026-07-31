import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");
const data = read("features/public-domains/data.ts");
const media = read("features/public-content/server.ts");
const card = read("components/public/public-content-card.tsx");
const image = read("components/public/public-media-image.tsx");
const homepage = read("app/(public)/page.tsx");
const packageDetail = read("app/(public)/paket-wisata/[slug]/page.tsx");
const umkmDetail = read("app/(public)/umkm/[slug]/page.tsx");
const houseDetail = read("app/(public)/rumah-adat/[slug]/page.tsx");
const migration = read(
  "supabase/migrations/20260728113434_initial_application_schema.sql",
);
const domains = [
  ["paket-wisata", "tourism-package", "published_tourism_packages"],
  ["homestay", "homestay", "published_homestays"],
  ["umkm", "umkm", "published_umkms"],
  ["rumah-adat", "traditional-house", "published_traditional_houses"],
  ["acara-budaya", "cultural-event", "published_cultural_events"],
];

test("all five public list and detail routes exist", () => {
  for (const [route] of domains) {
    assert.equal(existsSync(`app/(public)/${route}/page.tsx`), true);
    assert.equal(existsSync(`app/(public)/${route}/[slug]/page.tsx`), true);
  }
});

test("all domains use published-safe views and exact federated media identities", () => {
  for (const [, entity, view] of domains) {
    assert.match(data, new RegExp(`entityType: "${entity}"`));
    assert.match(data, new RegExp(`view: "${view}"`));
  }
  assert.match(media, /signPublishedMedia/);
  assert.doesNotMatch(
    data,
    /\.from\("(?:tourism_packages|homestays|umkms|traditional_houses|cultural_events)"\)/,
  );
});

test("published views exclude lifecycle and private consent metadata", () => {
  for (const view of [
    "published_tourism_packages",
    "published_homestays",
    "published_umkms",
    "published_traditional_houses",
    "published_cultural_events",
  ]) {
    assert.match(
      migration,
      new RegExp(
        `create view public\\.${view}[\\s\\S]*?where status = 'published'`,
      ),
    );
  }
  assert.doesNotMatch(
    data,
    /contact_consent_confirmed|source_note|created_by|updated_by/,
  );
  assert.match(
    migration,
    /case when contact_consent_confirmed then phone end as phone/,
  );
  assert.match(
    migration,
    /case when contact_consent_confirmed then contact_whatsapp end as contact_whatsapp/,
  );
});

test("unknown and unpublished slugs share not-found behavior", () => {
  assert.match(data, /PUBLIC_SLUG_PATTERN/);
  for (const [route] of domains) {
    const detail = read(`app/(public)/${route}/[slug]/page.tsx`);
    assert.match(detail, /result\.kind === "not-found"/);
    assert.match(detail, /notFound\(\)/);
  }
});

test("cards are fully linked and signed images bypass optimization", () => {
  assert.match(card, /return \(\s*<Link[\s\S]*?<article/);
  assert.match(card, /focus-visible:outline/);
  assert.match(image, /<Image[\s\S]*?unoptimized/);
});

test("ordering, gallery mapping, and package destination privacy are deterministic", () => {
  assert.match(data, /order\(config\.orderColumn \?\? "display_order"/);
  assert.match(media, /order\("display_order"/);
  assert.match(data, /published_package_destinations/);
  assert.match(data, /published_destinations/);
  assert.doesNotMatch(data, /\.from\("destinations"\)/);
});

test("metadata reads do not sign or return expiring URLs", () => {
  assert.match(data, /async function metadata/);
  assert.doesNotMatch(
    data.match(
      /async function metadata[\s\S]*?export const getPublishedPackages/,
    )?.[0] ?? "",
    /loadPublishedMedia|signedUrl|storage_path/,
  );
});

test("homepage integrates all six published collections", () => {
  for (const functionName of [
    "getPublishedDestinations",
    "getPublishedPackages",
    "getPublishedHomestays",
    "getPublishedUmkms",
    "getPublishedTraditionalHouses",
    "getPublishedCulturalEvents",
  ]) {
    assert.match(homepage, new RegExp(functionName));
  }
  assert.match(homepage, /Promise\.all/);
  assert.equal((homepage.match(/getPublished\w+\(3\)/g) ?? []).length, 6);
  assert.match(data, /ordered = ordered\.limit\(limit\)/);
});

test("public domain code has no mutation, arbitrary signer, or service role", () => {
  const source = [data, media, homepage].join("\n");
  assert.doesNotMatch(
    source,
    /\.insert\(|\.update\(|\.delete\(|\.upsert\(|\.rpc\(/,
  );
  assert.doesNotMatch(source, /SERVICE_ROLE|service.?role/i);
  assert.equal(existsSync("app/api/media/sign/route.ts"), false);
});

test("published itinerary filtering stays ordered and visibly contiguous", async () => {
  const { buildPublishedItinerary } =
    await import("../features/public-domains/model.ts");
  const itinerary = buildPublishedItinerary(
    [
      { destination_id: "hidden", display_order: 0, notes: null },
      { destination_id: "second", display_order: 2, notes: "Catatan" },
      { destination_id: "first", display_order: 1, notes: null },
    ],
    [
      { id: "second", name: "Kedua", slug: "kedua" },
      { id: "first", name: "Pertama", slug: "pertama" },
    ],
  );

  assert.deepEqual(
    itinerary.map(({ id, displayOrder }) => ({ id, displayOrder })),
    [
      { id: "first", displayOrder: 1 },
      { id: "second", displayOrder: 2 },
    ],
  );
  assert.match(packageDetail, /map\(\(destination, index\)/);
  assert.match(packageDetail, /\{index \+ 1\}/);
});

test("event schedules are WITA-stable and all-day events omit artificial times", async () => {
  const { formatPublicEventSchedule } =
    await import("../features/public-domains/model.ts");
  const instant = "2026-07-30T04:00:00.000Z";

  assert.match(formatPublicEventSchedule(instant, false), /30 Juli 2026/);
  assert.match(formatPublicEventSchedule(instant, false), /12[.:]00/);
  assert.equal(formatPublicEventSchedule(instant, true), "30 Juli 2026");
});

test("media attachment orders galleries and falls back without a signed image", async () => {
  const { attachPublicMedia } =
    await import("../features/public-content/model.ts");
  const base = {
    id: "content",
    slug: "konten",
    title: "Konten",
    summary: "Ringkasan",
    eyebrow: "Kategori",
    isFeatured: false,
    displayOrder: 0,
    publishedAt: null,
  };
  const withoutMedia = attachPublicMedia(base, []);
  assert.equal(withoutMedia.primaryImage, null);
  assert.deepEqual(withoutMedia.gallery, []);

  const reference = (id, displayOrder, isPrimary) => ({
    id,
    entityType: "destination",
    parentId: "00000000-0000-4000-8000-000000000001",
    bucket: "tourism-media",
    storagePath: `destination/00000000-0000-4000-8000-000000000001/${id}.jpg`,
    altText: id,
    caption: null,
    displayOrder,
    isPrimary,
    signedUrl: null,
  });
  const second = reference("00000000-0000-4000-8000-000000000002", 2, true);
  const first = reference("00000000-0000-4000-8000-000000000003", 1, false);
  const withMedia = attachPublicMedia(base, [second, first]);
  assert.deepEqual(
    withMedia.gallery.map((image) => image.id),
    [first.id, second.id],
  );
  assert.equal(withMedia.primaryImage?.id, second.id);
});

test("schema limitations are not invented by public-domain mapping", () => {
  assert.doesNotMatch(data, /capacity|products|services|marketplace/i);
  assert.match(
    migration,
    /published_cultural_events[\s\S]*?and start_at is not null/,
  );
});

test("homepage does not disguise database failures as empty collections", () => {
  assert.match(homepage, /requirePublicItems/);
  assert.match(homepage, /result\.kind === "error"/);
  assert.match(homepage, /PUBLIC_HOMEPAGE_DESTINATIONS_UNAVAILABLE/);
  assert.doesNotMatch(
    homepage,
    /result\.kind === "ready" \? \(result\.items \?\? \[\]\) : \[\]/,
  );
});

test("optional detail sections avoid empty headings and expose package souvenir", () => {
  assert.match(
    umkmDetail,
    /\{item\.address \|\|[\s\S]*?item\.contactWhatsapp \? \(/,
  );

  assert.match(
    houseDetail,
    /\{item\.visitorInformation \|\|[\s\S]*?item\.googleMapsUrl \? \(/,
  );

  assert.match(
    packageDetail,
    /\{item\.souvenir \? \([\s\S]*?>Suvenir<[\s\S]*?\{item\.souvenir\}/,
  );
});
