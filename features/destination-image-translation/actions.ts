"use server";

import { revalidatePath } from "next/cache";

import { requireAdministrator } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";

import { isValidDestinationId } from "../destinations/model";
import {
  queryDestinationImageTranslationAdminData,
  type DestinationImageTranslationAdminReadResult,
} from "./data";
import {
  createDestinationImageTranslationActionState,
  validateDestinationImageTranslationFormData,
  type DestinationImageTranslationActionState,
  type DestinationImageTranslationMutationValues,
  type DestinationImageTranslationRpcRow,
} from "./model";

const DESTINATION_ADMIN_PATH = "/admin/destinasi";
const ENGLISH_DESTINATIONS_PATH = "/en/destinations";

const IMAGE_TRANSLATION_INTENTS = [
  "save-draft",
  "review",
  "reject",
  "publish",
  "republish",
  "archive",
  "unpublish",
  "restore",
] as const;

type ImageTranslationIntent = (typeof IMAGE_TRANSLATION_INTENTS)[number];
type SuccessfulRead = Extract<
  DestinationImageTranslationAdminReadResult,
  { success: true }
>;
type CurrentImage = SuccessfulRead["images"][number];

type StateOverrides = {
  kind?: DestinationImageTranslationActionState["kind"];
  values?: DestinationImageTranslationActionState["values"];
  fieldErrors?: DestinationImageTranslationActionState["fieldErrors"];
  formErrors?: string[];
  message?: string | null;
  rejectionReason?: string;
};

type ParsedRevision = number | null | "invalid";
type ParsedTranslationId = string | null | "invalid";

function readImageTranslationIntent(
  formData: FormData,
): ImageTranslationIntent | null {
  const submittedValues = formData.getAll("intent");

  if (submittedValues.length !== 1 || typeof submittedValues[0] !== "string") {
    return null;
  }

  const intent = submittedValues[0];
  return IMAGE_TRANSLATION_INTENTS.some((candidate) => candidate === intent)
    ? (intent as ImageTranslationIntent)
    : null;
}

function readTranslationId(formData: FormData): ParsedTranslationId {
  const submittedValues = formData.getAll("translation_id");

  if (submittedValues.length !== 1 || typeof submittedValues[0] !== "string") {
    return "invalid";
  }

  const value = submittedValues[0].trim();
  if (value === "") return null;
  return isValidDestinationId(value) ? value : "invalid";
}

function readExpectedEditRevision(formData: FormData): ParsedRevision {
  const submittedValues = formData.getAll("edit_revision");

  if (submittedValues.length !== 1 || typeof submittedValues[0] !== "string") {
    return "invalid";
  }

  const value = submittedValues[0].trim();
  if (value === "") return null;
  if (!/^\d+$/.test(value)) return "invalid";

  const revision = Number(value);
  return Number.isSafeInteger(revision) && revision > 0 ? revision : "invalid";
}

function readRejectionReason(formData: FormData) {
  const submittedValues = formData.getAll("rejection_reason");
  if (submittedValues.length !== 1 || typeof submittedValues[0] !== "string") {
    return null;
  }

  const reason = submittedValues[0].trim();
  return reason === "" ? null : reason;
}

function stateFromRead(
  image: CurrentImage,
  previousState: DestinationImageTranslationActionState,
  overrides: StateOverrides = {},
) {
  return createDestinationImageTranslationActionState(
    image.translation,
    image.publicEligibility,
    image.history,
    {
      ...overrides,
      revision: previousState.revision + 1,
    },
  );
}

function databaseFailureState(
  previousState: DestinationImageTranslationActionState,
  message = "Terjemahan gambar destinasi belum dapat diproses. Silakan coba lagi.",
  kind: DestinationImageTranslationActionState["kind"] = "database-error",
) {
  return {
    ...previousState,
    kind,
    fieldErrors: {},
    formErrors: [],
    message,
    revision: previousState.revision + 1,
  } satisfies DestinationImageTranslationActionState;
}

