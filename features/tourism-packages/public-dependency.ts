import type { SupabaseClient } from "@supabase/supabase-js";

import { revalidateEnglishTourismPackagePaths } from "../public-content/revalidation";
import { queryTourismPackageSlugsByDestinationId } from "./data";

export type RelatedTourismPackageSlugs = readonly string[] | null;

export async function captureRelatedTourismPackageSlugs(
  supabase: SupabaseClient,
  destinationId: string,
): Promise<RelatedTourismPackageSlugs> {
  try {
    const result = await queryTourismPackageSlugsByDestinationId(
      supabase,
      destinationId,
    );
    if (result.success) return result.slugs;
  } catch (error) {
    console.error("Pembacaan ketergantungan paket wisata gagal.", {
      code: error instanceof Error ? "query-failed" : "unknown-error",
    });
  }
  return null;
}

export async function revalidateRelatedTourismPackagePaths(
  supabase: SupabaseClient,
  destinationId: string,
  before: RelatedTourismPackageSlugs,
) {
  const after = await captureRelatedTourismPackageSlugs(
    supabase,
    destinationId,
  );
  const slugs = new Set<string>([...(before ?? []), ...(after ?? [])]);

  // A committed mutation must not be reported as failed because the follow-up
  // dependency read or cache invalidation was unavailable. The collection is
  // still safe to invalidate when either authoritative read failed.
  if (before === null || after === null || slugs.size > 0) {
    revalidateEnglishTourismPackagePaths([...slugs]);
  }
}
