import type { SupabaseClient } from "@supabase/supabase-js";

import { requireAdministrator } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";

import {
  queryDestinationOptions,
  queryPackageRelations,
  queryTourismPackageById,
  type PackageRelationRecord,
} from "../tourism-packages/data";
import {
  isValidTourismPackageId,
  type TourismPackageRecord,
} from "../tourism-packages/model";
import { isValidDestinationId } from "../destinations/model";
import {
  isTourismPackageTranslationRecord,
  type TourismPackageTranslationItineraryItem,
  type TourismPackageTranslationRecord,
  type TourismPackageTranslationReviewEvent,
  type TourismPackageTranslationSource,
} from "./model";

export type TourismPackageTranslationAdminReadResult =
  | {
      success: true;
      source: TourismPackageTranslationSource;
      slug: string;
      translation: TourismPackageTranslationRecord | null;
      history: TourismPackageTranslationReviewEvent[];
      itinerary: TourismPackageTranslationItineraryItem[];
    }
  | {
      success: false;
      kind: "not-found" | "read-error";
      source: null;
    };

function sourceFailureResult(
  sourceResult: Awaited<ReturnType<typeof queryTourismPackageById>>,
): TourismPackageTranslationAdminReadResult {
  if (!sourceResult.success)
    return { success: false, kind: "read-error", source: null };
  return sourceResult.tourismPackage
    ? { success: false, kind: "read-error", source: null }
    : { success: false, kind: "not-found", source: null };
}

function toSource(
  source: TourismPackageRecord,
): TourismPackageTranslationSource {
  return {
    id: source.id,
    name: source.name,
    slug: source.slug,
    package_type: source.package_type,
    duration_value: source.duration_value,
    duration_unit: source.duration_unit,
    price: source.price,
    price_note: source.price_note,
    included_facilities: source.included_facilities,
    souvenir: source.souvenir,
    summary: source.summary,
    description: source.description,
    thumbnail_path: source.thumbnail_path,
    thumbnail_bucket: source.thumbnail_bucket,
    is_featured: source.is_featured,
    display_order: source.display_order,
    status: source.status,
    published_at: source.published_at,
    updated_at: source.updated_at,
    aggregate_revision: source.aggregate_revision,
  };
}

type PublishedEnglishDestinationRow = { id: string };

async function queryEnglishDestinationIds(
  supabase: SupabaseClient,
  destinationIds: readonly string[],
) {
  if (destinationIds.length === 0) return new Set<string>();
  if (destinationIds.some((id) => !isValidDestinationId(id))) return null;

  const result = await supabase
    .from("published_english_destinations")
    .select("id")
    .in("id", [...destinationIds])
    .overrideTypes<PublishedEnglishDestinationRow[], { merge: false }>();
  if (
    result.error ||
    !Array.isArray(result.data) ||
    result.data.some(
      (row) =>
        typeof row !== "object" ||
        row === null ||
        !isValidDestinationId(row.id),
    )
  ) {
    console.error("Kelayakan English Destination paket wisata gagal dibaca.", {
      code: result.error?.code ?? "malformed-projection",
    });
    return null;
  }
  return new Set(result.data.map((row) => row.id));
}

function buildItinerary(
  relations: PackageRelationRecord[],
  options: Awaited<ReturnType<typeof queryDestinationOptions>>["options"],
  englishDestinationIds: ReadonlySet<string>,
): TourismPackageTranslationItineraryItem[] | null {
  const optionById = new Map(options.map((option) => [option.id, option]));
  const seen = new Set<string>();
  const itinerary: TourismPackageTranslationItineraryItem[] = [];

  for (const relation of relations) {
    if (
      !isValidTourismPackageId(relation.id) ||
      !isValidDestinationId(relation.destinationId) ||
      !Number.isSafeInteger(relation.displayOrder) ||
      relation.displayOrder < 0 ||
      seen.has(relation.id)
    ) {
      return null;
    }
    seen.add(relation.id);
    const option = optionById.get(relation.destinationId);
    if (
      !option ||
      typeof option.name !== "string" ||
      option.name.trim() === "" ||
      !["draft", "published", "archived"].includes(option.status) ||
      typeof relation.notes !== "string"
    ) {
      return null;
    }
    itinerary.push({
      relationId: relation.id,
      destinationId: relation.destinationId,
      displayOrder: relation.displayOrder,
      notes: relation.notes,
      destinationName: option.name,
      destinationStatus: option.status,
      englishEligible: englishDestinationIds.has(relation.destinationId),
    });
  }
  return itinerary;
}

