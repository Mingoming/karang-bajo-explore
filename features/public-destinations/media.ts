import type { SupabaseClient } from "@supabase/supabase-js";

import {
  isTrustedPublishedDestinationImage,
  PUBLIC_DESTINATION_IMAGE_TTL_SECONDS,
  PUBLIC_MEDIA_BUCKET,
  type PublishedDestinationImageRow,
  type PublicDestinationImage,
} from "./model.ts";

export async function signPublishedDestinationImages(
  supabase: SupabaseClient,
  databaseImages: readonly PublishedDestinationImageRow[],
): Promise<PublicDestinationImage[]> {
  const trustedImages = databaseImages.filter(
    isTrustedPublishedDestinationImage,
  );

  if (trustedImages.length === 0) return [];

  const { data, error } = await supabase.storage
    .from(PUBLIC_MEDIA_BUCKET)
    .createSignedUrls(
      trustedImages.map((image) => image.storage_path),
      PUBLIC_DESTINATION_IMAGE_TTL_SECONDS,
    );

  if (error || !data) {
    console.error("Penandatanganan gambar destinasi publik gagal.", {
      imageCount: trustedImages.length,
      errorName: error?.name ?? "StorageError",
    });
  }

  const signedUrls = new Map(
    (data ?? []).map((item) => [item.path, item.signedUrl]),
  );

  return trustedImages.map((image) => ({
    id: image.id,
    destinationId: image.destination_id,
    storageBucket: image.storage_bucket,
    storagePath: image.storage_path,
    caption: image.caption,
    altText: image.alt_text,
    displayOrder: image.display_order,
    isPrimary: image.is_primary,
    signedUrl: signedUrls.get(image.storage_path) ?? null,
  }));
}
