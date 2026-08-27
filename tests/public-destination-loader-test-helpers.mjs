import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";

import {
  classifyPublishedEnglishDestinationDetail,
  mapPublishedEnglishDestination,
} from "../features/public-destinations/english-model.ts";
import { PUBLIC_DESTINATION_SLUG_PATTERN } from "../features/public-destinations/model.ts";
import { isPublicUuid } from "../features/public-content/validation.ts";
import { isTrustedPublicMediaReference } from "../features/public-media/model.ts";

const PARENT_VIEW = "published_english_destinations";
const IMAGE_VIEW = "published_english_destination_images";
const CATEGORY_VIEW = "destination_categories";

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
    const parentIds = query.filters.find(
      ([field]) => field === "destination_id",
    )?.[1];
    const rows = Array.isArray(parentIds)
      ? runtime.imageRows.filter(
          (row) => row && parentIds.includes(row.destination_id),
        )
      : runtime.imageRows;
    return {
      data: runtime.imageError ? null : rows,
      error: runtime.imageError,
    };
  }

  if (query.table === CATEGORY_VIEW) {
    return {
      data: runtime.categoryError ? null : runtime.categoryRows,
      error: runtime.categoryError,
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

export function createEnglishDestinationLoaderRuntime({
  parentRows = [],
  imageRows = [],
  categoryRows = [
    {
      id: "10000000-0000-4000-8000-000000000001",
      slug: "alam",
      display_order: 0,
    },
  ],
  parentError = null,
  imageError = null,
  categoryError = null,
  signingFailure = false,
} = {}) {
  const runtime = {
    parentRows,
    imageRows,
    categoryRows,
    parentError,
    imageError,
    categoryError,
    signingFailure,
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

export async function loadEnglishDestinationLoaders(runtime) {
  const source = readFileSync(
    "features/public-destinations/english-data.ts",
    "utf8",
  )
    .replace(/^import\s+["']server-only["'];\s*/m, "")
    .replace(/import\s+[\s\S]*?from\s+["'][^"']+["'];\s*/g, "");
  const stripped = stripTypeScriptTypes(source, { mode: "strip" });
  const key = `__englishDestinationLoaderDeps_${Math.random()
    .toString(36)
    .slice(2)}`;
  globalThis[key] = {
    cache: (loader) => loader,
    createClient: async () => runtime.client,
    classifyPublishedEnglishDestinationDetail,
    isPublicUuid,
    mapPublishedEnglishDestination,
    PUBLIC_DESTINATION_SLUG_PATTERN,
    signPublishedMedia: async (_supabase, references) => {
      const trustedReferences = references.filter((reference) =>
        isTrustedPublicMediaReference(reference),
      );
      runtime.signedReferences.push(...trustedReferences);
      return trustedReferences.map((reference) => ({
        ...reference,
        signedUrl: runtime.signingFailure
          ? null
          : `https://signed.invalid/${reference.storagePath}`,
      }));
    },
  };

  try {
    return await import(
      `data:text/javascript;charset=utf-8,${encodeURIComponent(`const deps = globalThis.${key};
const {
  cache,
  classifyPublishedEnglishDestinationDetail,
  createClient,
  isPublicUuid,
  mapPublishedEnglishDestination,
  PUBLIC_DESTINATION_SLUG_PATTERN,
  signPublishedMedia,
} = deps;
${stripped}`)}`
    );
  } finally {
    delete globalThis[key];
  }
}

export function publishedDestinationImageRow(parentId, overrides = {}) {
  const id = "00000000-0000-4000-8000-000000000002";
  return {
    id,
    destination_id: parentId,
    storage_bucket: "tourism-media",
    storage_path: `destination/${parentId}/${id}.webp`,
    caption: "Approved English caption",
    alt_text: "Approved English alt text",
    display_order: 0,
    is_primary: true,
    ...overrides,
  };
}
