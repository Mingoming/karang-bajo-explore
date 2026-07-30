import type { SupabaseClient } from "@supabase/supabase-js";

import { requireAdministrator } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";

import {
  MEDIA_ENTITY_TYPES,
  isMediaEntityType,
  isValidMediaUuid,
  parseMediaRouteIdentity,
  type MediaEntityType,
  type MediaImageRecord,
  type MediaParentOption,
} from "./model";
import { createAdministratorPreviewUrl } from "./storage";

type EntityDataConfig = {
  parentTable: string;
  imageTable: string;
  parentForeignKey: string;
  labelColumn: string;
};

export const MEDIA_DATA_CONFIG: Record<MediaEntityType, EntityDataConfig> = {
  destination: {
    parentTable: "destinations",
    imageTable: "destination_images",
    parentForeignKey: "destination_id",
    labelColumn: "name",
  },
  "tourism-package": {
    parentTable: "tourism_packages",
    imageTable: "package_images",
    parentForeignKey: "package_id",
    labelColumn: "name",
  },
  homestay: {
    parentTable: "homestays",
    imageTable: "homestay_images",
    parentForeignKey: "homestay_id",
    labelColumn: "name",
  },
  umkm: {
    parentTable: "umkms",
    imageTable: "umkm_images",
    parentForeignKey: "umkm_id",
    labelColumn: "business_name",
  },
  "traditional-house": {
    parentTable: "traditional_houses",
    imageTable: "traditional_house_images",
    parentForeignKey: "traditional_house_id",
    labelColumn: "name",
  },
  "cultural-event": {
    parentTable: "cultural_events",
    imageTable: "cultural_event_images",
    parentForeignKey: "cultural_event_id",
    labelColumn: "title",
  },
};

type ParentRow = Record<string, unknown> & {
  id: string;
  status: "draft" | "published" | "archived";
  updated_at: string;
};
type ImageRow = {
  id: string;
  storage_bucket: string;
  storage_path: string;
  caption: string | null;
  alt_text: string;
  display_order: number;
  is_primary: boolean;
  created_at: string;
  [key: string]: unknown;
};

export async function queryMediaParents(
  supabase: SupabaseClient,
  entityType: MediaEntityType,
): Promise<MediaParentOption[] | null> {
  const config = MEDIA_DATA_CONFIG[entityType];
  const [parentResult, imageResult] = await Promise.all([
    supabase
      .from(config.parentTable)
      .select(`id,status,updated_at,${config.labelColumn}`)
      .order("updated_at", { ascending: false })
      .overrideTypes<ParentRow[], { merge: false }>(),
    supabase
      .from(config.imageTable)
      .select(`id,${config.parentForeignKey},storage_path,is_primary`)
      .overrideTypes<Array<Record<string, unknown>>, { merge: false }>(),
  ]);
  if (parentResult.error || imageResult.error) {
    console.error("Pembacaan media federasi gagal.", {
      parentCode: parentResult.error?.code ?? null,
      imageCode: imageResult.error?.code ?? null,
      entityType,
    });
    return null;
  }
  const images = imageResult.data ?? [];
  const parents = parentResult.data ?? [];
  return Promise.all(
    parents.map(async (parent) => {
      const owned = images.filter(
        (image) => image[config.parentForeignKey] === parent.id,
      );
      const primary = owned.find((image) => image.is_primary === true) ?? null;
      const primaryPath =
        typeof primary?.storage_path === "string" ? primary.storage_path : null;
      return {
        entityType,
        id: parent.id,
        label: String(parent[config.labelColumn] ?? "Tanpa nama"),
        status: parent.status,
        updatedAt: parent.updated_at,
        imageCount: owned.length,
        primaryImageId: typeof primary?.id === "string" ? primary.id : null,
        primaryPath,
        previewUrl: await createAdministratorPreviewUrl(supabase, primaryPath),
      };
    }),
  );
}

export async function queryMediaParentById(
  supabase: SupabaseClient,
  entityType: MediaEntityType,
  parentId: string,
) {
  if (!isValidMediaUuid(parentId)) return null;
  const parents = await queryMediaParents(supabase, entityType);
  if (!parents) return undefined;
  return parents.find((parent) => parent.id === parentId) ?? null;
}

export async function queryMediaImages(
  supabase: SupabaseClient,
  entityType: MediaEntityType,
  parentId: string,
): Promise<MediaImageRecord[] | null> {
  if (!isValidMediaUuid(parentId)) return [];
  const config = MEDIA_DATA_CONFIG[entityType];
  const { data, error } = await supabase
    .from(config.imageTable)
    .select(
      `id,${config.parentForeignKey},storage_bucket,storage_path,caption,alt_text,display_order,is_primary,created_at`,
    )
    .eq(config.parentForeignKey, parentId)
    .order("display_order", { ascending: true })
    .order("id", { ascending: true })
    .overrideTypes<ImageRow[], { merge: false }>();
  if (error) {
    console.error("Pembacaan gambar media gagal.", {
      code: error.code,
      entityType,
    });
    return null;
  }
  return Promise.all(
    (data ?? []).map(async (row) => ({
      id: row.id,
      parentId: String(row[config.parentForeignKey]),
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
}

export async function getAdministratorMediaOverview() {
  await requireAdministrator();
  const supabase = await createClient();
  const groups = await Promise.all(
    MEDIA_ENTITY_TYPES.map((entityType) =>
      queryMediaParents(supabase, entityType),
    ),
  );
  if (groups.some((group) => group === null))
    return { success: false as const };
  return {
    success: true as const,
    parents: groups.flatMap((group) => group ?? []),
  };
}

export async function getMediaCreateData(
  entityTypeValue?: string,
  parentIdValue?: string,
) {
  await requireAdministrator();
  const identity = parseMediaRouteIdentity(entityTypeValue, parentIdValue);
  if (!identity) return { kind: "invalid-id" as const };
  const supabase = await createClient();
  const selected = await queryMediaParentById(
    supabase,
    identity.entityType,
    identity.parentId,
  );
  if (selected === undefined) return { kind: "read-error" as const };
  if (!selected) return { kind: "not-found" as const };
  return { kind: "ready" as const, selected };
}

export async function getMediaEditorData(
  entityTypeValue: string,
  parentId: string,
  imageId: string,
) {
  await requireAdministrator();
  if (
    !isMediaEntityType(entityTypeValue) ||
    !isValidMediaUuid(parentId) ||
    !isValidMediaUuid(imageId)
  )
    return { kind: "invalid-id" as const };
  const supabase = await createClient();
  const parent = await queryMediaParentById(
    supabase,
    entityTypeValue,
    parentId,
  );
  if (parent === undefined) return { kind: "read-error" as const };
  if (!parent) return { kind: "not-found" as const };
  const images = await queryMediaImages(supabase, entityTypeValue, parent.id);
  if (!images) return { kind: "read-error" as const };
  const image = images.find((item) => item.id === imageId) ?? null;
  if (!image) return { kind: "not-found" as const };
  return { kind: "ready" as const, parent, image, images };
}
