import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";

import type { PublicMediaReference } from "@/features/public-media/model";
import { signPublishedMedia } from "@/features/public-media/server";
import { createClient } from "@/lib/supabase/server";

import {
  classifyPublishedEnglishUmkmDetail,
  mapPublishedEnglishUmkm,
  PUBLIC_UMKM_SLUG_PATTERN,
  type PublishedEnglishUmkmImageRow,
  type PublishedEnglishUmkmRow,
  type PublicEnglishUmkmDetailResult,
  type PublicEnglishUmkmListResult,
} from "./english-model";

export const PUBLISHED_ENGLISH_UMKMS_VIEW = "published_english_umkms";
export const PUBLISHED_ENGLISH_UMKM_IMAGES_VIEW =
  "published_english_umkm_images";

const PARENT_COLUMNS = [
  "id",
  "translation_id",
  "slug",
  "business_name",
  "category",
  "description",
  "address",
  "latitude",
  "longitude",
  "google_maps_url",
  "owner_name",
  "contact_name",
  "contact_phone",
  "contact_whatsapp",
  "thumbnail_bucket",
  "thumbnail_path",
  "is_featured",
  "display_order",
  "published_at",
  "translation_published_at",
].join(",");

const IMAGE_COLUMNS = [
  "id",
  "umkm_id",
  "translation_id",
  "storage_bucket",
  "storage_path",
  "alt_text",
  "caption",
  "display_order",
  "is_primary",
].join(",");

async function queryImages(
  supabase: SupabaseClient,
  umkmIds: readonly string[],
) {
  if (umkmIds.length === 0) return [];
  const { data, error } = await supabase
    .from(PUBLISHED_ENGLISH_UMKM_IMAGES_VIEW)
    .select(IMAGE_COLUMNS)
    .in("umkm_id", [...umkmIds])
    .order("display_order", { ascending: true })
    .order("id", { ascending: true })
    .overrideTypes<PublishedEnglishUmkmImageRow[], { merge: false }>();
  return error ? null : data;
}

async function enrich(
  supabase: SupabaseClient,
  rows: PublishedEnglishUmkmRow[],
) {
  const imageRows = await queryImages(
    supabase,
    rows.map((row) => row.id),
  );
  if (imageRows === null) return null;
  const references: PublicMediaReference[] = imageRows.map((image) => ({
    id: image.id,
    entityType: "umkm",
    parentId: image.umkm_id,
    bucket: image.storage_bucket as "tourism-media",
    storagePath: image.storage_path,
    caption: image.caption,
    altText: image.alt_text,
    displayOrder: image.display_order,
    isPrimary: image.is_primary,
  }));
  const signed = await signPublishedMedia(supabase, references);
  return rows
    .map((row) =>
      mapPublishedEnglishUmkm(
        row,
        signed.filter((image) => image.parentId === row.id),
      ),
    )
    .filter(
      (row): row is NonNullable<typeof row> =>
        row !== null && row.primaryImage !== null,
    );
}

async function loadList(): Promise<PublicEnglishUmkmListResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(PUBLISHED_ENGLISH_UMKMS_VIEW)
    .select(PARENT_COLUMNS)
    .order("display_order", { ascending: true })
    .order("business_name", { ascending: true })
    .order("id", { ascending: true })
    .overrideTypes<PublishedEnglishUmkmRow[], { merge: false }>();
  if (error) {
    console.error("English local-business list failed to load.", {
      code: error.code,
    });
    return { kind: "error" };
  }
  const umkms = await enrich(supabase, data);
  return umkms === null ? { kind: "error" } : { kind: "ready", umkms };
}

export const getPublishedEnglishUmkms = cache(loadList);

async function loadDetail(
  slug: string,
): Promise<PublicEnglishUmkmDetailResult> {
  if (!PUBLIC_UMKM_SLUG_PATTERN.test(slug)) return { kind: "not-found" };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(PUBLISHED_ENGLISH_UMKMS_VIEW)
    .select(PARENT_COLUMNS)
    .eq("slug", slug)
    .maybeSingle()
    .overrideTypes<PublishedEnglishUmkmRow | null, { merge: false }>();
  if (error) {
    console.error("English local-business detail failed to load.", {
      code: error.code,
    });
    return { kind: "error" };
  }
  if (!data) return { kind: "not-found" };
  const umkms = await enrich(supabase, [data]);
  if (umkms === null) return { kind: "error" };
  return classifyPublishedEnglishUmkmDetail(umkms);
}

export const getPublishedEnglishUmkmBySlug = cache(loadDetail);

async function loadMetadata(slug: string) {
  if (!PUBLIC_UMKM_SLUG_PATTERN.test(slug)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(PUBLISHED_ENGLISH_UMKMS_VIEW)
    .select("business_name,description")
    .eq("slug", slug)
    .maybeSingle()
    .overrideTypes<
      { business_name: string; description: string } | null,
      { merge: false }
    >();
  if (error || !data || !data.business_name.trim() || !data.description.trim())
    return null;
  return {
    name: data.business_name.trim(),
    description: data.description.trim(),
  };
}

export const getPublishedEnglishUmkmMetadata = cache(loadMetadata);
