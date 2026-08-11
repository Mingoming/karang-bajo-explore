import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";

import {
  classifyPublishedEnglishUmkmDetail,
  mapPublishedEnglishUmkm,
  PUBLIC_UMKM_SLUG_PATTERN,
} from "../features/public-umkms/english-model.ts";

const PARENT_VIEW = "published_english_umkms";
const IMAGE_VIEW = "published_english_umkm_images";

function queryResult(runtime, query) {
  if (query.table === PARENT_VIEW) {
    if (query.single) {
      const slug = query.filters.find(([field]) => field === "slug")?.[1];
      return {
        data:
          runtime.parentError ||
          runtime.parentRows.find((row) => row.slug === slug) ||
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
    return {
      data: runtime.imageError ? null : runtime.imageRows,
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

export function createEnglishUmkmLoaderRuntime({
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

export async function loadEnglishUmkmLoaders(runtime) {
  const source = readFileSync("features/public-umkms/english-data.ts", "utf8")
    .replace(/^import\s+["']server-only["'];\s*/m, "")
    .replace(/import\s+[\s\S]*?from\s+["'][^"']+["'];\s*/g, "");
  const stripped = stripTypeScriptTypes(source, { mode: "strip" });
  const key = `__englishUmkmLoaderDeps_${Math.random().toString(36).slice(2)}`;
  globalThis[key] = {
    cache: (loader) => loader,
    createClient: async () => runtime.client,
    classifyPublishedEnglishUmkmDetail,
    mapPublishedEnglishUmkm,
    PUBLIC_UMKM_SLUG_PATTERN,
    signPublishedMedia: async (_supabase, references) => {
      runtime.signedReferences.push(...references);
      return references.map((reference) => ({
        ...reference,
        signedUrl: `signed:${reference.storagePath}`,
      }));
    },
  };

  try {
    return await import(
      `data:text/javascript;charset=utf-8,${encodeURIComponent(`const deps = globalThis.${key};
const {
  cache,
  classifyPublishedEnglishUmkmDetail,
  createClient,
  mapPublishedEnglishUmkm,
  PUBLIC_UMKM_SLUG_PATTERN,
  signPublishedMedia,
} = deps;
${stripped}`)}`
    );
  } finally {
    delete globalThis[key];
  }
}

export function publishedUmkmImageRow(parentId, overrides = {}) {
  return {
    id: "00000000-0000-4000-8000-000000000002",
    umkm_id: parentId,
    translation_id: "20000000-0000-4000-8000-000000000001",
    storage_bucket: "tourism-media",
    storage_path: `umkm/${parentId}/00000000-0000-4000-8000-000000000002.webp`,
    alt_text: "Approved English alt text",
    caption: "Approved English caption",
    display_order: 0,
    is_primary: true,
    ...overrides,
  };
}
