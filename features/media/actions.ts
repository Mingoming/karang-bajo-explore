"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { normalizeMediaImage } from "./image-normalization";
import { queryCulturalEventById } from "@/features/cultural-events/data";
import { isValidCulturalEventSlug } from "@/features/cultural-events/model";
import { queryDestinationById } from "@/features/destinations/data";
import { isValidDestinationSlug } from "@/features/destinations/model";
import { queryTraditionalHouseById } from "@/features/traditional-houses/data";
import { isValidTraditionalHouseSlug } from "@/features/traditional-houses/model";
import { queryHomestayById } from "@/features/homestays/data";
import { isValidHomestaySlug } from "@/features/homestays/model";
import { queryUmkmById } from "@/features/umkm/data";
import { isValidUmkmSlug } from "@/features/umkm/model";
import { revalidatePublicDomainPaths } from "@/features/public-content/revalidation";
import { requireAdministrator } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";

import { queryMediaImages, queryMediaParentById } from "./data";
import { validateMediaFileField } from "./file-validation";
import {
  canAddMediaImage,
  createMediaStoragePath,
  isMediaRecordOwnedBy,
  isMediaEntityType,
  isValidMediaUuid,
  moveMediaImageToOrder,
  parseMediaRouteIdentity,
  shouldMakeMediaPrimary,
  validateTrustedMediaFormData,
  type MediaActionState,
  type MediaFormValues,
} from "./model";
import {
  logMediaStorageFailure,
  removeMediaObject,
  uploadMediaObject,
} from "./storage";

const LIST_PATH = "/admin/media";

function revalidateEnglishDestinationPaths(
  trustedDestinationSlug: string | null,
) {
  if (
    !trustedDestinationSlug ||
    !isValidDestinationSlug(trustedDestinationSlug)
  ) {
    return;
  }
  revalidatePublicDomainPaths("destination", [trustedDestinationSlug]);
}

function revalidateEnglishTraditionalHousePaths(
  trustedTraditionalHouseSlug: string | null,
) {
  if (
    !trustedTraditionalHouseSlug ||
    !isValidTraditionalHouseSlug(trustedTraditionalHouseSlug)
  ) {
    return;
  }
  revalidatePublicDomainPaths("traditionalHouse", [
    trustedTraditionalHouseSlug,
  ]);
}

function revalidateHomestayPaths(trustedHomestaySlug: string | null) {
  if (!trustedHomestaySlug || !isValidHomestaySlug(trustedHomestaySlug)) {
    return;
  }
  revalidatePublicDomainPaths("homestay", [trustedHomestaySlug]);
}

function revalidateEnglishUmkmPaths(trustedUmkmSlug: string | null) {
  if (!trustedUmkmSlug || !isValidUmkmSlug(trustedUmkmSlug)) {
    return;
  }
  revalidatePublicDomainPaths("umkm", [trustedUmkmSlug]);
}

function revalidateEnglishCulturalEventPaths(
  trustedCulturalEventSlug: string | null,
) {
  if (
    !trustedCulturalEventSlug ||
    !isValidCulturalEventSlug(trustedCulturalEventSlug)
  ) {
    return;
  }
  revalidatePublicDomainPaths("culturalEvent", [trustedCulturalEventSlug]);
}

function nextState(
  previous: MediaActionState,
  state: Omit<MediaActionState, "revision">,
): MediaActionState {
  return { ...state, revision: previous.revision + 1 };
}

function failure(
  previous: MediaActionState,
  values: MediaFormValues,
  kind: MediaActionState["kind"],
  message: string,
) {
  return nextState(previous, {
    kind,
    values,
    fieldErrors: {},
    formErrors: [],
    message,
  });
}

function validationFailure(
  previous: MediaActionState,
  validation: Extract<
    ReturnType<typeof validateTrustedMediaFormData>,
    { success: false }
  >,
  fileError?: string,
) {
  return nextState(previous, {
    kind: "validation-error",
    values: validation.values,
    fieldErrors: {
      ...validation.fieldErrors,
      ...(fileError ? { file: fileError } : {}),
    },
    formErrors: validation.formErrors,
    message: "Periksa kembali data media yang ditandai.",
  });
}