function validationFailureState(
  current: SuccessfulRead,
  image: CurrentImage,
  previousState: DestinationImageTranslationActionState,
  values: DestinationImageTranslationActionState["values"],
  fieldErrors: DestinationImageTranslationActionState["fieldErrors"] = {},
  formErrors: string[] = [],
  message = "Periksa kembali data yang ditandai.",
  rejectionReason = previousState.rejectionReason,
) {
  return stateFromRead(image, previousState, {
    kind: "validation-error",
    values,
    fieldErrors,
    formErrors,
    message,
    rejectionReason,
  });
}

function rpcFailureState(
  current: SuccessfulRead,
  image: CurrentImage,
  previousState: DestinationImageTranslationActionState,
  code: string,
  values = previousState.values,
  rejectionReason = previousState.rejectionReason,
) {
  let message =
    "Terjemahan gambar destinasi belum dapat diproses. Silakan coba lagi.";
  let kind: DestinationImageTranslationActionState["kind"] = "database-error";

  if (code === "55000") {
    kind = "conflict";
    message =
      "Status gambar atau sumber media telah berubah. Muat ulang halaman dan ikuti alur review terbaru.";
  } else if (code === "42501") {
    message = "Administrator tidak berwenang menjalankan tindakan ini.";
  } else if (code === "23514" || code === "23502") {
    kind = "validation-error";
    message = "Data terjemahan gambar belum memenuhi persyaratan database.";
  }

  return stateFromRead(image, previousState, {
    kind,
    values,
    formErrors: [message],
    message,
    rejectionReason,
  });
}

function revalidateDestinationImageTranslationPaths(
  destinationId: string,
  sourceSlug: string,
) {
  revalidatePath(`${DESTINATION_ADMIN_PATH}/${destinationId}/edit`);
  revalidatePath(ENGLISH_DESTINATIONS_PATH);
  revalidatePath(
    `${ENGLISH_DESTINATIONS_PATH}/${encodeURIComponent(sourceSlug)}`,
  );
}

async function refreshAfterMutation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  destinationId: string,
  imageId: string,
  previousState: DestinationImageTranslationActionState,
  message: string,
  resultKind: "success" | "database-error" = "success",
) {
  const current = await queryDestinationImageTranslationAdminData(
    supabase,
    destinationId,
  );

  if (!current.success) {
    return databaseFailureState(
      previousState,
      "Perubahan tersimpan, tetapi status terbaru belum dapat dimuat. Muat ulang halaman.",
    );
  }

  const image = current.images.find((item) => item.source.id === imageId);
  if (!image) {
    return databaseFailureState(
      previousState,
      "Perubahan tersimpan, tetapi gambar tidak lagi tersedia.",
      "not-found",
    );
  }

  revalidateDestinationImageTranslationPaths(destinationId, current.slug);
  return stateFromRead(image, previousState, {
    kind: resultKind,
    formErrors: resultKind === "success" ? [] : [message],
    message,
  });
}

async function refreshAfterPartialMutation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  destinationId: string,
  imageId: string,
  previousState: DestinationImageTranslationActionState,
  message: string,
) {
  return refreshAfterMutation(
    supabase,
    destinationId,
    imageId,
    previousState,
    message,
    "database-error",
  );
}

function checkpointMatches(
  image: CurrentImage,
  postedTranslationId: string | null,
  postedRevision: number | null,
) {
  return (
    postedTranslationId === (image.translation?.id ?? null) &&
    postedRevision === (image.translation?.edit_revision ?? null)
  );
}

function imageStateError(
  current: SuccessfulRead,
  image: CurrentImage,
  previousState: DestinationImageTranslationActionState,
  message: string,
) {
  return stateFromRead(image, previousState, {
    kind: "validation-error",
    formErrors: [message],
    message,
  });
}

