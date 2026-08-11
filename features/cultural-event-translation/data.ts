import type { SupabaseClient } from "@supabase/supabase-js";

import { requireAdministrator } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";

import {
  queryCulturalEventById,
  type CulturalEventRecordResult,
} from "../cultural-events/data";
import {
  type CulturalEventTranslationRecord,
  type CulturalEventTranslationReviewEvent,
  type CulturalEventTranslationSource,
} from "./model";

export type CulturalEventTranslationAdminReadResult =
  | {
      success: true;
      source: CulturalEventTranslationSource;
      slug: string;
      translation: CulturalEventTranslationRecord | null;
      history: CulturalEventTranslationReviewEvent[];
    }
  | {
      success: false;
      kind: "not-found" | "read-error";
      source: null;
    };

function sourceFailureResult(
  sourceResult: CulturalEventRecordResult,
): CulturalEventTranslationAdminReadResult {
  if (!sourceResult.success) {
    return { success: false, kind: "read-error", source: null };
  }
  return sourceResult.event
    ? { success: false, kind: "read-error", source: null }
    : { success: false, kind: "not-found", source: null };
}

function toSource(
  source: NonNullable<
    Extract<CulturalEventRecordResult, { success: true }>["event"]
  >,
): CulturalEventTranslationSource {
  return {
    id: source.id,
    title: source.title,
    summary: source.summary,
    description: source.description,
    event_type: source.event_type,
    start_at: source.start_at,
    end_at: source.end_at,
    all_day: source.all_day,
    date_note: source.date_note,
    location_name: source.location_name,
    address: source.address,
    latitude: source.latitude,
    longitude: source.longitude,
    google_maps_url: source.google_maps_url,
    organizer: source.organizer,
    contact_phone: source.contact_phone,
    contact_consent_confirmed: source.contact_consent_confirmed,
    visitor_information: source.visitor_information,
    thumbnail_path: source.thumbnail_path,
    thumbnail_bucket: source.thumbnail_bucket,
    status: source.status,
    is_featured: source.is_featured,
    slug: source.slug,
    updated_at: source.updated_at,
  };
}

export async function queryCulturalEventTranslationAdminData(
  supabase: SupabaseClient,
  culturalEventId: string,
): Promise<CulturalEventTranslationAdminReadResult> {
  const [sourceResult, translationResult] = await Promise.all([
    queryCulturalEventById(supabase, culturalEventId),
    supabase
      .rpc("cultural_event_translation_admin_read", {
        p_cultural_event_id: culturalEventId,
      })
      .returns<CulturalEventTranslationRecord[]>(),
  ]);

  if (!sourceResult.success || !sourceResult.event) {
    return sourceFailureResult(sourceResult);
  }
  if (translationResult.error) {
    console.error("Pembacaan terjemahan acara budaya gagal.", {
      code: translationResult.error.code,
    });
    return { success: false, kind: "read-error", source: null };
  }

  const rows =
    (translationResult.data as unknown as
      CulturalEventTranslationRecord[] | null) ?? [];
  if (
    rows.length > 1 ||
    rows.some(
      (row) => row.locale !== "en" || row.cultural_event_id !== culturalEventId,
    )
  ) {
    console.error("Invariant singleton terjemahan acara budaya dilanggar.");
    return { success: false, kind: "read-error", source: null };
  }

  const translation = rows[0] ?? null;
  let history: CulturalEventTranslationReviewEvent[] = [];
  if (translation) {
    const historyResult = await supabase
      .rpc("cultural_event_translation_review_history", {
        p_translation_id: translation.id,
      })
      .returns<CulturalEventTranslationReviewEvent[]>();
    if (historyResult.error) {
      console.error("Riwayat review acara budaya gagal.", {
        code: historyResult.error.code,
      });
      return { success: false, kind: "read-error", source: null };
    }
    history =
      (historyResult.data as unknown as
        CulturalEventTranslationReviewEvent[] | null) ?? [];
  }

  return {
    success: true,
    source: toSource(sourceResult.event),
    slug: sourceResult.event.slug,
    translation,
    history,
  };
}

export async function getCulturalEventTranslationAdminData(
  culturalEventId: string,
) {
  await requireAdministrator();
  return queryCulturalEventTranslationAdminData(
    await createClient(),
    culturalEventId,
  );
}
