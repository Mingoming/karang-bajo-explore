import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";

import {
  classifyPublishedEnglishTourismPackageDetail,
  mapPublishedEnglishTourismPackage,
  mapPublishedEnglishTourismPackageItinerary,
  PUBLIC_TOURISM_PACKAGE_SLUG_PATTERN,
} from "../features/public-tourism-packages/english-model.ts";
import {
  isPublicUuid,
  isValidPublicDisplayOrder,
} from "../features/public-content/validation.ts";
import { isTrustedPublicMediaReference } from "../features/public-media/model.ts";

const PARENT_VIEW = "published_english_tourism_packages";
const IMAGE_VIEW = "published_english_tourism_package_images";
const DESTINATION_VIEW = "published_english_tourism_package_destinations";

function queryResult(runtime, query) {
  if (query.table === PARENT_VIEW) {
    if (query.single) {
      const slug = query.filters.find(([field]) => field === "slug")?.[1];
      return {
        data:
          runtime.parentError ||
          runtime.parentRows.find((row) => row && row.slug === slug) ||
          null,
        error: runtime.parentError,
      };
    }
    return {
      data: runtime.parentError ? null : runtime.parentRows,
      error: runtime.parentError,
    };
  }

  if (query.table === IMAGE_VIEW) {
    const packageIds = query.filters.find(
      ([field]) => field === "package_id",
    )?.[1];
    const rows = Array.isArray(packageIds)
      ? runtime.imageRows.filter(
          (row) => row && packageIds.includes(row.package_id),
        )
      : runtime.imageRows;
    return {
      data: runtime.imageError ? null : rows,
      error: runtime.imageError,
    };
  }

  if (query.table === DESTINATION_VIEW) {
    const packageId = query.filters.find(
      ([field]) => field === "package_id",
    )?.[1];
    return {
      data: runtime.destinationError
        ? null
        : runtime.destinationRows.filter(
            (row) => row && row.package_id === packageId,
          ),
      error: runtime.destinationError,
    };
  }

  throw new Error(`Unexpected public loader table: ${query.table}`);
}

function createQuery(runtime, table) {
  const query = { table, filters: [], single: false };
  const chain = {
    select(columns) {
      runtime.selects.push({ table, columns });
      return chain;
    },
    order(column, options) {
      runtime.orders.push({ table, column, options });
      return chain;
    },
    limit(value) {
      runtime.limits.push({ table, value });
      return chain;
    },
    eq(field, value) {
      query.filters.push([field, value]);
      return chain;
    },
    in(field, values) {
      query.filters.push([field, values]);
      return chain;
    },
    maybeSingle() {
      query.single = true;
      return chain;
    },
    overrideTypes() {
      return Promise.resolve(queryResult(runtime, query));
    },
  };
  return chain;
}

export function createEnglishTourismPackageLoaderRuntime({
  parentRows = [],
  imageRows = [],
  destinationRows = [],
  parentError = null,
  imageError = null,
  destinationError = null,
  signingFailureIds = [],
} = {}) {
  const runtime = {
    parentRows,
    imageRows,
    destinationRows,
    parentError,
    imageError,
    destinationError,
    signingFailureIds: new Set(signingFailureIds),
    selects: [],
    orders: [],
    limits: [],
    tables: [],
    signedReferences: [],
    client: null,
  };

  runtime.client = {
    from(table) {
      runtime.tables.push(table);
      return createQuery(runtime, table);
    },
  };

  return runtime;
}

export async function loadEnglishTourismPackageLoaders(runtime) {
  const source = readFileSync(
    "features/public-tourism-packages/english-data.ts",
    "utf8",
  )
    .replace(/^import\s+["']server-only["'];\s*/m, "")
    .replace(/import\s+[\s\S]*?from\s+["'][^"']+["'];\s*/g, "");
  const stripped = stripTypeScriptTypes(source, { mode: "strip" });
  const key = `__englishTourismPackageLoaderDeps_${Math.random()
    .toString(36)
    .slice(2)}`;
  globalThis[key] = {
    cache: (loader) => loader,
    createClient: async () => runtime.client,
    classifyPublishedEnglishTourismPackageDetail,
    isPublicUuid,
    isTrustedPublicMediaReference,
    isValidPublicDisplayOrder,
    mapPublishedEnglishTourismPackage,
    mapPublishedEnglishTourismPackageItinerary,
    PUBLIC_TOURISM_PACKAGE_SLUG_PATTERN,
    signPublishedMedia: async (_supabase, references) => {
      runtime.signedReferences.push(...references);
      return references
        .filter((reference) => !runtime.signingFailureIds.has(reference.id))
        .map((reference) => ({
          ...reference,
          signedUrl: `https://signed.invalid/${reference.storagePath}`,
        }));
    },
  };

  try {
    return await import(
      `data:text/javascript;charset=utf-8,${encodeURIComponent(`
const deps = globalThis.${key};
const {
  cache,
  classifyPublishedEnglishTourismPackageDetail,
  createClient,
  isPublicUuid,
  isTrustedPublicMediaReference,
  isValidPublicDisplayOrder,
  mapPublishedEnglishTourismPackage,
  mapPublishedEnglishTourismPackageItinerary,
  PUBLIC_TOURISM_PACKAGE_SLUG_PATTERN,
  signPublishedMedia,
} = deps;
${stripped}`)}`
    );
  } finally {
    delete globalThis[key];
  }
}

export function publishedEnglishTourismPackageRow(overrides = {}) {
  return {
    id: "10000000-0000-4000-8000-000000000001",
    translation_id: "20000000-0000-4000-8000-000000000001",
    slug: "karang-bajo-adventure",
    name: "Approved English Package",
    package_type: "standard",
    duration_value: 3,
    duration_unit: "days",
    price: 2500000,
    price_note: "Price includes local guide.",
    included_facilities: ["Boat transfer", "Local guide"],
    souvenir: "Handwoven souvenir",
    summary: "An approved English package summary.",
    description: "An approved English package description.",
    thumbnail_bucket: "tourism-media",
    thumbnail_path: null,
    is_featured: true,
    display_order: 0,
    published_at: "2030-08-15T00:00:00.000Z",
    translation_published_at: "2030-08-16T00:00:00.000Z",
    ...overrides,
  };
}

export function publishedEnglishTourismPackageImageRow(
  packageId,
  overrides = {},
) {
  return {
    id: "00000000-0000-4000-8000-000000000002",
    package_id: packageId,
    translation_id: "20000000-0000-4000-8000-000000000002",
    storage_bucket: "tourism-media",
    storage_path: `tourism-package/${packageId}/00000000-0000-4000-8000-000000000002.webp`,
    alt_text: "Approved English package image alt text",
    caption: "Approved English package image caption",
    display_order: 0,
    is_primary: true,
    ...overrides,
  };
}

export function publishedEnglishTourismPackageDestinationRow(
  packageId,
  overrides = {},
) {
  return {
    id: "30000000-0000-4000-8000-000000000001",
    package_id: packageId,
    destination_id: "40000000-0000-4000-8000-000000000001",
    display_order: 0,
    destination_name: "English Destination",
    destination_slug: "english-destination",
    ...overrides,
  };
}