function isReviewEvent(
  value: unknown,
): value is TourismPackageTranslationReviewEvent {
  if (typeof value !== "object" || value === null) return false;
  const event = value as Record<string, unknown>;
  const statuses = ["draft", "published", "archived"];
  const reviewStates = ["pending", "reviewed", "rejected"];
  const eventTypes = [
    "draft_saved",
    "reviewed",
    "rejected",
    "published",
    "republished",
    "unpublished",
    "archived",
    "restored",
    "source_changed",
    "source_blocked",
  ];
  const reasonIsValid =
    event.event_type === "rejected" || event.event_type === "source_blocked"
      ? typeof event.reason === "string" && event.reason.trim() !== ""
      : event.reason === null;
  return (
    typeof event.id === "string" &&
    isValidTourismPackageId(event.id) &&
    typeof event.event_type === "string" &&
    eventTypes.includes(event.event_type) &&
    statuses.includes(String(event.previous_translation_status)) &&
    statuses.includes(String(event.new_translation_status)) &&
    reviewStates.includes(String(event.previous_review_state)) &&
    reviewStates.includes(String(event.new_review_state)) &&
    typeof event.occurred_at === "string" &&
    reasonIsValid
  );
}

function toReviewEvent(
  event: TourismPackageTranslationReviewEvent,
): TourismPackageTranslationReviewEvent {
  return {
    id: event.id,
    event_type: event.event_type,
    previous_translation_status: event.previous_translation_status,
    new_translation_status: event.new_translation_status,
    previous_review_state: event.previous_review_state,
    new_review_state: event.new_review_state,
    occurred_at: event.occurred_at,
    reason: event.reason,
  };
}

export async function queryTourismPackageTranslationAdminData(
  supabase: SupabaseClient,
  tourismPackageId: string,
): Promise<TourismPackageTranslationAdminReadResult> {
  if (!isValidTourismPackageId(tourismPackageId)) {
    return { success: false, kind: "not-found", source: null };
  }
  try {
    const [sourceResult, relationResult, translationResult] = await Promise.all(
      [
        queryTourismPackageById(supabase, tourismPackageId),
        queryPackageRelations(supabase, tourismPackageId),
        supabase
          .rpc("tourism_package_translation_admin_read", {
            p_tourism_package_id: tourismPackageId,
          })
          .returns<TourismPackageTranslationRecord[]>(),
      ],
    );

    if (!sourceResult.success || !sourceResult.tourismPackage) {
      return sourceFailureResult(sourceResult);
    }
    if (!relationResult.success || translationResult.error) {
      console.error("Pembacaan workspace terjemahan paket wisata gagal.", {
        relationCode: relationResult.success ? null : "relation-read-failed",
        translationCode: translationResult.error?.code ?? null,
      });
      return { success: false, kind: "read-error", source: null };
    }

    const rawRows = translationResult.data as unknown;
    const rows = rawRows === null ? [] : rawRows;
    if (
      !Array.isArray(rows) ||
      rows.length > 1 ||
      rows.some(
        (row) =>
          !isTourismPackageTranslationRecord(row) ||
          row.tourism_package_id !== tourismPackageId ||
          row.source_slug !== sourceResult.tourismPackage?.slug,
      )
    ) {
      console.error("Invariant singleton terjemahan paket wisata dilanggar.");
      return { success: false, kind: "read-error", source: null };
    }

    const destinationIds = relationResult.relations.map(
      (relation) => relation.destinationId,
    );
    const englishDestinationIds = await queryEnglishDestinationIds(
      supabase,
      destinationIds,
    );
    if (englishDestinationIds === null) {
      return { success: false, kind: "read-error", source: null };
    }
    const options = await queryDestinationOptions(supabase, destinationIds);
    if (!options.success)
      return { success: false, kind: "read-error", source: null };
    const itinerary = buildItinerary(
      relationResult.relations,
      options.options,
      englishDestinationIds,
    );
    if (itinerary === null)
      return { success: false, kind: "read-error", source: null };

    const translation = rows[0] ?? null;
    let history: TourismPackageTranslationReviewEvent[] = [];
    if (translation) {
      const historyResult = await supabase
        .rpc("tourism_package_translation_review_history", {
          p_translation_id: translation.id,
        })
        .returns<TourismPackageTranslationReviewEvent[]>();
      const rawHistory = historyResult.data as unknown;
      if (
        historyResult.error ||
        !Array.isArray(rawHistory) ||
        rawHistory.some((event) => !isReviewEvent(event))
      ) {
        console.error("Riwayat review terjemahan paket wisata gagal dibaca.", {
          code: historyResult.error?.code ?? "malformed-history",
        });
        return { success: false, kind: "read-error", source: null };
      }
      history = rawHistory.map(toReviewEvent);
    }

    return {
      success: true,
      source: toSource(sourceResult.tourismPackage),
      slug: sourceResult.tourismPackage.slug,
      translation,
      history,
      itinerary,
    };
  } catch (error) {
    console.error("Pembacaan workspace terjemahan paket wisata gagal.", {
      code: error instanceof Error ? "query-failed" : "unknown-error",
    });
    return { success: false, kind: "read-error", source: null };
  }
}

export async function getTourismPackageTranslationAdminData(
  tourismPackageId: string,
) {
  await requireAdministrator();
  try {
    return await queryTourismPackageTranslationAdminData(
      await createClient(),
      tourismPackageId,
    );
  } catch (error) {
    console.error("Pembacaan workspace terjemahan paket wisata gagal.", {
      code: error instanceof Error ? "query-failed" : "unknown-error",
    });
    return {
      success: false as const,
      kind: "read-error" as const,
      source: null,
    };
  }
}