function rpcRowFailureCode(
  error: { code?: string } | null,
  row: DestinationImageTranslationRpcRow | null,
) {
  return error?.code ?? (row === null ? "unexpected-row-count" : null);
}

async function saveDraft(
  supabase: Awaited<ReturnType<typeof createClient>>,
  imageId: string,
  expectedEditRevision: number | null,
  values: DestinationImageTranslationMutationValues,
) {
  return supabase
    .rpc("destination_image_translation_save_draft", {
      p_destination_image_id: imageId,
      p_expected_edit_revision: expectedEditRevision,
      p_alt_text: values.alt_text,
      p_caption: values.caption,
    })
    .single()
    .overrideTypes<DestinationImageTranslationRpcRow, { merge: false }>();
}

async function runSimpleTransition(
  supabase: Awaited<ReturnType<typeof createClient>>,
  intent: "archive" | "unpublish" | "restore",
  translationId: string,
  expectedEditRevision: number | null,
) {
  const args = {
    p_translation_id: translationId,
    p_expected_edit_revision: expectedEditRevision,
  };

  if (intent === "archive") {
    return supabase
      .rpc("destination_image_translation_archive", args)
      .single()
      .overrideTypes<DestinationImageTranslationRpcRow, { merge: false }>();
  }

  if (intent === "unpublish") {
    return supabase
      .rpc("destination_image_translation_unpublish", args)
      .single()
      .overrideTypes<DestinationImageTranslationRpcRow, { merge: false }>();
  }

  return supabase
    .rpc("destination_image_translation_restore", args)
    .single()
    .overrideTypes<DestinationImageTranslationRpcRow, { merge: false }>();
}

