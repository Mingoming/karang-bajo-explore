import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyPublishedEnglishDestinationDetail,
  mapPublishedEnglishDestination,
} from "../features/public-destinations/english-model.ts";
import {
  mapPublishedEnglishHomestay,
  classifyPublishedEnglishHomestayDetail,
} from "../features/public-homestays/english-model.ts";
import {
  classifyPublishedEnglishTraditionalHouseDetail,
  mapPublishedEnglishTraditionalHouse,
} from "../features/public-traditional-houses/english-model.ts";
import {
  classifyPublishedEnglishCulturalEventDetail,
  mapPublishedEnglishCulturalEvent,
} from "../features/public-cultural-events/english-model.ts";
import {
  classifyPublishedEnglishUmkmDetail,
  mapPublishedEnglishUmkm,
} from "../features/public-umkms/english-model.ts";

const PARENT_ID = "10000000-0000-4000-8000-000000000001";
const TRANSLATION_ID = "20000000-0000-4000-8000-000000000001";
const PRIMARY_ID = "00000000-0000-4000-8000-000000000002";
const SECONDARY_ID = "00000000-0000-4000-8000-000000000003";

const media = (entityType, primary = true, id = PRIMARY_ID) => ({
  id,
  entityType,
  parentId: PARENT_ID,
  bucket: "tourism-media",
  storagePath: `${entityType}/${PARENT_ID}/${id}.webp`,
  altText: "Approved English image alt text",
  caption: null,
  displayOrder: primary ? 0 : 1,
  isPrimary: primary,
  signedUrl: "https://signed.example.test/image",
});

const rows = {
  destination: {
    id: PARENT_ID,
    category_id: PARENT_ID,
    name: "English destination",
    slug: "english-destination",
    summary: "English destination summary",
    description: "English destination description",
    history: null,
    latitude: "-8.2",
    longitude: "116.4",
    google_maps_url: null,
    opening_hours: null,
    entrance_fee: null,
    price_note: null,
    facilities: [],
    contact_name: null,
    contact_phone: null,
    thumbnail_bucket: null,
    thumbnail_path: null,
    is_featured: false,
    display_order: 0,
    source_published_at: "2030-08-16T00:00:00.000Z",
    english_published_at: "2030-08-16T01:00:00.000Z",
  },
  homestay: {
    id: PARENT_ID,
    translation_id: TRANSLATION_ID,
    slug: "english-homestay",
    name: "English homestay",
    description: "English homestay description",
    address: null,
    price_note: null,
    facilities: [],
    price_per_night: null,
    latitude: null,
    longitude: null,
    google_maps_url: null,
    owner_name: null,
    phone: null,
    thumbnail_bucket: null,
    thumbnail_path: null,
    is_featured: false,
    display_order: 0,
    published_at: "2030-08-16T00:00:00.000Z",
    translation_published_at: "2030-08-16T01:00:00.000Z",
  },
  traditionalHouse: {
    id: PARENT_ID,
    translation_id: TRANSLATION_ID,
    slug: "english-traditional-house",
    name: "English traditional house",
    summary: null,
    description: "English traditional house description",
    history: null,
    cultural_significance: null,
    location_name: null,
    visitor_information: null,
    latitude: null,
    longitude: null,
    google_maps_url: null,
    thumbnail_bucket: null,
    thumbnail_path: null,
    is_featured: false,
    display_order: 0,
    published_at: "2030-08-16T00:00:00.000Z",
    translation_published_at: "2030-08-16T01:00:00.000Z",
  },
  culturalEvent: {
    id: PARENT_ID,
    translation_id: TRANSLATION_ID,
    slug: "english-cultural-event",
    title: "English cultural event",
    summary: null,
    description: "English cultural event description",
    event_type: null,
    start_at: "2030-08-16T00:00:00.000Z",
    end_at: null,
    all_day: true,
    date_note: null,
    location_name: null,
    address: null,
    latitude: null,
    longitude: null,
    google_maps_url: null,
    organizer: null,
    contact_phone: null,
    visitor_information: null,
    thumbnail_bucket: null,
    thumbnail_path: null,
    is_featured: false,
    published_at: "2030-08-16T00:00:00.000Z",
    translation_published_at: "2030-08-16T01:00:00.000Z",
  },
  umkm: {
    id: PARENT_ID,
    translation_id: TRANSLATION_ID,
    slug: "english-local-business",
    business_name: "English local business",
    category: "Handicrafts",
    description: "English local-business description",
    address: null,
    latitude: null,
    longitude: null,
    google_maps_url: null,
    owner_name: null,
    contact_name: null,
    contact_phone: null,
    contact_whatsapp: null,
    thumbnail_bucket: null,
    thumbnail_path: null,
    is_featured: false,
    display_order: 0,
    published_at: "2030-08-16T00:00:00.000Z",
    translation_published_at: "2030-08-16T01:00:00.000Z",
  },
};

