import type { SupabaseClient } from "@supabase/supabase-js";

import { MEDIA_BUCKET, type MediaEntityType } from "./model";

type StorageErrorShape = Error & {
  status?: number;
  statusCode?: string;
};

const UUID_IN_MESSAGE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi;
const OBJECT_PATH_IN_MESSAGE = /[a-z-]+\/[a-z0-9._/-]+/gi;

function safeStorageMessage(message: string) {
  return message
    .replace(UUID_IN_MESSAGE, "[id]")
    .replace(OBJECT_PATH_IN_MESSAGE, "[storage-object]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

export function getSafeStorageDiagnostic(error: unknown) {
  const value = error instanceof Error ? (error as StorageErrorShape) : null;
  return {
    errorClass: value?.name || "StorageError",
    storageStatus: value?.status ?? value?.statusCode ?? null,
    message: safeStorageMessage(value?.message || "Storage operation failed"),
  };
}

export function logMediaStorageFailure(
  stage: string,
  entityType: MediaEntityType,
  error: unknown,
  compensation: "not-required" | "succeeded" | "failed",
) {
  console.error("Operasi Storage media gagal.", {
    stage,
    entityType,
    ...getSafeStorageDiagnostic(error),
    compensation,
  });
}

export async function createAdministratorPreviewUrl(
  supabase: SupabaseClient,
  path: string | null,
) {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .createSignedUrl(path, 300);
  if (error) return null;
  return data.signedUrl;
}

export async function uploadMediaObject(
  supabase: SupabaseClient,
  path: string,
  file: File,
) {
  return supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
}

export async function removeMediaObject(
  supabase: SupabaseClient,
  path: string,
) {
  const { error } = await supabase.storage.from(MEDIA_BUCKET).remove([path]);
  return { success: !error, error };
}