export async function manageDestinationImageTranslation(
  destinationId: string,
  imageId: string,
  previousState: DestinationImageTranslationActionState,
  formData: FormData,
): Promise<DestinationImageTranslationActionState> {
  // The RPCs derive all actor fields from auth.uid(); no actor value is
  // accepted from FormData.
  await requireAdministrator();

  const intent = readImageTranslationIntent(formData);
  if (!intent) {
    return databaseFailureState(
      previousState,
      "Tindakan formulir tidak valid.",
      "validation-error",
    );
  }

  if (!isValidDestinationId(destinationId) || !isValidDestinationId(imageId)) {
    return databaseFailureState(
      previousState,
      "Destinasi atau gambar tidak ditemukan. Muat ulang halaman daftar destinasi.",
      "not-found",
    );
  }

  const postedTranslationId = readTranslationId(formData);
  const postedRevision = readExpectedEditRevision(formData);

  if (postedTranslationId === "invalid" || postedRevision === "invalid") {
    return databaseFailureState(
      previousState,
      "Checkpoint terjemahan gambar tidak valid. Muat ulang halaman sebelum mencoba kembali.",
      "conflict",
    );
  }

  const supabase = await createClient();
  const current = await queryDestinationImageTranslationAdminData(
    supabase,
    destinationId,
  );

  if (!current.success) {
    return databaseFailureState(
      previousState,
      current.kind === "not-found"
        ? "Destinasi tidak ditemukan."
        : "Terjemahan gambar destinasi belum dapat dimuat. Silakan coba lagi.",
      current.kind === "not-found" ? "not-found" : "database-error",
    );
  }

  const image = current.images.find((item) => item.source.id === imageId);
  if (!image) {
    return databaseFailureState(
      previousState,
      "Gambar tidak ditemukan atau bukan bagian dari destinasi ini.",
      "not-found",
    );
  }

  if (!checkpointMatches(image, postedTranslationId, postedRevision)) {
    return stateFromRead(image, previousState, {
      kind: "conflict",
      formErrors: [
        "Status terjemahan gambar telah berubah. Muat ulang halaman sebelum mencoba kembali.",
      ],
      message: "Checkpoint terjemahan gambar sudah tidak berlaku.",
    });
  }

  if (intent === "save-draft" || intent === "review") {
    const validation = validateDestinationImageTranslationFormData(formData);

    if (!validation.success) {
      return validationFailureState(
        current,
        image,
        previousState,
        validation.values,
        validation.fieldErrors,
        validation.formErrors,
      );
    }

    if (
      image.translation?.translation_status !== undefined &&
      image.translation.translation_status !== "draft"
    ) {
      return imageStateError(
        current,
        image,
        previousState,
        "Terjemahan gambar harus berstatus draf sebelum dapat diedit. Batalkan publikasi atau pulihkan arsip terlebih dahulu.",
      );
    }

    const saved = await saveDraft(
      supabase,
      imageId,
      postedRevision,
      validation.data,
    );
    const saveFailureCode = rpcRowFailureCode(saved.error, saved.data);

    if (saveFailureCode || saved.data === null) {
      console.error("Penyimpanan draf terjemahan gambar gagal.", {
        code: saveFailureCode,
      });
      return rpcFailureState(
        current,
        image,
        previousState,
        saveFailureCode ?? "unexpected-row-count",
        validation.values,
      );
    }

    if (intent === "save-draft") {
      return refreshAfterMutation(
        supabase,
        destinationId,
        imageId,
        previousState,
        "Draf terjemahan gambar Inggris berhasil disimpan.",
      );
    }

    const reviewed = await supabase
      .rpc("destination_image_translation_review", {
        p_translation_id: saved.data.id,
        p_expected_edit_revision: saved.data.edit_revision,
      })
      .single()
      .overrideTypes<DestinationImageTranslationRpcRow, { merge: false }>();
    const reviewFailureCode = rpcRowFailureCode(reviewed.error, reviewed.data);

    if (reviewFailureCode || reviewed.data === null) {
      console.error("Review terjemahan gambar destinasi gagal.", {
        code: reviewFailureCode,
      });
      return refreshAfterPartialMutation(
        supabase,
        destinationId,
        imageId,
        previousState,
        reviewFailureCode === "55000"
          ? "Draf tersimpan, tetapi review gagal karena sumber, media, atau terjemahan induk belum memenuhi kelayakan database."
          : "Draf tersimpan, tetapi gambar belum dapat dikirim untuk review.",
      );
    }

    return refreshAfterMutation(
      supabase,
      destinationId,
      imageId,
      previousState,
      "Terjemahan gambar Inggris berhasil dikirim untuk review.",
    );
  }

  const translation = image.translation;
  if (!translation) {
    return imageStateError(
      current,
      image,
      previousState,
      "Terjemahan gambar belum tersedia untuk tindakan lifecycle ini.",
    );
  }

  if (intent === "reject") {
    const reason = readRejectionReason(formData);
    if (!reason) {
      return validationFailureState(
        current,
        image,
        previousState,
        previousState.values,
        {},
        ["Alasan penolakan wajib diisi."],
        "Masukkan alasan penolakan sebelum mengembalikan draf.",
        "",
      );
    }

    if (
      translation.translation_status !== "draft" ||
      !["pending", "reviewed"].includes(translation.review_state)
    ) {
      return imageStateError(
        current,
        image,
        previousState,
        "Hanya draf yang menunggu review atau sudah direview yang dapat ditolak.",
      );
    }

    const rejected = await supabase
      .rpc("destination_image_translation_reject", {
        p_translation_id: translation.id,
        p_expected_edit_revision: postedRevision,
        p_reason: reason,
      })
      .single()
      .overrideTypes<DestinationImageTranslationRpcRow, { merge: false }>();
    const rejectionFailureCode = rpcRowFailureCode(
      rejected.error,
      rejected.data,
    );

    if (rejectionFailureCode || rejected.data === null) {
      console.error("Penolakan review terjemahan gambar gagal.", {
        code: rejectionFailureCode,
      });
      return rpcFailureState(
        current,
        image,
        previousState,
        rejectionFailureCode ?? "unexpected-row-count",
        previousState.values,
        reason,
      );
    }

    return refreshAfterMutation(
      supabase,
      destinationId,
      imageId,
      previousState,
      "Terjemahan gambar Inggris dikembalikan menjadi draf dengan alasan penolakan.",
    );
  }

  if (intent === "publish" || intent === "republish") {
    const hasExpectedStatus =
      intent === "publish"
        ? translation.translation_status === "draft"
        : translation.translation_status === "draft" ||
          translation.translation_status === "published";
    const hasExpectedPublicationHistory =
      intent === "publish"
        ? translation.published_at === null
        : translation.published_at !== null;

    if (
      !hasExpectedStatus ||
      translation.review_state !== "reviewed" ||
      !hasExpectedPublicationHistory
    ) {
      return imageStateError(
        current,
        image,
        previousState,
        intent === "publish"
          ? "Terjemahan gambar harus berstatus reviewed dan belum pernah diterbitkan sebelum publikasi pertama."
          : "Republish hanya dapat dilakukan pada draf atau publikasi yang pernah diterbitkan dan masih memiliki review checkpoint.",
      );
    }

    const publication = await supabase
      .rpc(
        intent === "publish"
          ? "destination_image_translation_publish"
          : "destination_image_translation_republish",
        {
          p_translation_id: translation.id,
          p_expected_edit_revision: postedRevision,
        },
      )
      .single()
      .overrideTypes<DestinationImageTranslationRpcRow, { merge: false }>();
    const publicationFailureCode = rpcRowFailureCode(
      publication.error,
      publication.data,
    );

    if (publicationFailureCode || publication.data === null) {
      console.error("Publikasi terjemahan gambar destinasi gagal.", {
        code: publicationFailureCode,
      });
      return rpcFailureState(
        current,
        image,
        previousState,
        publicationFailureCode ?? "unexpected-row-count",
      );
    }

    return refreshAfterMutation(
      supabase,
      destinationId,
      imageId,
      previousState,
      intent === "publish"
        ? "Terjemahan gambar Inggris berhasil diterbitkan."
        : "Terjemahan gambar Inggris berhasil diterbitkan kembali.",
    );
  }

  if (intent === "archive" || intent === "unpublish" || intent === "restore") {
    const expectedStatus = intent === "restore" ? "archived" : "published";

    if (translation.translation_status !== expectedStatus) {
      return imageStateError(
        current,
        image,
        previousState,
        intent === "restore"
          ? "Hanya terjemahan gambar yang diarsipkan yang dapat dipulihkan menjadi draf."
          : "Hanya terjemahan gambar yang sedang diterbitkan yang dapat diarsipkan atau dibatalkan publikasinya.",
      );
    }

    const transition = await runSimpleTransition(
      supabase,
      intent,
      translation.id,
      postedRevision,
    );
    const transitionFailureCode = rpcRowFailureCode(
      transition.error,
      transition.data,
    );

    if (transitionFailureCode || transition.data === null) {
      console.error("Perubahan lifecycle terjemahan gambar gagal.", {
        code: transitionFailureCode,
      });
      return rpcFailureState(
        current,
        image,
        previousState,
        transitionFailureCode ?? "unexpected-row-count",
      );
    }

    const successMessage =
      intent === "archive"
        ? "Terjemahan gambar Inggris berhasil diarsipkan."
        : intent === "unpublish"
          ? "Terjemahan gambar Inggris dibatalkan publikasinya dan kembali menjadi draf."
          : "Terjemahan gambar Inggris dipulihkan menjadi draf.";

    return refreshAfterMutation(
      supabase,
      destinationId,
      imageId,
      previousState,
      successMessage,
    );
  }

  return databaseFailureState(
    previousState,
    "Tindakan lifecycle gambar tidak valid.",
    "validation-error",
  );
}