function mediaEditPath(
  entityType: string,
  parentId: string,
  imageId: string,
  success?: string,
) {
  const query = new URLSearchParams({ entityType, parentId });
  if (success) query.set("success", success);
  return `${LIST_PATH}/${imageId}/edit?${query.toString()}`;
}

function mediaGalleryPath(
  entityType: string,
  parentId: string,
  success?: string,
) {
  const query = new URLSearchParams({
    entityType,
    parentId,
  });

  if (success) {
    query.set("success", success);
  }

  return `${LIST_PATH}/kelola?${query.toString()}`;
}

async function readTrustedContext(entityType: string, parentId: string) {
  if (!isMediaEntityType(entityType) || !isValidMediaUuid(parentId))
    return { kind: "not-found" as const };
  const supabase = await createClient();
  const parent = await queryMediaParentById(supabase, entityType, parentId);
  if (parent === undefined) return { kind: "database-error" as const };
  if (!parent) return { kind: "not-found" as const };
  const images = await queryMediaImages(supabase, entityType, parent.id);
  if (!images) return { kind: "database-error" as const };

  let destinationSlug: string | null = null;
  let homestaySlug: string | null = null;
  let umkmSlug: string | null = null;
  let traditionalHouseSlug: string | null = null;
  let culturalEventSlug: string | null = null;
  if (entityType === "destination") {
    const destinationResult = await queryDestinationById(supabase, parent.id);
    if (!destinationResult.success) return { kind: "database-error" as const };
    if (!destinationResult.destination) return { kind: "not-found" as const };
    destinationSlug = destinationResult.destination.slug;
  } else if (entityType === "homestay") {
    const homestayResult = await queryHomestayById(supabase, parent.id);
    if (!homestayResult.success) return { kind: "database-error" as const };
    if (!homestayResult.homestay) return { kind: "not-found" as const };
    homestaySlug = homestayResult.homestay.slug;
  } else if (entityType === "traditional-house") {
    const traditionalHouseResult = await queryTraditionalHouseById(
      supabase,
      parent.id,
    );
    if (!traditionalHouseResult.success)
      return { kind: "database-error" as const };
    if (!traditionalHouseResult.house) return { kind: "not-found" as const };
    traditionalHouseSlug = traditionalHouseResult.house.slug;
  } else if (entityType === "cultural-event") {
    const culturalEventResult = await queryCulturalEventById(
      supabase,
      parent.id,
    );
    if (!culturalEventResult.success)
      return { kind: "database-error" as const };
    if (!culturalEventResult.event) return { kind: "not-found" as const };
    culturalEventSlug = culturalEventResult.event.slug;
  } else if (entityType === "umkm") {
    const umkmResult = await queryUmkmById(supabase, parent.id);
    if (!umkmResult.success) return { kind: "database-error" as const };
    if (!umkmResult.umkm) return { kind: "not-found" as const };
    umkmSlug = umkmResult.umkm.slug;
  }

  return {
    kind: "ready" as const,
    supabase,
    parent,
    images,
    destinationSlug,
    homestaySlug,
    traditionalHouseSlug,
    culturalEventSlug,
    umkmSlug,
  };
}

