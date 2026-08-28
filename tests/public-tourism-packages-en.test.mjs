import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import {
  formatEnglishTourismPackagePrice,
  getEnglishTourismPackageTypeLabel,
  mapPublishedEnglishTourismPackage,
} from "../features/public-tourism-packages/english-model.ts";
import {
  createEnglishTourismPackageLoaderRuntime,
  loadEnglishTourismPackageLoaders,
  publishedEnglishTourismPackageImageRow,
  publishedEnglishTourismPackageRow,
} from "./public-tourism-package-loader-test-helpers.mjs";

const read = (path) => readFileSync(path, "utf8");
const loaderSource = read("features/public-tourism-packages/english-data.ts");
const modelSource = read("features/public-tourism-packages/english-model.ts");
const listPage = read("app/en/tourism-packages/page.tsx");
const routeConfig = read("config/public-routes.ts");

const row = publishedEnglishTourismPackageRow();
const primaryImage = publishedEnglishTourismPackageImageRow(row.id);
const signedPrimaryImage = {
  id: primaryImage.id,
  entityType: "tourism-package",
  parentId: row.id,
  bucket: "tourism-media",
  storagePath: primaryImage.storage_path,
  caption: primaryImage.caption,
  altText: primaryImage.alt_text,
  displayOrder: primaryImage.display_order,
  isPrimary: true,
  signedUrl: "https://signed.invalid/primary",
};

test("English Tourism Package list and detail route contracts exist", () => {
  assert.equal(existsSync("app/en/tourism-packages/page.tsx"), true);
  assert.equal(existsSync("app/en/tourism-packages/[slug]/page.tsx"), true);
  assert.match(routeConfig, /PUBLIC_ENGLISH_TOURISM_PACKAGES_PATH/);
  assert.match(routeConfig, /PUBLIC_ENGLISH_TOURISM_PACKAGE_DETAIL_PATH/);
  assert.match(routeConfig, /\/en\/tourism-packages/);
  assert.match(routeConfig, /\/en\/tourism-packages\/\[slug\]/);
  assert.doesNotMatch(routeConfig, /\/en\/tour-packages/);
  assert.doesNotMatch(listPage, /\/en\/tour-packages/);
});

test("English Tourism Package mapper exposes translated fields and English copy", () => {
  const tourismPackage = mapPublishedEnglishTourismPackage(
    row,
    [signedPrimaryImage],
    [],
  );

  assert.equal(tourismPackage?.name, row.name);
  assert.equal(tourismPackage?.description, row.description);
  assert.equal(tourismPackage?.summary, row.summary);
  assert.equal(tourismPackage?.packageType, "standard");
  assert.deepEqual(tourismPackage?.includedFacilities, row.included_facilities);
  assert.equal(
    tourismPackage?.primaryImage?.altText,
    row.name.includes("English") ? primaryImage.alt_text : undefined,
  );
  assert.equal(tourismPackage?.itinerary.length, 0);
  assert.equal(getEnglishTourismPackageTypeLabel("budget"), "Budget");
  assert.equal(getEnglishTourismPackageTypeLabel("premium"), "Premium");
  assert.equal(
    formatEnglishTourismPackagePrice(null),
    "Price available on request",
  );
  assert.equal(formatEnglishTourismPackagePrice(0), "Free");
  assert.doesNotMatch(modelSource, /Paket Wisata|Paket wisata|paket wisata/);
});

test("English Tourism Package mapper rejects malformed required projection fields", () => {
  for (const [field, value] of [
    ["name", ""],
    ["name", "   "],
    ["description", null],
    ["slug", "not a slug"],
    ["translation_id", null],
    ["published_at", null],
    ["translation_published_at", null],
  ]) {
    assert.equal(
      mapPublishedEnglishTourismPackage(
        { ...row, [field]: value },
        [signedPrimaryImage],
        [],
      ),
      null,
      `${field}=${JSON.stringify(value)} must fail closed`,
    );
  }
});

