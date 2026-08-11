import type { SupabaseClient } from "@supabase/supabase-js";

import { requireAdministrator } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";

import { queryMediaImages } from "../media/data";
import { queryUmkmById } from "../umkm/data";
import {
  type UmkmImageTranslationRecord,
  type UmkmImageTranslationReviewEvent,
  type UmkmImageTranslationSource,
} from "./model";
import type { UmkmStatus } from "../umkm/model";

export type UmkmImageTranslationAdminItem = {
  source: UmkmImageTranslationSource;
  sourceStatus: UmkmStatus;
  translation: UmkmImageTranslationRecord | null;
  history: UmkmImageTranslationReviewEvent[];
};

export type UmkmImageTranslationAdminReadResult =
  | {
      success: true;
      umkmId: string;
      slug: string;
      images: UmkmImageTranslationAdminItem[];
    }
  | { success: false; kind: "not-found" | "read-error" };

async function queryImageTranslationAdminItem(
  supabase: SupabaseClient,
  source: UmkmImageTranslationSource,
  sourceStatus: UmkmStatus,
): Promise<UmkmImageTranslationAdminItem | null> {
  const result = await supabase
    .rpc("umkm_image_translation_admin_read", {
      p_umkm_image_id: source.id,
    })
    .returns<UmkmImageTranslationRecord[]>();
  if (result.error) {
    console.error("Pembacaan terjemahan gambar umkm gagal.", {
      code: result.error.code,
    });
    return null;
  }
  const rows =
    (result.data as unknown as UmkmImageTranslationRecord[] | null) ?? [];
  if (
    rows.length > 1 ||
    rows.some((row) => row.locale !== "en" || row.umkm_image_id !== source.id)
  ) {
    console.error("Invariant singleton terjemahan gambar umkm dilanggar.");
    return null;
  }
  const translation = rows[0] ?? null;
  let history: UmkmImageTranslationReviewEvent[] = [];
  if (translation) {
    const historyResult = await supabase
      .rpc("umkm_image_translation_review_history", {
        p_translation_id: translation.id,
      })
      .returns<UmkmImageTranslationReviewEvent[]>();
    if (historyResult.error) {
      console.error("Riwayat review gambar umkm gagal.", {
        code: historyResult.error.code,
      });
      return null;
    }
    history = (
      (historyResult.data as unknown as
        UmkmImageTranslationReviewEvent[] | null) ?? []
    ).map((event) => ({
      id: event.id,
      event_type: event.event_type,
      previous_translation_status: event.previous_translation_status,
      new_translation_status: event.new_translation_status,
      previous_review_state: event.previous_review_state,
      new_review_state: event.new_review_state,
      occurred_at: event.occurred_at,
      reason: event.reason,
    }));
  }
  return { source, sourceStatus, translation, history };
}

export async function queryUmkmImageTranslationAdminData(
  supabase: SupabaseClient,
  umkmId: string,
): Promise<UmkmImageTranslationAdminReadResult> {
  const sourceResult = await queryUmkmById(supabase, umkmId);
  if (!sourceResult.success) return { success: false, kind: "read-error" };
  if (!sourceResult.umkm) return { success: false, kind: "not-found" };
  const sourceUmkm = sourceResult.umkm;

  const images = await queryMediaImages(supabase, "umkm", umkmId);
  if (!images) return { success: false, kind: "read-error" };

  const items = await Promise.all(
    images.map((image) =>
      queryImageTranslationAdminItem(
        supabase,
        {
          id: image.id,
          parentId: image.parentId,
          altText: image.altText,
          caption: image.caption,
          displayOrder: image.displayOrder,
          isPrimary: image.isPrimary,
          previewUrl: image.previewUrl,
          sourceSlug: sourceUmkm.slug,
          sourceRevision: sourceUmkm.source_revision,
          sourceUpdatedAt: sourceUmkm.updated_at,
        },
        sourceUmkm.status,
      ),
    ),
  );
  if (items.some((item) => item === null))
    return { success: false, kind: "read-error" };

  return {
    success: true,
    umkmId,
    slug: sourceUmkm.slug,
    images: items.filter(
      (item): item is UmkmImageTranslationAdminItem => item !== null,
    ),
  };
}

export async function getUmkmImageTranslationAdminData(umkmId: string) {
  await requireAdministrator();
  return queryUmkmImageTranslationAdminData(await createClient(), umkmId);
}