export async function createMedia(
  entityType: string,
  parentId: string,
  previous: MediaActionState,
  formData: FormData,
): Promise<MediaActionState> {
  await requireAdministrator();
  const identity = parseMediaRouteIdentity(entityType, parentId);
  if (!identity)
    return failure(
      previous,
      previous.values,
      "not-found",
      "Induk konten tidak ditemukan.",
    );
  const validation = validateTrustedMediaFormData(formData, identity);
  const fileValidation = await validateMediaFileField(formData, true);
  if (!validation.success)
    return validationFailure(
      previous,
      validation,
      fileValidation.success ? undefined : fileValidation.error,
    );
  if (
    !fileValidation.success ||
    !fileValidation.file ||
    !fileValidation.extension
  ) {
    return nextState(previous, {
      kind: "validation-error",
      values: validation.values,
      fieldErrors: {
        file: fileValidation.success
          ? "Pilih berkas gambar."
          : fileValidation.error,
      },
      formErrors: [],
      message: "Periksa kembali berkas gambar.",
    });
  }

  const context = await readTrustedContext(
    identity.entityType,
    identity.parentId,
  );
  if (context.kind !== "ready")
    return failure(
      previous,
      validation.values,
      context.kind,
      context.kind === "not-found"
        ? "Induk konten tidak ditemukan."
        : "Data media belum dapat dimuat. Silakan coba lagi.",
    );
  if (!canAddMediaImage(context.images.length)) {
    return nextState(previous, {
      kind: "validation-error",
      values: validation.values,
      fieldErrors: {
        file: "Satu konten hanya dapat memiliki maksimal 10 gambar.",
      },
      formErrors: [],
      message: "Batas jumlah gambar telah tercapai.",
    });
  }
  const normalized = await normalizeMediaImage(fileValidation.file);

  if (!normalized.success) {
    return nextState(previous, {
      kind: "validation-error",
      values: validation.values,
      fieldErrors: {
        file: normalized.error,
      },
      formErrors: [],
      message: "Gambar belum dapat diproses.",
    });
  }

  const imageId = crypto.randomUUID();

  const path = createMediaStoragePath(
    context.parent.entityType,
    context.parent.id,
    imageId,
    normalized.image.extension,
  );

  const orderedIds = moveMediaImageToOrder(
    [...context.images.map((image) => image.id), imageId],
    imageId,
    validation.data.displayOrder,
  );

  if (!orderedIds) {
    return failure(
      previous,
      validation.values,
      "database-error",
      "Susunan media tidak valid.",
    );
  }

  const upload = await uploadMediaObject(
    context.supabase,
    path,
    normalized.image.file,
  );
  if (upload.error) {
    logMediaStorageFailure(
      "upload-new-object",
      context.parent.entityType,
      upload.error,
      "not-required",
    );
    return failure(
      previous,
      validation.values,
      "storage-error",
      "Gambar belum dapat diunggah. Silakan coba lagi.",
    );
  }
  const { error } = await context.supabase.rpc("media_insert", {
    p_entity_type: context.parent.entityType,
    p_parent_id: context.parent.id,
    p_image_id: imageId,
    p_storage_path: path,
    p_alt_text: validation.data.altText,
    p_caption: validation.data.caption,
    p_display_order: validation.data.displayOrder,
    p_is_primary: shouldMakeMediaPrimary(
      context.images.length,
      validation.data.isPrimary,
    ),
    p_image_ids: orderedIds,
  });
  if (error) {
    const cleanup = await removeMediaObject(context.supabase, path);
    console.error("Penyimpanan metadata media gagal.", {
      code: error.code,
      compensation: cleanup.success ? "succeeded" : "failed",
      entityType: context.parent.entityType,
    });
    if (!cleanup.success)
      logMediaStorageFailure(
        "compensate-new-object",
        context.parent.entityType,
        cleanup.error,
        "failed",
      );
    return failure(
      previous,
      validation.values,
      "database-error",
      "Media belum dapat disimpan. Tidak ada penyimpanan yang dilaporkan berhasil.",
    );
  }

  revalidatePath(LIST_PATH);
  revalidatePath(`${LIST_PATH}/kelola`);
  revalidateEnglishDestinationPaths(context.destinationSlug);
  revalidateHomestayPaths(context.homestaySlug);
  revalidateEnglishTraditionalHousePaths(context.traditionalHouseSlug);
  revalidateEnglishCulturalEventPaths(context.culturalEventSlug);
  revalidateEnglishUmkmPaths(context.umkmSlug);
  redirect(
    mediaGalleryPath(context.parent.entityType, context.parent.id, "created"),
  );
}

