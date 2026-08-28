import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";

import {
  isTrustedPublicMediaReference,
  type PublicMediaReference,
} from "@/features/public-media/model";
import { signPublishedMedia } from "@/features/public-media/server";
import { createClient } from "@/lib/supabase/server";

import {
  classifyPublishedEnglishTourismPackageDetail,
  mapPublishedEnglishTourismPackage,
  mapPublishedEnglishTourismPackageItinerary,
  PUBLIC_TOURISM_PACKAGE_SLUG_PATTERN,
  type PublishedEnglishTourismPackageDestinationRow,
  type PublishedEnglishTourismPackageImageRow,
  type PublishedEnglishTourismPackageRow,
  type PublicEnglishTourismPackage,
  type PublicEnglishTourismPackageDetailResult,
  type PublicEnglishTourismPackageItineraryItem,
  type PublicEnglishTourismPackageListResult,
} from "./english-model";
import {
  isPublicUuid,
  isValidPublicDisplayOrder,
} from "@/features/public-content/validation";

export const PUBLISHED_ENGLISH_TOURISM_PACKAGES_VIEW =
  "published_english_tourism_packages";
export const PUBLISHED_ENGLISH_TOURISM_PACKAGE_IMAGES_VIEW =
  "published_english_tourism_package_images";
export const PUBLISHED_ENGLISH_TOURISM_PACKAGE_DESTINATIONS_VIEW =
  "published_english_tourism_package_destinations";

const PUBLIC_ENGLISH_TOURISM_PACKAGE_COLUMNS = [
  "id",
  "translation_id",
  "slug",
  "name",
  "package_type",
  "duration_value",
  "duration_unit",
  "price",
  "price_note",
  "included_facilities",
  "souvenir",
  "summary",
  "description",
  "thumbnail_bucket",
  "thumbnail_path",
  "is_featured",
  "display_order",
  "published_at",
  "translation_published_at",
].join(",");

const PUBLIC_ENGLISH_TOURISM_PACKAGE_IMAGE_COLUMNS = [
  "id",
  "package_id",
  "translation_id",
  "storage_bucket",
  "storage_path",
  "alt_text",
  "caption",
  "display_order",
  "is_primary",
].join(",");

const PUBLIC_ENGLISH_TOURISM_PACKAGE_DESTINATION_COLUMNS = [
  "id",
  "package_id",
  "destination_id",
  "display_order",
  "destination_name",
  "destination_slug",
].join(",");

async function queryEnglishTourismPackageImages(
  supabase: SupabaseClient,
  packageIds: readonly string[],
) {
  if (packageIds.length === 0) return [];

  const { data, error } = await supabase
    .from(PUBLISHED_ENGLISH_TOURISM_PACKAGE_IMAGES_VIEW)
    .select(PUBLIC_ENGLISH_TOURISM_PACKAGE_IMAGE_COLUMNS)
    .in("package_id", [...packageIds])
    .order("display_order", { ascending: true })
    .order("id", { ascending: true })
    .overrideTypes<
      PublishedEnglishTourismPackageImageRow[],
      { merge: false }
    >();

  return error || !Array.isArray(data) ? null : data;
}

async function queryEnglishTourismPackageDestinations(
  supabase: SupabaseClient,
  packageId: string,
) {
  const { data, error } = await supabase
    .from(PUBLISHED_ENGLISH_TOURISM_PACKAGE_DESTINATIONS_VIEW)
    .select(PUBLIC_ENGLISH_TOURISM_PACKAGE_DESTINATION_COLUMNS)
    .eq("package_id", packageId)
    .order("display_order", { ascending: true })
    .order("id", { ascending: true })
    .overrideTypes<
      PublishedEnglishTourismPackageDestinationRow[],
      { merge: false }
    >();

  return error || !Array.isArray(data) ? null : data;
}

function toTrustedPackageMediaReference(
  image: PublishedEnglishTourismPackageImageRow,
  packageIds: ReadonlySet<string>,
): PublicMediaReference | null {
  if (
    typeof image !== "object" ||
    image === null ||
    !isPublicUuid(image.id) ||
    !isPublicUuid(image.package_id) ||
    !packageIds.has(image.package_id) ||
    !isPublicUuid(image.translation_id) ||
    typeof image.storage_bucket !== "string" ||
    typeof image.storage_path !== "string" ||
    typeof image.alt_text !== "string" ||
    (image.caption !== null && typeof image.caption !== "string") ||
    !isValidPublicDisplayOrder(image.display_order) ||
    typeof image.is_primary !== "boolean"
  ) {
    return null;
  }

  const reference = {
    id: image.id,
    entityType: "tourism-package" as const,
    parentId: image.package_id,
    bucket: image.storage_bucket as "tourism-media",
    storagePath: image.storage_path,
    caption: image.caption,
    altText: image.alt_text,
    displayOrder: image.display_order,
    isPrimary: image.is_primary,
  };

  return isTrustedPublicMediaReference(reference) ? reference : null;
}

