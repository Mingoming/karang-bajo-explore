import type { SupabaseClient } from "@supabase/supabase-js";

import { requireAdministrator } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";

import { queryDestinationById } from "../destinations/data";
import { queryMediaImages } from "../media/data";
import {
  type DestinationImageTranslationRecord,
  type DestinationImageTranslationReviewEvent,
  type DestinationImageTranslationPublicEligibility,
  type DestinationImageTranslationSource,
} from "./model";

export type DestinationImageTranslationAdminItem = {
  source: DestinationImageTranslationSource;
  translation: DestinationImageTranslationRecord | null;
  history: DestinationImageTranslationReviewEvent[];
  publicEligibility: DestinationImageTranslationPublicEligibility;
};

export type DestinationImageTranslationAdminReadResult =
  | {
      success: true;
      destinationId: string;
      slug: string;
      images: DestinationImageTranslationAdminItem[];
    }
  | {
      success: false;
      kind: "not-found" | "read-error";
    };

type ImageReadResult =
  | {
      success: true;
      item: DestinationImageTranslationAdminItem;
    }
  | { success: false };

function safeHistory(events: DestinationImageTranslationReviewEvent[] | null) {
  return (events ?? []).map((event) => ({
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

async function queryImageTranslationAdminItem(
  supabase: SupabaseClient,
  source: DestinationImageTranslationSource,
): Promise<ImageReadResult> {
  const translationResult = await supabase
    .rpc("destination_image_translation_admin_read", {
      p_destination_image_id: source.id,
    })
    .returns<DestinationImageTranslationRecord[]>();

  if (translationResult.error) {
    console.error("Pembacaan terjemahan gambar destinasi gagal.", {
      code: translationResult.error.code,
    });
    return { success: false };
  }

  const translations =
    (translationResult.data as unknown as
      DestinationImageTranslationRecord[] | null) ?? [];

  if (
    translations.length > 1 ||
    translations.some(
      (translation) =>
        translation.locale !== "en" ||
        translation.destination_image_id !== source.id,
    )
  ) {
    console.error("Invariant singleton terjemahan gambar destinasi dilanggar.");
    return { success: false };
  }

  const translation = translations[0] ?? null;
  let history: DestinationImageTranslationReviewEvent[] = [];

  if (translation) {
    const historyResult = await supabase
      .rpc("destination_image_translation_review_history", {
        p_translation_id: translation.id,
      })
      .returns<DestinationImageTranslationReviewEvent[]>();

    if (historyResult.error) {
      console.error("Riwayat review gambar destinasi gagal dibaca.", {
        code: historyResult.error.code,
      });
      return { success: false };
    }

    history = safeHistory(
      (historyResult.data as unknown as
        DestinationImageTranslationReviewEvent[] | null) ?? null,
    );
  }

  let publicEligibility: DestinationImageTranslationPublicEligibility =
    "blocked";

  if (translation?.translation_status === "published") {
    const publicResult = await supabase
      .from("published_english_destination_images")
      .select("id")
      .eq("id", source.id)
      .maybeSingle()
      .overrideTypes<{ id: string } | null, { merge: false }>();

    if (publicResult.error) {
      console.error(
        "Kelayakan publik terjemahan gambar destinasi gagal dibaca.",
        { code: publicResult.error.code },
      );
      publicEligibility = "unknown";
    } else {
      publicEligibility = publicResult.data ? "eligible" : "blocked";
    }
  }

  return {
    success: true,
    item: {
      source,
      translation,
      history,
      publicEligibility,
    },
  };
}

export async function queryDestinationImageTranslationAdminData(
  supabase: SupabaseClient,
  destinationId: string,
): Promise<DestinationImageTranslationAdminReadResult> {
  const destinationResult = await queryDestinationById(supabase, destinationId);

  if (!destinationResult.success) {
    return { success: false, kind: "read-error" };
  }

  if (!destinationResult.destination) {
    return { success: false, kind: "not-found" };
  }

  const images = await queryMediaImages(supabase, "destination", destinationId);

  if (!images) {
    return { success: false, kind: "read-error" };
  }

  const items = await Promise.all(
    images.map((image) => queryImageTranslationAdminItem(supabase, image)),
  );

  if (items.some((result) => !result.success)) {
    return { success: false, kind: "read-error" };
  }

  const successfulItems = items.filter(
    (result): result is Extract<ImageReadResult, { success: true }> =>
      result.success,
  );

  return {
    success: true,
    destinationId,
    slug: destinationResult.destination.slug,
    images: successfulItems.map((result) => result.item),
  };
}

export async function getDestinationImageTranslationAdminData(
  destinationId: string,
) {
  await requireAdministrator();
  const supabase = await createClient();
  return queryDestinationImageTranslationAdminData(supabase, destinationId);
}
