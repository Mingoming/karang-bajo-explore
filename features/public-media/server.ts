import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  isTrustedPublicMediaReference,
  mapPublicMediaSigningResults,
  PUBLIC_MEDIA_BUCKET,
  PUBLIC_MEDIA_TTL_SECONDS,
  type PublicMediaReference,
  type SignedPublicMedia,
} from "./model";

export async function signPublishedMedia(
  supabase: SupabaseClient,
  databaseReferences: readonly PublicMediaReference[],
): Promise<SignedPublicMedia[]> {
  const trustedReferences = databaseReferences.filter(
    isTrustedPublicMediaReference,
  );
  if (trustedReferences.length === 0) return [];

  const uniquePaths = [
    ...new Set(trustedReferences.map((reference) => reference.storagePath)),
  ];
  const { data, error } = await supabase.storage
    .from(PUBLIC_MEDIA_BUCKET)
    .createSignedUrls(uniquePaths, PUBLIC_MEDIA_TTL_SECONDS);

  if (error || !data) {
    console.error("Penandatanganan media publik gagal.", {
      mediaCount: trustedReferences.length,
      errorName: error?.name ?? "StorageError",
    });
  }

  return mapPublicMediaSigningResults(trustedReferences, data ?? []);
}
