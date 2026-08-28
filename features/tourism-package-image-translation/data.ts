import type { SupabaseClient } from "@supabase/supabase-js";

import { requireAdministrator } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";

import {
  isValidMediaUuid,
  MEDIA_BUCKET,
  type MediaImageRecord,
} from "../media/model";
import { createAdministratorPreviewUrl } from "../media/storage";
import { queryTourismPackageById } from "../tourism-packages/data";
import {
  isValidTourismPackageId,
  type TourismPackageStatus,
} from "../tourism-packages/model";
import {
  isTourismPackageImageTranslationRecord,
  type TourismPackageImageTranslationRecord,
  type TourismPackageImageTranslationReviewEvent,
  type TourismPackageImageTranslationSource,
} from "./model";

export type TourismPackageImageTranslationAdminItem = {
  source: TourismPackageImageTranslationSource;
  sourceStatus: TourismPackageStatus;
  translation: TourismPackageImageTranslationRecord | null;
  history: TourismPackageImageTranslationReviewEvent[];
};

export type TourismPackageImageTranslationAdminReadResult =
  | {
      success: true;
      tourismPackageId: string;
      slug: string;
      images: TourismPackageImageTranslationAdminItem[];
    }
  | { success: false; kind: "not-found" | "read-error" };

type PackageImageRow = {
  id: string;
  package_id: string;
  storage_bucket: string;
  storage_path: string;
  caption: string | null;
  alt_text: string;
  display_order: number;
  is_primary: boolean;
  created_at: string;
};

function isTrustedPackageImageRow(
  row: unknown,
  tourismPackageId: string,
): row is PackageImageRow {
  if (typeof row !== "object" || row === null) return false;
  const value = row as Record<string, unknown>;
  const id = value.id;
  const packageId = value.package_id;
  const storagePath = value.storage_path;
  const expectedPathPrefix = `tourism-package/${tourismPackageId}/${id}.`;
  return (
    typeof id === "string" &&
    isValidMediaUuid(id) &&
    packageId === tourismPackageId &&
    value.storage_bucket === MEDIA_BUCKET &&
    typeof storagePath === "string" &&
    ["jpg", "png", "webp"].some(
      (extension) => storagePath === `${expectedPathPrefix}${extension}`,
    ) &&
    (value.caption === null || typeof value.caption === "string") &&
    typeof value.alt_text === "string" &&
    value.alt_text.trim() !== "" &&
    typeof value.display_order === "number" &&
    Number.isSafeInteger(value.display_order) &&
    value.display_order >= 0 &&
    typeof value.is_primary === "boolean" &&
    typeof value.created_at === "string"
  );
}

async function queryPackageImages(
  supabase: SupabaseClient,
  tourismPackageId: string,
): Promise<MediaImageRecord[] | null> {
  const result = await supabase
    .from("package_images")
    .select(
      "id,package_id,storage_bucket,storage_path,caption,alt_text,display_order,is_primary,created_at",
    )
    .eq("package_id", tourismPackageId)
    .order("display_order", { ascending: true })
    .order("id", { ascending: true })
    .overrideTypes<PackageImageRow[], { merge: false }>();
  if (
    result.error ||
    !Array.isArray(result.data) ||
    result.data.some((row) => !isTrustedPackageImageRow(row, tourismPackageId))
  ) {
    console.error("Pembacaan gambar paket wisata gagal.", {
      code: result.error?.code ?? "malformed-source-media",
    });
    return null;
  }

  if (result.data.filter((row) => row.is_primary).length > 1) {
    console.error("Invariant primary image paket wisata dilanggar.");
    return null;
  }

  try {
    return await Promise.all(
      result.data.map(async (row) => ({
        id: row.id,
        parentId: row.package_id,
        storageBucket: row.storage_bucket,
        storagePath: row.storage_path,
        caption: row.caption,
        altText: row.alt_text,
        displayOrder: row.display_order,
        isPrimary: row.is_primary,
        createdAt: row.created_at,
        previewUrl: await createAdministratorPreviewUrl(
          supabase,
          row.storage_path,
        ),
      })),
    );
  } catch (error) {
    console.error("Pratinjau gambar paket wisata gagal dibaca.", {
      code: error instanceof Error ? "preview-read-failed" : "unknown-error",
    });
    return null;
  }
}

