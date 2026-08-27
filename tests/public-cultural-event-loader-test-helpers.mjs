import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";

import {
  classifyPublishedEnglishCulturalEventDetail,
  isNonBlankEnglishCulturalEventText,
  mapPublishedEnglishCulturalEvent,
  PUBLIC_CULTURAL_EVENT_SLUG_PATTERN,
} from "../features/public-cultural-events/english-model.ts";
import { isPublicUuid } from "../features/public-content/validation.ts";

const PARENT_VIEW = "published_english_cultural_events";
const IMAGE_VIEW = "published_english_cultural_event_images";

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
      ([field]) => field === "cultural_event_id",
    )?.[1];
    const rows = Array.isArray(parentIds)
      ? runtime.imageRows.filter(
          (row) => row && parentIds.includes(row.cultural_event_id),
        )
      : runtime.imageRows;
    return {
      data: runtime.imageError ? null : rows,
      error: runtime.imageError,
    };
  }

  throw new Error(`Unexpected public loader table: ${query.table}`);
}

function createQuery(runtime, table) {
  const query = {
    table,
    filters: [],
    single: false,
  };
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

export function createEnglishCulturalEventLoaderRuntime({
  parentRows = [],
  imageRows = [],
  parentError = null,
  imageError = null,
} = {}) {
  const runtime = {
    parentRows,
    imageRows,
    parentError,
    imageError,
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

export async function loadEnglishCulturalEventLoaders(runtime) {
  const source = readFileSync(
    "features/public-cultural-events/english-data.ts",
    "utf8",
  )
    .replace(/^import\s+["']server-only["'];\s*/m, "")
    .replace(/import\s+[\s\S]*?from\s+["'][^"']+["'];\s*/g, "");
  const stripped = stripTypeScriptTypes(source, { mode: "strip" });
  const key = `__englishCulturalEventLoaderDeps_${Math.random()
    .toString(36)
    .slice(2)}`;
  globalThis[key] = {
    cache: (loader) => loader,
    createClient: async () => runtime.client,
    classifyPublishedEnglishCulturalEventDetail,
    isNonBlankEnglishCulturalEventText,
    isPublicUuid,
    mapPublishedEnglishCulturalEvent,
    PUBLIC_CULTURAL_EVENT_SLUG_PATTERN,
    signPublishedMedia: async (_supabase, references) => {
      runtime.signedReferences.push(...references);
      return references.map((reference) => ({
        ...reference,
        signedUrl: `https://signed.invalid/${reference.storagePath}`,
      }));
    },
  };

  try {
    return await import(
      `data:text/javascript;charset=utf-8,${encodeURIComponent(
        `const deps = globalThis.${key};
const {
  cache,
  classifyPublishedEnglishCulturalEventDetail,
  createClient,
  isNonBlankEnglishCulturalEventText,
  isPublicUuid,
  mapPublishedEnglishCulturalEvent,
  PUBLIC_CULTURAL_EVENT_SLUG_PATTERN,
  signPublishedMedia,
} = deps;
${stripped}`,
      )}`
    );
  } finally {
    delete globalThis[key];
  }
}

export function publishedCulturalEventImageRow(parentId, overrides = {}) {
  return {
    id: "00000000-0000-4000-8000-000000000002",
    cultural_event_id: parentId,
    translation_id: "20000000-0000-4000-8000-000000000001",
    storage_bucket: "tourism-media",
    storage_path: `cultural-event/${parentId}/00000000-0000-4000-8000-000000000002.webp`,
    alt_text: "Approved English event image alt text",
    caption: "Approved English event image caption",
    display_order: 0,
    is_primary: true,
    ...overrides,
  };
}