test("English list loader reads only English projections and trusted signed media", async () => {
  for (const expectedView of [
    "published_english_tourism_packages",
    "published_english_tourism_package_images",
  ]) {
    assert.match(loaderSource, new RegExp(expectedView));
  }
  assert.match(loaderSource, /signPublishedMedia/);
  assert.match(loaderSource, /server-only/);
  for (const forbiddenSource of [
    '.from("tourism_packages")',
    '.from("tourism_package_translations")',
    '.from("package_images")',
    '.from("package_image_translations")',
    "getPublishedTourismPackages",
  ]) {
    assert.doesNotMatch(loaderSource, new RegExp(forbiddenSource));
  }

  const gallery = publishedEnglishTourismPackageImageRow(row.id, {
    id: "00000000-0000-4000-8000-000000000003",
    translation_id: "20000000-0000-4000-8000-000000000003",
    storage_path: `tourism-package/${row.id}/00000000-0000-4000-8000-000000000003.jpg`,
    alt_text: "Approved English gallery alt text",
    caption: "Approved English gallery caption",
    display_order: 1,
    is_primary: false,
  });
  const runtime = createEnglishTourismPackageLoaderRuntime({
    parentRows: [row],
    imageRows: [primaryImage, gallery],
  });
  const loaders = await loadEnglishTourismPackageLoaders(runtime);
  const result = await loaders.getPublishedEnglishTourismPackages();

  assert.equal(result.kind, "ready");
  if (result.kind !== "ready") return;
  assert.equal(result.packages.length, 1);
  assert.equal(result.packages[0].primaryImage?.altText, primaryImage.alt_text);
  assert.equal(result.packages[0].gallery[1]?.caption, gallery.caption);
  assert.deepEqual(runtime.tables, [
    "published_english_tourism_packages",
    "published_english_tourism_package_images",
  ]);
  assert.deepEqual(
    runtime.signedReferences.map((reference) => ({
      entityType: reference.entityType,
      parentId: reference.parentId,
      storagePath: reference.storagePath,
      altText: reference.altText,
      caption: reference.caption,
    })),
    [
      {
        entityType: "tourism-package",
        parentId: row.id,
        storagePath: primaryImage.storage_path,
        altText: primaryImage.alt_text,
        caption: primaryImage.caption,
      },
      {
        entityType: "tourism-package",
        parentId: row.id,
        storagePath: gallery.storage_path,
        altText: gallery.alt_text,
        caption: gallery.caption,
      },
    ],
  );
});

test("English list distinguishes empty, projection error, missing primary, and optional gallery", async () => {
  const empty = await loadEnglishTourismPackageLoaders(
    createEnglishTourismPackageLoaderRuntime(),
  );
  assert.deepEqual(await empty.getPublishedEnglishTourismPackages(), {
    kind: "ready",
    packages: [],
  });

  const failed = await loadEnglishTourismPackageLoaders(
    createEnglishTourismPackageLoaderRuntime({
      parentError: { code: "parent-query-failed" },
    }),
  );
  assert.deepEqual(await failed.getPublishedEnglishTourismPackages(), {
    kind: "error",
  });

  const missingPrimary = await loadEnglishTourismPackageLoaders(
    createEnglishTourismPackageLoaderRuntime({
      parentRows: [row],
      imageRows: [
        publishedEnglishTourismPackageImageRow(row.id, {
          is_primary: false,
        }),
      ],
    }),
  );
  assert.deepEqual(await missingPrimary.getPublishedEnglishTourismPackages(), {
    kind: "ready",
    packages: [],
  });

  const malformedPrimary = await loadEnglishTourismPackageLoaders(
    createEnglishTourismPackageLoaderRuntime({
      parentRows: [row],
      imageRows: [
        publishedEnglishTourismPackageImageRow(row.id, {
          storage_path: `tourism-package/${row.id}/../malformed.webp`,
        }),
      ],
    }),
  );
  assert.deepEqual(
    await malformedPrimary.getPublishedEnglishTourismPackages(),
    {
      kind: "ready",
      packages: [],
    },
  );

  const malformedOptionalGallery = await loadEnglishTourismPackageLoaders(
    createEnglishTourismPackageLoaderRuntime({
      parentRows: [row],
      imageRows: [
        primaryImage,
        publishedEnglishTourismPackageImageRow(row.id, {
          id: "00000000-0000-4000-8000-000000000003",
          storage_path: `tourism-package/${row.id}/../malformed.webp`,
          display_order: 1,
          is_primary: false,
        }),
      ],
    }),
  );
  const optionalResult =
    await malformedOptionalGallery.getPublishedEnglishTourismPackages();
  assert.equal(optionalResult.kind, "ready");
  if (optionalResult.kind === "ready") {
    assert.equal(optionalResult.packages.length, 1);
    assert.equal(optionalResult.packages[0].gallery.length, 1);
  }

  const duplicatePrimary = await loadEnglishTourismPackageLoaders(
    createEnglishTourismPackageLoaderRuntime({
      parentRows: [row],
      imageRows: [
        primaryImage,
        publishedEnglishTourismPackageImageRow(row.id, {
          id: "00000000-0000-4000-8000-000000000003",
          translation_id: "20000000-0000-4000-8000-000000000003",
          storage_path: `tourism-package/${row.id}/00000000-0000-4000-8000-000000000003.jpg`,
        }),
      ],
      signingFailureIds: ["00000000-0000-4000-8000-000000000003"],
    }),
  );
  assert.deepEqual(
    await duplicatePrimary.getPublishedEnglishTourismPackages(),
    {
      kind: "ready",
      packages: [],
    },
  );
});
