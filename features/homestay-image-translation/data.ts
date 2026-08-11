import type { SupabaseClient } from "@supabase/supabase-js";

import { requireAdministrator } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";

import { queryMediaImages } from "../media/data";
import { queryHomestayById } from "../homestays/data";
import {
  type HomestayImageTranslationRecord,
  type HomestayImageTranslationReviewEvent,
  type HomestayImageTranslationSource,
} from "./model";
import type { HomestayStatus } from "../homestays/model";

export type HomestayImageTranslationAdminItem = {
  source: HomestayImageTranslationSource;
  sourceStatus: HomestayStatus;
  translation: HomestayImageTranslationRecord | null;
  history: HomestayImageTranslationReviewEvent[];
};

export type HomestayImageTranslationAdminReadResult =
  | {
      success: true;
      homestayId: string;
      slug: string;
      images: HomestayImageTranslationAdminItem[];
    }
  | { success: false; kind: "not-found" | "read-error" };

async function queryImageTranslationAdminItem(
  supabase: SupabaseClient,
  source: HomestayImageTranslationSource,
  sourceStatus: HomestayStatus,
): Promise<HomestayImageTranslationAdminItem | null> {
  const result = await supabase
    .rpc("homestay_image_translation_admin_read", {
      p_homestay_image_id: source.id,
    })
    .returns<HomestayImageTranslationRecord[]>();
  if (result.error) {
    console.error("Pembacaan terjemahan gambar homestay gagal.", {
      code: result.error.code,
    });
    return null;
  }
  const rows =
    (result.data as unknown as HomestayImageTranslationRecord[] | null) ?? [];
  if (
    rows.length > 1 ||
    rows.some(
      (row) => row.locale !== "en" || row.homestay_image_id !== source.id,
    )
  ) {
    console.error("Invariant singleton terjemahan gambar homestay dilanggar.");
    return null;
  }
  const translation = rows[0] ?? null;
  let history: HomestayImageTranslationReviewEvent[] = [];
  if (translation) {
    const historyResult = await supabase
      .rpc("homestay_image_translation_review_history", {
        p_translation_id: translation.id,
      })
      .returns<HomestayImageTranslationReviewEvent[]>();
    if (historyResult.error) {
      console.error("Riwayat review gambar homestay gagal.", {
        code: historyResult.error.code,
      });
      return null;
    }
    history = (
      (historyResult.data as unknown as
        HomestayImageTranslationReviewEvent[] | null) ?? []
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

export async function queryHomestayImageTranslationAdminData(
  supabase: SupabaseClient,
  homestayId: string,
): Promise<HomestayImageTranslationAdminReadResult> {
  const sourceResult = await queryHomestayById(supabase, homestayId);
  if (!sourceResult.success) return { success: false, kind: "read-error" };
  if (!sourceResult.homestay) return { success: false, kind: "not-found" };
  const sourceHomestay = sourceResult.homestay;

  const images = await queryMediaImages(supabase, "homestay", homestayId);
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
        },
        sourceHomestay.status,
      ),
    ),
  );
  if (items.some((item) => item === null))
    return { success: false, kind: "read-error" };

  return {
    success: true,
    homestayId,
    slug: sourceHomestay.slug,
    images: items.filter(
      (item): item is HomestayImageTranslationAdminItem => item !== null,
    ),
  };
}

export async function getHomestayImageTranslationAdminData(homestayId: string) {
  await requireAdministrator();
  return queryHomestayImageTranslationAdminData(
    await createClient(),
    homestayId,
  );
}
