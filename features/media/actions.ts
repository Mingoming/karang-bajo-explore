"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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

async function readTrustedContext(entityType: string, parentId: string) {
  if (!isMediaEntityType(entityType) || !isValidMediaUuid(parentId))
    return { kind: "not-found" as const };
  const supabase = await createClient();
  const parent = await queryMediaParentById(supabase, entityType, parentId);
  if (parent === undefined) return { kind: "database-error" as const };
  if (!parent) return { kind: "not-found" as const };
  const images = await queryMediaImages(supabase, entityType, parent.id);
  if (!images) return { kind: "database-error" as const };
  return { kind: "ready" as const, supabase, parent, images };
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

  const imageId = crypto.randomUUID();
  const path = createMediaStoragePath(
    context.parent.entityType,
    context.parent.id,
    imageId,
    fileValidation.extension,
  );
  const orderedIds = moveMediaImageToOrder(
    [...context.images.map((image) => image.id), imageId],
    imageId,
    validation.data.displayOrder,
  );
  if (!orderedIds)
    return failure(
      previous,
      validation.values,
      "database-error",
      "Susunan media tidak valid.",
    );

  const upload = await uploadMediaObject(
    context.supabase,
    path,
    fileValidation.file,
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
  redirect(
    mediaEditPath(
      context.parent.entityType,
      context.parent.id,
      imageId,
      "created",
    ),
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
  } else {
    const replacementId = crypto.randomUUID();
    const newPath = createMediaStoragePath(
      context.parent.entityType,
      context.parent.id,
      replacementId,
      fileValidation.extension,
    );
    const upload = await uploadMediaObject(
      context.supabase,
      newPath,
      fileValidation.file,
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
