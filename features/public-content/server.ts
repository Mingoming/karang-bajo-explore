import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { signPublishedMedia } from "@/features/public-media/server";
import {
  PUBLIC_MEDIA_BUCKET,
  type PublicMediaEntityType,
  type SignedPublicMedia,
} from "@/features/public-media/model";

type PublicImageRow = {
  id: string;
  storage_bucket: string;
  storage_path: string;
  caption: string | null;
  alt_text: string;
  display_order: number;
  is_primary: boolean;
} & Record<string, unknown>;

export async function loadPublishedMedia(
  supabase: SupabaseClient,
  options: {
    entityType: PublicMediaEntityType;
    view: string;
    parentForeignKey: string;
    parentIds: string[];
  },
): Promise<Map<string, SignedPublicMedia[]> | null> {
  if (options.parentIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from(options.view)
    .select(
      `id,${options.parentForeignKey},storage_bucket,storage_path,caption,alt_text,display_order,is_primary`,
    )
    .in(options.parentForeignKey, options.parentIds)
    .order("display_order", { ascending: true })
    .order("id", { ascending: true })
    .overrideTypes<PublicImageRow[], { merge: false }>();

  if (error) return null;
  const references = data.map((row) => ({
    id: row.id,
    entityType: options.entityType,
    parentId: String(row[options.parentForeignKey]),
    bucket: row.storage_bucket as typeof PUBLIC_MEDIA_BUCKET,
    storagePath: row.storage_path,
    altText: row.alt_text,
    caption: row.caption,
    displayOrder: row.display_order,
    isPrimary: row.is_primary,
  }));
  const signed = await signPublishedMedia(supabase, references);
  const grouped = new Map<string, typeof signed>();
  for (const image of signed) {
    const current = grouped.get(image.parentId) ?? [];
    current.push(image);
    grouped.set(image.parentId, current);
  }
  return grouped;
}