const cases = [
  {
    name: "Destination",
    key: "destination",
    map: (row, images) => mapPublishedEnglishDestination(row, "alam", images),
    classifier: classifyPublishedEnglishDestinationDetail,
    required: ["name", "summary", "description", "slug"],
    ids: ["id", "category_id"],
    timestamps: ["source_published_at", "english_published_at"],
    hasDisplayOrder: true,
    imageEntity: "destination",
  },
  {
    name: "Homestay",
    key: "homestay",
    map: mapPublishedEnglishHomestay,
    classifier: classifyPublishedEnglishHomestayDetail,
    required: ["name", "description", "slug"],
    ids: ["id", "translation_id"],
    timestamps: ["published_at", "translation_published_at"],
    hasDisplayOrder: true,
    imageEntity: "homestay",
  },
  {
    name: "Traditional House",
    key: "traditionalHouse",
    map: mapPublishedEnglishTraditionalHouse,
    classifier: classifyPublishedEnglishTraditionalHouseDetail,
    required: ["name", "description", "slug"],
    ids: ["id", "translation_id"],
    timestamps: ["published_at", "translation_published_at"],
    hasDisplayOrder: true,
    imageEntity: "traditional-house",
  },
  {
    name: "Cultural Event",
    key: "culturalEvent",
    map: mapPublishedEnglishCulturalEvent,
    classifier: classifyPublishedEnglishCulturalEventDetail,
    required: ["title", "description", "slug", "start_at"],
    ids: ["id", "translation_id"],
    timestamps: ["published_at", "translation_published_at"],
    hasDisplayOrder: false,
    imageEntity: "cultural-event",
  },
  {
    name: "UMKM",
    key: "umkm",
    map: mapPublishedEnglishUmkm,
    classifier: classifyPublishedEnglishUmkmDetail,
    required: ["business_name", "category", "description", "slug"],
    ids: ["id", "translation_id"],
    timestamps: ["published_at", "translation_published_at"],
    hasDisplayOrder: true,
    imageEntity: "umkm",
  },
];

function assertInvalid(domain, row, images, reason) {
  assert.doesNotThrow(() => {
    assert.equal(domain.map(row, images), null, `${domain.name}: ${reason}`);
  }, `${domain.name}: malformed projection must not throw (${reason})`);
}

test("all English public mappers fail closed for malformed projection rows", () => {
  for (const domain of cases) {
    const row = rows[domain.key];
    const primary = media(domain.imageEntity);
    assert.ok(domain.map(row, [primary]), `${domain.name} valid row`);

    assertInvalid(domain, null, [primary], "null row");
    assertInvalid(domain, undefined, [primary], "undefined row");

    for (const field of domain.required) {
      for (const value of [null, undefined, "", "   \t"]) {
        assertInvalid(
          domain,
          { ...row, [field]: value },
          [primary],
          `${field}=${String(value)}`,
        );
      }
    }

    for (const field of domain.ids) {
      for (const value of [null, undefined, "not-an-id"]) {
        assertInvalid(domain, { ...row, [field]: value }, [primary], field);
      }
    }

    for (const value of ["yes", 1, null, undefined]) {
      assertInvalid(
        domain,
        { ...row, is_featured: value },
        [primary],
        "is_featured",
      );
    }

    if (domain.hasDisplayOrder) {
      for (const value of ["0", -1, 1.5, Number.NaN, null, undefined]) {
        assertInvalid(
          domain,
          { ...row, display_order: value },
          [primary],
          "display_order",
        );
      }
    }

    for (const field of domain.timestamps) {
      for (const value of ["not-a-timestamp", "2030-02-30T00:00:00.000Z"]) {
        assertInvalid(
          domain,
          { ...row, [field]: value },
          [primary],
          `${field}=${value}`,
        );
      }
    }

    for (const coordinates of [
      { latitude: "-8.2", longitude: null },
      { latitude: null, longitude: "116.4" },
      { latitude: "91", longitude: "116.4" },
      { latitude: "-8.2", longitude: "181" },
      { latitude: "Infinity", longitude: "116.4" },
    ]) {
      assertInvalid(
        domain,
        { ...row, ...coordinates },
        [primary],
        "coordinates",
      );
    }

    const duplicatePrimary = domain.map(row, [
      primary,
      media(domain.imageEntity, true, SECONDARY_ID),
    ]);
    assert.equal(duplicatePrimary, null, `${domain.name}: duplicate primary`);

    const malformedGallery = domain.map(row, [null, primary]);
    assert.ok(
      malformedGallery,
      `${domain.name}: malformed gallery item suppressed`,
    );

    const malformedPrimary = domain.map(row, [{ ...primary, signedUrl: null }]);
    assert.ok(
      malformedPrimary,
      `${domain.name}: malformed primary is not a throw`,
    );
    assert.equal(malformedPrimary.primaryImage, null);
    assert.equal(domain.classifier([malformedPrimary]).kind, "not-found");

    const unsafeMapsUrl = domain.map(
      { ...row, google_maps_url: "javascript:alert(1)" },
      [primary],
    );
    assert.equal(unsafeMapsUrl?.googleMapsUrl, null);

    assertInvalid(
      domain,
      { ...row, google_maps_url: { href: "https://unsafe.invalid" } },
      [primary],
      "google_maps_url wrong type",
    );
  }
});

test("Destination category mapping fails closed for missing or unknown taxonomy", () => {
  const row = rows.destination;
  const primary = media("destination");

  for (const categorySlug of [
    null,
    undefined,
    "unknown",
    "Alam",
    "constructor",
    "toString",
  ]) {
    assert.equal(
      mapPublishedEnglishDestination(row, categorySlug, [primary]),
      null,
      `Destination: ${String(categorySlug)} category must not be invented`,
    );
  }
});