async function enrichEnglishTourismPackages(
  supabase: SupabaseClient,
  rows: PublishedEnglishTourismPackageRow[],
  itinerary: readonly PublicEnglishTourismPackageItineraryItem[] = [],
) {
  if (!Array.isArray(rows)) return null;

  const validRows = rows.filter(
    (row): row is PublishedEnglishTourismPackageRow =>
      typeof row === "object" && row !== null && typeof row.id === "string",
  );
  const packageIds = new Set(
    validRows.flatMap((row) =>
      typeof row === "object" && row !== null && isPublicUuid(row.id)
        ? [row.id]
        : [],
    ),
  );
  const imageRows = await queryEnglishTourismPackageImages(supabase, [
    ...packageIds,
  ]);
  if (imageRows === null) return null;

  const requiredMediaFailures = new Set<string>();
  const references: PublicMediaReference[] = [];
  const primaryReferenceByPackage = new Map<string, string>();
  const primaryCountByPackage = new Map<string, number>();

  for (const image of imageRows) {
    const reference = toTrustedPackageMediaReference(image, packageIds);
    if (!reference) {
      if (
        typeof image === "object" &&
        image !== null &&
        typeof image.package_id === "string" &&
        packageIds.has(image.package_id) &&
        image.is_primary === true
      ) {
        requiredMediaFailures.add(image.package_id);
      }
      continue;
    }
    references.push(reference);
    if (reference.isPrimary) {
      primaryCountByPackage.set(
        reference.parentId,
        (primaryCountByPackage.get(reference.parentId) ?? 0) + 1,
      );
      primaryReferenceByPackage.set(reference.parentId, reference.id);
    }
  }

  for (const [packageId, primaryCount] of primaryCountByPackage) {
    if (primaryCount > 1) requiredMediaFailures.add(packageId);
  }

  const signedImages = await signPublishedMedia(supabase, references);
  const signedIds = new Set(signedImages.map((image) => image.id));
  for (const [packageId, imageId] of primaryReferenceByPackage) {
    if (!signedIds.has(imageId)) requiredMediaFailures.add(packageId);
  }

  return {
    packages: validRows
      .map((row) =>
        mapPublishedEnglishTourismPackage(
          row,
          signedImages.filter((image) => image.parentId === row.id),
          itinerary,
        ),
      )
      .filter(
        (tourismPackage): tourismPackage is PublicEnglishTourismPackage =>
          tourismPackage !== null,
      ),
    requiredMediaFailures,
  };
}

async function loadPublishedEnglishTourismPackages(
  limit?: number,
): Promise<PublicEnglishTourismPackageListResult> {
  const supabase = await createClient();
  let query = supabase
    .from(PUBLISHED_ENGLISH_TOURISM_PACKAGES_VIEW)
    .select(PUBLIC_ENGLISH_TOURISM_PACKAGE_COLUMNS)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true })
    .order("id", { ascending: true });
  if (limit !== undefined) query = query.limit(limit);

  const { data, error } = await query.overrideTypes<
    PublishedEnglishTourismPackageRow[],
    { merge: false }
  >();
  if (error || !Array.isArray(data)) {
    console.error("English Tourism Package list failed to load.", {
      code: error?.code ?? "malformed-projection",
    });
    return { kind: "error" };
  }

  const enriched = await enrichEnglishTourismPackages(supabase, data);
  if (enriched === null) return { kind: "error" };

  return {
    kind: "ready",
    packages: enriched.packages.filter(
      (tourismPackage) =>
        !enriched.requiredMediaFailures.has(tourismPackage.id) &&
        tourismPackage.primaryImage !== null,
    ),
  };
}

export const getPublishedEnglishTourismPackages = cache(
  loadPublishedEnglishTourismPackages,
);

async function loadPublishedEnglishTourismPackageBySlug(
  slug: string,
): Promise<PublicEnglishTourismPackageDetailResult> {
  if (!PUBLIC_TOURISM_PACKAGE_SLUG_PATTERN.test(slug)) {
    return { kind: "not-found" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from(PUBLISHED_ENGLISH_TOURISM_PACKAGES_VIEW)
    .select(PUBLIC_ENGLISH_TOURISM_PACKAGE_COLUMNS)
    .eq("slug", slug)
    .maybeSingle()
    .overrideTypes<
      PublishedEnglishTourismPackageRow | null,
      { merge: false }
    >();

  if (error) {
    console.error("English Tourism Package detail failed to load.", {
      code: error.code,
    });
    return { kind: "error" };
  }
  if (!data) return { kind: "not-found" };
  if (typeof data !== "object") return { kind: "error" };
  if (!isPublicUuid(data.id)) return { kind: "error" };

  const destinationRows = await queryEnglishTourismPackageDestinations(
    supabase,
    data.id,
  );
  if (destinationRows === null) {
    console.error("English Tourism Package itinerary failed to load.", {
      code: "projection-read-failed",
    });
    return { kind: "error" };
  }
  const itinerary = mapPublishedEnglishTourismPackageItinerary(
    destinationRows,
    data.id,
  );
  if (itinerary === null) return { kind: "error" };

  const enriched = await enrichEnglishTourismPackages(
    supabase,
    [data],
    itinerary,
  );
  if (enriched === null) return { kind: "error" };
  if (enriched.requiredMediaFailures.has(data.id)) return { kind: "error" };
  if (enriched.packages.length !== 1) return { kind: "error" };

  return classifyPublishedEnglishTourismPackageDetail(enriched.packages);
}

export const getPublishedEnglishTourismPackageBySlug = cache(
  loadPublishedEnglishTourismPackageBySlug,
);

async function loadPublishedEnglishTourismPackageMetadata(slug: string) {
  const result = await loadPublishedEnglishTourismPackageBySlug(slug);
  if (result.kind !== "ready") return null;

  return {
    title: result.tourismPackage.name,
    description:
      result.tourismPackage.summary ?? result.tourismPackage.description,
  };
}

export const getPublishedEnglishTourismPackageMetadata = cache(
  loadPublishedEnglishTourismPackageMetadata,
);