export async function updateMedia(
  entityType: string,
  parentId: string,
  imageId: string,
  previous: MediaActionState,
  formData: FormData,
): Promise<MediaActionState> {
  await requireAdministrator();
  const identity = parseMediaRouteIdentity(entityType, parentId);
  if (!identity || !isValidMediaUuid(imageId))
    return failure(
      previous,
      previous.values,
      "not-found",
      "Media tidak ditemukan. Muat ulang halaman daftar.",
    );
  const validation = validateTrustedMediaFormData(formData, identity);
  const fileValidation = await validateMediaFileField(formData, false);
  if (!validation.success)
    return validationFailure(
      previous,
      validation,
      fileValidation.success ? undefined : fileValidation.error,
    );
  if (!fileValidation.success) {
    return nextState(previous, {
      kind: "validation-error",
      values: validation.values,
      fieldErrors: { file: fileValidation.error },
      formErrors: [],
      message: "Periksa kembali berkas pengganti.",
    });
  }
  const context = await readTrustedContext(
    identity.entityType,
    identity.parentId,
  );
  if (context.kind !== "ready")
    return failure(
      previous,
      validation.values,
      context.kind,
      context.kind === "not-found"
        ? "Media tidak ditemukan."
        : "Data media belum dapat dimuat.",
    );
  const image = context.images.find(
    (item) => item.id === imageId && isMediaRecordOwnedBy(item, identity),
  );
  if (!image)
    return failure(
      previous,
      validation.values,
      "not-found",
      "Media tidak ditemukan.",
    );
  const orderedIds = moveMediaImageToOrder(
    context.images.map((item) => item.id),
    image.id,
    validation.data.displayOrder,
  );
  if (!orderedIds)
    return failure(
      previous,
      validation.values,
      "database-error",
      "Susunan media tidak valid.",
    );

  if (!fileValidation.file || !fileValidation.extension) {
    const { error } = await context.supabase.rpc("media_update", {
      p_entity_type: context.parent.entityType,
      p_parent_id: context.parent.id,
      p_image_id: image.id,
      p_alt_text: validation.data.altText,
      p_caption: validation.data.caption,
      p_display_order: validation.data.displayOrder,
      p_is_primary: validation.data.isPrimary,
      p_image_ids: orderedIds,
    });
    if (error) {
      console.error("Pembaruan metadata media gagal.", {
        code: error.code,
        entityType: context.parent.entityType,
      });
      return failure(
        previous,
        validation.values,
        "database-error",
        "Perubahan media belum dapat disimpan.",
      );
    }
    revalidateEnglishDestinationPaths(context.destinationSlug);
    revalidateHomestayPaths(context.homestaySlug);
    revalidateEnglishTraditionalHousePaths(context.traditionalHouseSlug);
    revalidateEnglishCulturalEventPaths(context.culturalEventSlug);
    revalidateEnglishUmkmPaths(context.umkmSlug);
  } else {
    const normalized = await normalizeMediaImage(fileValidation.file);

    if (!normalized.success) {
      return nextState(previous, {
        kind: "validation-error",
        values: validation.values,
        fieldErrors: {
          file: normalized.error,
        },
        formErrors: [],
        message: "Gambar pengganti belum dapat diproses.",
      });
    }
    const replacementId = crypto.randomUUID();
    const newPath = createMediaStoragePath(
      context.parent.entityType,
      context.parent.id,
      replacementId,
      normalized.image.extension,
    );
    const upload = await uploadMediaObject(
      context.supabase,
      newPath,
      normalized.image.file,
    );
    if (upload.error) {
      logMediaStorageFailure(
        "upload-replacement-object",
        context.parent.entityType,
        upload.error,
        "not-required",
      );
      return failure(
        previous,
        validation.values,
        "storage-error",
        "Gambar pengganti belum dapat diunggah.",
      );
    }
    const { data: oldPath, error } = await context.supabase.rpc(
      "media_replace",
      {
        p_entity_type: context.parent.entityType,
        p_parent_id: context.parent.id,
        p_image_id: image.id,
        p_storage_path: newPath,
        p_alt_text: validation.data.altText,
        p_caption: validation.data.caption,
        p_display_order: validation.data.displayOrder,
        p_is_primary: validation.data.isPrimary,
        p_image_ids: orderedIds,
      },
    );
    if (error || typeof oldPath !== "string") {
      const cleanup = await removeMediaObject(context.supabase, newPath);
      console.error("Penggantian metadata media gagal.", {
        code: error?.code ?? "invalid-response",
        compensation: cleanup.success ? "succeeded" : "failed",
        entityType: context.parent.entityType,
      });
      if (!cleanup.success)
        logMediaStorageFailure(
          "compensate-replacement-object",
          context.parent.entityType,
          cleanup.error,
          "failed",
        );
      return failure(
        previous,
        validation.values,
        "database-error",
        "Penggantian media belum dapat disimpan.",
      );
    }
    revalidateEnglishDestinationPaths(context.destinationSlug);
    revalidateHomestayPaths(context.homestaySlug);
    revalidateEnglishTraditionalHousePaths(context.traditionalHouseSlug);
    revalidateEnglishCulturalEventPaths(context.culturalEventSlug);
    revalidateEnglishUmkmPaths(context.umkmSlug);
    const oldCleanup = await removeMediaObject(context.supabase, oldPath);
    if (!oldCleanup.success) {
      logMediaStorageFailure(
        "remove-replaced-object",
        context.parent.entityType,
        oldCleanup.error,
        "failed",
      );
      return failure(
        previous,
        validation.values,
        "storage-error",
        "Perubahan tersimpan, tetapi pembersihan berkas lama belum selesai. Hubungi pengelola sistem.",
      );
    }
  }

  revalidatePath(LIST_PATH);
  revalidatePath(`${LIST_PATH}/${image.id}/edit`);
  redirect(
    mediaEditPath(
      context.parent.entityType,
      context.parent.id,
      image.id,
      "updated",
    ),
  );
}

