import type { SupabaseClient } from "@supabase/supabase-js";

import {
  queryDestinationById,
  type DestinationRecordResult,
} from "../destinations/data";
import { requireAdministrator } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";

import {
  toDestinationTranslationSource,
  type DestinationTranslationRecord,
  type DestinationTranslationPublicEligibility,
  type DestinationTranslationReviewEvent,
} from "./model";

export type DestinationTranslationAdminReadResult =
  | {
      success: true;
      source: ReturnType<typeof toDestinationTranslationSource>;
      slug: string;
      translation: DestinationTranslationRecord | null;
      history: DestinationTranslationReviewEvent[];
      publicEligibility: DestinationTranslationPublicEligibility;
    }
  | {
      success: false;
      kind: "not-found" | "read-error";
      source: null;
    };

function sourceFailureResult(
  sourceResult: DestinationRecordResult,
): DestinationTranslationAdminReadResult {
  if (!sourceResult.success) {
    return { success: false, kind: "read-error", source: null };
  }

  return sourceResult.destination
    ? { success: false, kind: "read-error", source: null }
    : { success: false, kind: "not-found", source: null };
}

export async function queryDestinationTranslationAdminData(
  supabase: SupabaseClient,
  destinationId: string,
): Promise<DestinationTranslationAdminReadResult> {
  const [sourceResult, translationResult] = await Promise.all([
    queryDestinationById(supabase, destinationId),
    supabase
      .rpc("destination_translation_admin_read", {
        p_destination_id: destinationId,
      })
      .returns<DestinationTranslationRecord[]>(),
  ]);

  if (!sourceResult.success || !sourceResult.destination) {
    return sourceFailureResult(sourceResult);
  }

  if (translationResult.error) {
    console.error("Pembacaan terjemahan destinasi gagal.", {
      code: translationResult.error.code,
    });
    return { success: false, kind: "read-error", source: null };
  }

  const translations =
    (translationResult.data as unknown as
      DestinationTranslationRecord[] | null) ?? [];

  if (
    translations.length > 1 ||
    translations.some((translation) => translation.locale !== "en")
  ) {
    console.error("Invariant singleton terjemahan destinasi dilanggar.");
    return { success: false, kind: "read-error", source: null };
  }

  const translation = translations[0] ?? null;
  let history: DestinationTranslationReviewEvent[] = [];

  if (translation) {
    const historyResult = await supabase
      .rpc("destination_translation_review_history", {
        p_translation_id: translation.id,
      })
      .returns<DestinationTranslationReviewEvent[]>();

    if (historyResult.error) {
      console.error("Riwayat review terjemahan destinasi gagal.", {
        code: historyResult.error.code,
      });
      return { success: false, kind: "read-error", source: null };
    }

    const rawHistory =
      (historyResult.data as unknown as
        DestinationTranslationReviewEvent[] | null) ?? [];
    history = rawHistory.map((event) => ({
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

  let publicEligibility: DestinationTranslationPublicEligibility = "blocked";

  if (translation?.translation_status === "published") {
    const { data: publicRow, error: publicError } = await supabase
      .from("published_english_destinations")
      .select("id")
      .eq("id", sourceResult.destination.id)
      .maybeSingle()
      .overrideTypes<{ id: string } | null, { merge: false }>();

    if (publicError) {
      console.error("Kelayakan publik terjemahan destinasi gagal dibaca.", {
        code: publicError.code,
      });
      publicEligibility = "unknown";
    } else {
      publicEligibility = publicRow ? "eligible" : "blocked";
    }
  }

  return {
    success: true,
    source: toDestinationTranslationSource(sourceResult.destination),
    slug: sourceResult.destination.slug,
    translation,
    history,
    publicEligibility,
  };
}

export async function getDestinationTranslationAdminData(
  destinationId: string,
) {
  await requireAdministrator();
  const supabase = await createClient();
  return queryDestinationTranslationAdminData(supabase, destinationId);
}
