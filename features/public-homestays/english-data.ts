import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";

import type { PublicMediaReference } from "@/features/public-media/model";
import { signPublishedMedia } from "@/features/public-media/server";
import { createClient } from "@/lib/supabase/server";

import {
  classifyPublishedEnglishHomestayDetail,
  mapPublishedEnglishHomestay,
  PUBLIC_HOMESTAY_SLUG_PATTERN,
  type PublishedEnglishHomestayImageRow,
  type PublishedEnglishHomestayRow,
  type PublicEnglishHomestayDetailResult,
  type PublicEnglishHomestayListResult,
} from "./english-model";
import { isPublicUuid } from "../public-content/validation.ts";

export const PUBLISHED_ENGLISH_HOMESTAYS_VIEW = "published_english_homestays";
export const PUBLISHED_ENGLISH_HOMESTAY_IMAGES_VIEW =
  "published_english_homestay_images";

const PARENT_COLUMNS = [
  "id",
  "translation_id",
  "slug",
  "name",
  "description",
  "address",
  "price_note",
  "facilities",
  "price_per_night",
  "latitude",
  "longitude",
  "google_maps_url",
  "owner_name",
  "phone",
  "thumbnail_bucket",
  "thumbnail_path",
  "is_featured",
  "display_order",
  "published_at",
  "translation_published_at",
].join(",");

const IMAGE_COLUMNS = [
  "id",
  "homestay_id",
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
  homestayIds: readonly string[],
) {
  if (homestayIds.length === 0) return [];
  const { data, error } = await supabase
    .from(PUBLISHED_ENGLISH_HOMESTAY_IMAGES_VIEW)
    .select(IMAGE_COLUMNS)
    .in("homestay_id", [...homestayIds])
    .order("display_order", { ascending: true })
    .order("id", { ascending: true })
    .overrideTypes<PublishedEnglishHomestayImageRow[], { merge: false }>();
  return error || !Array.isArray(data) ? null : data;
}

async function enrich(
  supabase: SupabaseClient,
  rows: PublishedEnglishHomestayRow[],
) {
  if (!Array.isArray(rows)) return null;
  const validRows = rows.filter(
    (row): row is PublishedEnglishHomestayRow =>
      typeof row === "object" && row !== null && typeof row.id === "string",
  );

  const imageRows = await queryImages(
    supabase,
    validRows.map((row) => row.id),
  );
  if (imageRows === null) return null;
  const references: PublicMediaReference[] = imageRows.flatMap((image) => {
    if (
      !image ||
      typeof image !== "object" ||
      !isPublicUuid(image.id) ||
      !isPublicUuid(image.homestay_id) ||
      !isPublicUuid(image.translation_id)
    ) {
      return [];
    }

    return [
      {
        id: image.id,
        entityType: "homestay" as const,
        parentId: image.homestay_id,
        bucket: image.storage_bucket as "tourism-media",
        storagePath: image.storage_path,
        caption: image.caption,
        altText: image.alt_text,
        displayOrder: image.display_order,
        isPrimary: image.is_primary,
      },
    ];
  });
  const signed = await signPublishedMedia(supabase, references);
  return validRows
    .map((row) =>
      mapPublishedEnglishHomestay(
        row,
        signed.filter((image) => image.parentId === row.id),
      ),
    )
    .filter(
      (row): row is NonNullable<typeof row> =>
        row !== null && row.primaryImage !== null,
    );
}

async function loadList(): Promise<PublicEnglishHomestayListResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(PUBLISHED_ENGLISH_HOMESTAYS_VIEW)
    .select(PARENT_COLUMNS)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true })
    .order("id", { ascending: true })
    .overrideTypes<PublishedEnglishHomestayRow[], { merge: false }>();
  if (error) {
    console.error("English homestay list failed to load.", {
      code: error.code,
    });
    return { kind: "error" };
  }
  const homestays = await enrich(supabase, data);
  return homestays === null ? { kind: "error" } : { kind: "ready", homestays };
}

export const getPublishedEnglishHomestays = cache(loadList);

async function loadDetail(
  slug: string,
): Promise<PublicEnglishHomestayDetailResult> {
  if (!PUBLIC_HOMESTAY_SLUG_PATTERN.test(slug)) return { kind: "not-found" };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(PUBLISHED_ENGLISH_HOMESTAYS_VIEW)
    .select(PARENT_COLUMNS)
    .eq("slug", slug)
    .maybeSingle()
    .overrideTypes<PublishedEnglishHomestayRow | null, { merge: false }>();
  if (error) {
    console.error("English homestay detail failed to load.", {
      code: error.code,
    });
    return { kind: "error" };
  }
  if (!data) return { kind: "not-found" };
  if (typeof data !== "object") return { kind: "error" };
  const homestays = await enrich(supabase, [data]);
  if (homestays === null) return { kind: "error" };
  return classifyPublishedEnglishHomestayDetail(homestays);
}

export const getPublishedEnglishHomestayBySlug = cache(loadDetail);

async function loadMetadata(slug: string) {
  const result = await loadDetail(slug);
  if (result.kind !== "ready") return null;
  return {
    name: result.homestay.name,
    description: result.homestay.description,
  };
}

export const getPublishedEnglishHomestayMetadata = cache(loadMetadata);