export async function deleteMedia(
  entityType: string,
  parentId: string,
  imageId: string,
  previous: MediaActionState,
): Promise<MediaActionState> {
  await requireAdministrator();
  if (
    !isMediaEntityType(entityType) ||
    !isValidMediaUuid(parentId) ||
    !isValidMediaUuid(imageId)
  ) {
    return failure(
      previous,
      previous.values,
      "not-found",
      "Media tidak ditemukan.",
    );
  }
  const context = await readTrustedContext(entityType, parentId);
  if (
    context.kind !== "ready" ||
    !context.images.some(
      (image) =>
        image.id === imageId &&
        isMediaRecordOwnedBy(image, {
          entityType: context.parent.entityType,
          parentId: context.parent.id,
        }),
    )
  ) {
    return failure(
      previous,
      previous.values,
      context.kind === "database-error" ? "database-error" : "not-found",
      context.kind === "database-error"
        ? "Data media belum dapat dimuat."
        : "Media tidak ditemukan.",
    );
  }
  const { data: oldPath, error } = await context.supabase.rpc("media_delete", {
    p_entity_type: context.parent.entityType,
    p_parent_id: context.parent.id,
    p_image_id: imageId,
  });
  if (error || typeof oldPath !== "string") {
    console.error("Penghapusan metadata media gagal.", {
      code: error?.code ?? "invalid-response",
      entityType: context.parent.entityType,
    });
    return failure(
      previous,
      previous.values,
      "database-error",
      "Media belum dapat dihapus.",
    );
  }
  revalidateEnglishDestinationPaths(context.destinationSlug);
  revalidateHomestayPaths(context.homestaySlug);
  revalidateEnglishTraditionalHousePaths(context.traditionalHouseSlug);
  revalidateEnglishCulturalEventPaths(context.culturalEventSlug);
  revalidateEnglishUmkmPaths(context.umkmSlug);
  const cleanup = await removeMediaObject(context.supabase, oldPath);
  if (!cleanup.success) {
    logMediaStorageFailure(
      "remove-deleted-object",
      context.parent.entityType,
      cleanup.error,
      "failed",
    );
    return failure(
      previous,
      previous.values,
      "storage-error",
      "Metadata telah dihapus, tetapi berkas Storage belum terhapus. Hubungi pengelola sistem.",
    );
  }
  revalidatePath(LIST_PATH);
  redirect(`${LIST_PATH}?success=deleted`);
}