function isReviewEvent(
  value: unknown,
): value is TourismPackageImageTranslationReviewEvent {
  if (typeof value !== "object" || value === null) return false;
  const event = value as Record<string, unknown>;
  const eventTypes = [
    "draft_saved",
    "reviewed",
    "rejected",
    "published",
    "republished",
    "unpublished",
    "archived",
    "restored",
    "media_changed",
  ];
  const reasonIsValid =
    event.event_type === "rejected"
      ? typeof event.reason === "string" && event.reason.trim() !== ""
      : event.reason === null;
  return (
    typeof event.id === "string" &&
    isValidMediaUuid(event.id) &&
    typeof event.event_type === "string" &&
    eventTypes.includes(event.event_type) &&
    ["draft", "published", "archived"].includes(
      String(event.previous_translation_status),
    ) &&
    ["draft", "published", "archived"].includes(
      String(event.new_translation_status),
    ) &&
    ["pending", "reviewed", "rejected"].includes(
      String(event.previous_review_state),
    ) &&
    ["pending", "reviewed", "rejected"].includes(
      String(event.new_review_state),
    ) &&
    typeof event.occurred_at === "string" &&
    reasonIsValid
  );
}

function toReviewEvent(
  event: TourismPackageImageTranslationReviewEvent,
): TourismPackageImageTranslationReviewEvent {
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

async function queryImageTranslationAdminItem(
  supabase: SupabaseClient,
  source: TourismPackageImageTranslationSource,
  tourismPackageId: string,
  sourceSlug: string,
  sourceStatus: TourismPackageStatus,
): Promise<TourismPackageImageTranslationAdminItem | null> {
  const result = await supabase
    .rpc("tourism_package_image_translation_admin_read", {
      p_package_image_id: source.id,
    })
    .returns<TourismPackageImageTranslationRecord[]>();
  if (result.error) {
    console.error("Pembacaan terjemahan gambar paket wisata gagal.", {
      code: result.error.code,
    });
    return null;
  }
  const rawRows = result.data as unknown;
  const rows = rawRows === null ? [] : rawRows;
  if (
    !Array.isArray(rows) ||
    rows.length > 1 ||
    rows.some(
      (row) =>
        !isTourismPackageImageTranslationRecord(row) ||
        row.package_image_id !== source.id ||
        row.tourism_package_id !== tourismPackageId ||
        row.source_slug !== sourceSlug,
    )
  ) {
    console.error(
      "Invariant singleton terjemahan gambar paket wisata dilanggar.",
    );
    return null;
  }

  const translation = rows[0] ?? null;
  let history: TourismPackageImageTranslationReviewEvent[] = [];
  if (translation) {
    const historyResult = await supabase
      .rpc("tourism_package_image_translation_review_history", {
        p_translation_id: translation.id,
      })
      .returns<TourismPackageImageTranslationReviewEvent[]>();
    const rawHistory = historyResult.data as unknown;
    if (
      historyResult.error ||
      !Array.isArray(rawHistory) ||
      rawHistory.some((event) => !isReviewEvent(event))
    ) {
      console.error("Riwayat review gambar paket wisata gagal dibaca.", {
        code: historyResult.error?.code ?? "malformed-history",
      });
      return null;
    }
    history = rawHistory.map(toReviewEvent);
  }
  return { source, sourceStatus, translation, history };
}

export async function queryTourismPackageImageTranslationAdminData(
  supabase: SupabaseClient,
  tourismPackageId: string,
): Promise<TourismPackageImageTranslationAdminReadResult> {
  if (!isValidTourismPackageId(tourismPackageId)) {
    return { success: false, kind: "not-found" };
  }
  try {
    const packageResult = await queryTourismPackageById(
      supabase,
      tourismPackageId,
    );
    if (!packageResult.success) return { success: false, kind: "read-error" };
    if (!packageResult.tourismPackage)
      return { success: false, kind: "not-found" };
    const tourismPackage = packageResult.tourismPackage;

    const images = await queryPackageImages(supabase, tourismPackageId);
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
          tourismPackageId,
          tourismPackage.slug,
          tourismPackage.status,
        ),
      ),
    );
    if (items.some((item) => item === null)) {
      return { success: false, kind: "read-error" };
    }
    return {
      success: true,
      tourismPackageId,
      slug: tourismPackage.slug,
      images: items.filter(
        (item): item is TourismPackageImageTranslationAdminItem =>
          item !== null,
      ),
    };
  } catch (error) {
    console.error("Pembacaan gambar terjemahan paket wisata gagal.", {
      code: error instanceof Error ? "query-failed" : "unknown-error",
    });
    return { success: false, kind: "read-error" };
  }
}

export async function getTourismPackageImageTranslationAdminData(
  tourismPackageId: string,
) {
  await requireAdministrator();
  try {
    return await queryTourismPackageImageTranslationAdminData(
      await createClient(),
      tourismPackageId,
    );
  } catch (error) {
    console.error("Pembacaan gambar terjemahan paket wisata gagal.", {
      code: error instanceof Error ? "query-failed" : "unknown-error",
    });
    return { success: false as const, kind: "read-error" as const };
  }
}
