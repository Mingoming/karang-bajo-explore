import type { SupabaseClient } from "@supabase/supabase-js";

import { MEDIA_BUCKET } from "./model";

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
  return { success: !error, code: error?.name ?? null };
}
