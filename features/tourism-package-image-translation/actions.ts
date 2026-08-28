"use server";

import { revalidatePath } from "next/cache";

import { requireAdministrator } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidateEnglishTourismPackagePaths } from "@/features/public-content/revalidation";

import { isValidMediaUuid } from "../media/model";
import { isValidTourismPackageId } from "../tourism-packages/model";
import {
  queryTourismPackageImageTranslationAdminData,
  type TourismPackageImageTranslationAdminReadResult,
} from "./data";
import {
  createTourismPackageImageTranslationActionState,
  validateTourismPackageImageTranslationForEligibility,
  validateTourismPackageImageTranslationForSource,
  validateTourismPackageImageTranslationFormData,
  type TourismPackageImageTranslationActionState,
  type TourismPackageImageTranslationMutationValues,
  type TourismPackageImageTranslationRpcRow,
} from "./model";

const TOURISM_PACKAGE_ADMIN_PATH = "/admin/paket-wisata";

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
  TourismPackageImageTranslationAdminReadResult,
  { success: true }
>;
type CurrentImage = SuccessfulRead["images"][number];
type ParsedRevision = number | null | "invalid";
type ParsedTranslationId = string | null | "invalid";
type StateOverrides = {
  kind?: TourismPackageImageTranslationActionState["kind"];
  values?: TourismPackageImageTranslationActionState["values"];
  fieldErrors?: TourismPackageImageTranslationActionState["fieldErrors"];
  formErrors?: string[];
  message?: string | null;
  rejectionReason?: string;
  sourceStatus?: TourismPackageImageTranslationActionState["sourceStatus"];
};

function readIntent(formData: FormData): ImageTranslationIntent | null {
  const values = formData.getAll("intent");
  if (values.length !== 1 || typeof values[0] !== "string") return null;
  return IMAGE_TRANSLATION_INTENTS.some((intent) => intent === values[0])
    ? (values[0] as ImageTranslationIntent)
    : null;
}

function readTranslationId(formData: FormData): ParsedTranslationId {
  const values = formData.getAll("translation_id");
  if (values.length !== 1 || typeof values[0] !== "string") return "invalid";
  const value = values[0].trim();
  if (value === "") return null;
  return isValidMediaUuid(value) ? value : "invalid";
}

function readExpectedEditRevision(formData: FormData): ParsedRevision {
  const values = formData.getAll("edit_revision");
  if (values.length !== 1 || typeof values[0] !== "string") return "invalid";
  const value = values[0].trim();
  if (value === "") return null;
  if (!/^\d+$/.test(value)) return "invalid";
  const revision = Number(value);
  return Number.isSafeInteger(revision) && revision > 0 ? revision : "invalid";
}

function readRejectionReason(formData: FormData) {
  const values = formData.getAll("rejection_reason");
  if (values.length !== 1 || typeof values[0] !== "string") return null;
  const reason = values[0].trim();
  return reason === "" ? null : reason;
}

function terminologyReviewConfirmed(formData: FormData) {
  const values = formData.getAll("terminology_review_confirmed");
  return values.length === 1 && (values[0] === "on" || values[0] === "true");
}

function stateFromRead(
  image: CurrentImage,
  previousState: TourismPackageImageTranslationActionState,
  overrides: StateOverrides = {},
) {
  return createTourismPackageImageTranslationActionState(
    image.source,
    image.translation,
    image.history,
    {
      ...overrides,
      sourceStatus: overrides.sourceStatus ?? image.sourceStatus,
      revision: previousState.revision + 1,
    },
  );
}

function databaseFailureState(
  previousState: TourismPackageImageTranslationActionState,
  message = "Terjemahan gambar paket wisata belum dapat diproses. Silakan coba lagi.",
  kind: TourismPackageImageTranslationActionState["kind"] = "database-error",
) {
  return {
    ...previousState,
    kind,
    fieldErrors: {},
    formErrors: [],
    message,
    revision: previousState.revision + 1,
  } satisfies TourismPackageImageTranslationActionState;
}

function validationFailureState(
  image: CurrentImage,
  previousState: TourismPackageImageTranslationActionState,
  values: TourismPackageImageTranslationActionState["values"],
  fieldErrors: TourismPackageImageTranslationActionState["fieldErrors"] = {},
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
  image: CurrentImage,
  previousState: TourismPackageImageTranslationActionState,
  code: string,
  values = previousState.values,
  rejectionReason = previousState.rejectionReason,
) {
  let message =
    "Terjemahan gambar paket wisata belum dapat diproses. Silakan coba lagi.";
  let kind: TourismPackageImageTranslationActionState["kind"] =
    "database-error";
  if (code === "55000") {
    kind = "conflict";
    message =
      "Status gambar, sumber, atau media telah berubah. Muat ulang halaman dan ikuti alur review terbaru.";
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

function revalidateTourismPackageImageTranslationPaths(
  tourismPackageId: string,
) {
  let success = true;
  for (const path of [
    TOURISM_PACKAGE_ADMIN_PATH,
    `${TOURISM_PACKAGE_ADMIN_PATH}/${tourismPackageId}/edit`,
  ]) {
    try {
      revalidatePath(path);
    } catch {
      success = false;
      console.error(
        "Revalidasi workspace terjemahan gambar paket wisata gagal.",
        { code: "revalidation-failed" },
      );
    }
  }
  return success;
}

async function refreshAfterMutation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tourismPackageId: string,
  imageId: string,
  previousState: TourismPackageImageTranslationActionState,
  message: string,
  resultKind: "success" | "database-error" = "success",
) {
  const revalidationSucceeded =
    revalidateTourismPackageImageTranslationPaths(tourismPackageId);
  const refreshed = await queryTourismPackageImageTranslationAdminData(
    supabase,
    tourismPackageId,
  );
  if (!refreshed.success) {
    return {
      ...previousState,
      kind: resultKind === "success" ? "success" : "database-error",
      fieldErrors: {},
      formErrors: resultKind === "success" ? [] : [message],
      message:
        resultKind === "success"
          ? revalidationSucceeded
            ? "Perubahan tersimpan, tetapi status terbaru belum dapat dimuat. Muat ulang halaman."
            : "Perubahan tersimpan, tetapi status terbaru dan cache admin belum dapat dimuat. Muat ulang halaman."
          : "Draf tersimpan, tetapi langkah review berikutnya belum berhasil. Muat ulang halaman.",
      revision: previousState.revision + 1,
    } satisfies TourismPackageImageTranslationActionState;
  }
  const image = refreshed.images.find((item) => item.source.id === imageId);
  if (!image) {
    return {
      ...previousState,
      kind: resultKind === "success" ? "success" : "database-error",
      fieldErrors: {},
      formErrors: resultKind === "success" ? [] : [message],
      message:
        resultKind === "success"
          ? revalidationSucceeded
            ? "Perubahan tersimpan, tetapi gambar tidak lagi tersedia. Muat ulang halaman."
            : "Perubahan tersimpan, tetapi gambar dan cache admin belum dapat dimuat. Muat ulang halaman."
          : "Draf tersimpan, tetapi status gambar terbaru belum dapat dimuat.",
      revision: previousState.revision + 1,
    } satisfies TourismPackageImageTranslationActionState;
  }
  return stateFromRead(image, previousState, {
    kind: resultKind,
    formErrors: resultKind === "success" ? [] : [message],
    message: revalidationSucceeded
      ? message
      : `${message} Cache admin belum diperbarui. Muat ulang halaman.`,
  });
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

function rpcRowFailureCode(
  error: { code?: string } | null,
  row: TourismPackageImageTranslationRpcRow | null,
) {
  return error?.code ?? (row === null ? "unexpected-row-count" : null);
}

async function saveDraft(
  supabase: Awaited<ReturnType<typeof createClient>>,
  imageId: string,
  expectedEditRevision: number | null,
  values: TourismPackageImageTranslationMutationValues,
) {
  return supabase
    .rpc("tourism_package_image_translation_save_draft", {
      p_package_image_id: imageId,
      p_expected_edit_revision: expectedEditRevision,
      p_alt_text: values.alt_text,
      p_caption: values.caption,
    })
    .single()
    .overrideTypes<TourismPackageImageTranslationRpcRow, { merge: false }>();
}

async function runSimpleTransition(
  supabase: Awaited<ReturnType<typeof createClient>>,
  intent: "archive" | "unpublish" | "restore",
  translationId: string,
  expectedEditRevision: number | null,
) {
  const rpc =
    intent === "archive"
      ? "tourism_package_image_translation_archive"
      : intent === "unpublish"
        ? "tourism_package_image_translation_unpublish"
        : "tourism_package_image_translation_restore";
  return supabase
    .rpc(rpc, {
      p_translation_id: translationId,
      p_expected_edit_revision: expectedEditRevision,
    })
    .single()
    .overrideTypes<TourismPackageImageTranslationRpcRow, { merge: false }>();
}

export async function manageTourismPackageImageTranslation(
  tourismPackageId: string,
  imageId: string,
  previousState: TourismPackageImageTranslationActionState,
  formData: FormData,
): Promise<TourismPackageImageTranslationActionState> {
  // This workflow only changes translation metadata through lifecycle RPCs.
  // It never accepts or forwards Storage identity, fingerprints, or actors.
  await requireAdministrator();

  const intent = readIntent(formData);
  if (!intent) {
    return databaseFailureState(
      previousState,
      "Tindakan formulir tidak valid.",
      "validation-error",
    );
  }
  if (
    !isValidTourismPackageId(tourismPackageId) ||
    !isValidMediaUuid(imageId)
  ) {
    return databaseFailureState(
      previousState,
      "Paket wisata atau gambar tidak ditemukan.",
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
  const current = await queryTourismPackageImageTranslationAdminData(
    supabase,
    tourismPackageId,
  );
  if (!current.success) {
    return databaseFailureState(
      previousState,
      current.kind === "not-found"
        ? "Paket wisata tidak ditemukan."
        : "Terjemahan gambar paket wisata belum dapat dimuat. Silakan coba lagi.",
      current.kind === "not-found" ? "not-found" : "database-error",
    );
  }
  const image = current.images.find((item) => item.source.id === imageId);
  if (!image) {
    return databaseFailureState(
      previousState,
      "Gambar tidak ditemukan atau bukan bagian dari paket wisata ini.",
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
    const validation = validateTourismPackageImageTranslationFormData(formData);
    if (!validation.success) {
      return validationFailureState(
        image,
        previousState,
        validation.values,
        validation.fieldErrors,
        validation.formErrors,
      );
    }
    const sourceRule = validateTourismPackageImageTranslationForSource(
      image.source,
      validation.data,
    );
    if (!sourceRule.success) {
      return validationFailureState(
        image,
        previousState,
        validation.values,
        sourceRule.fieldErrors,
        sourceRule.formErrors,
        "Periksa kesesuaian caption sumber dan terjemahan.",
      );
    }
    if (image.translation && image.translation.translation_status !== "draft") {
      return validationFailureState(
        image,
        previousState,
        validation.values,
        {},
        [
          "Terjemahan gambar harus berstatus draf sebelum dapat diedit. Batalkan publikasi atau pulihkan arsip terlebih dahulu.",
        ],
        "Status terjemahan tidak mengizinkan penyuntingan.",
      );
    }
    if (intent === "review") {
      if (!terminologyReviewConfirmed(formData)) {
        return validationFailureState(
          image,
          previousState,
          validation.values,
          {},
          ["Konfirmasi review manusia wajib dipilih sebelum review."],
          "Konfirmasi review manusia diperlukan.",
        );
      }
      const eligibility = validateTourismPackageImageTranslationForEligibility(
        image.source,
        validation.data,
        image.sourceStatus,
      );
      if (!eligibility.success) {
        return validationFailureState(
          image,
          previousState,
          validation.values,
          eligibility.fieldErrors,
          eligibility.formErrors,
          "Lengkapi terjemahan gambar sebelum mengirim review.",
        );
      }
    }

    const saved = await saveDraft(
      supabase,
      imageId,
      postedRevision,
      validation.data,
    );
    const saveFailureCode = rpcRowFailureCode(saved.error, saved.data);
    if (saveFailureCode || saved.data === null) {
      return rpcFailureState(
        image,
        previousState,
        saveFailureCode ?? "unexpected-row-count",
        validation.values,
      );
    }
    if (intent === "save-draft") {
      return refreshAfterMutation(
        supabase,
        tourismPackageId,
        imageId,
        previousState,
        "Draf terjemahan gambar paket wisata berhasil disimpan.",
      );
    }

    const reviewed = await supabase
      .rpc("tourism_package_image_translation_review", {
        p_translation_id: saved.data.id,
        p_expected_edit_revision: saved.data.edit_revision,
        p_terminology_review_confirmed: true,
      })
      .single()
      .overrideTypes<TourismPackageImageTranslationRpcRow, { merge: false }>();
    const reviewFailureCode = rpcRowFailureCode(reviewed.error, reviewed.data);
    if (reviewFailureCode || reviewed.data === null) {
      return refreshAfterMutation(
        supabase,
        tourismPackageId,
        imageId,
        previousState,
        reviewFailureCode === "55000"
          ? "Draf tersimpan, tetapi review gagal karena sumber atau media berubah."
          : "Draf tersimpan, tetapi gambar belum dapat dikirim untuk review.",
        "database-error",
      );
    }
    return refreshAfterMutation(
      supabase,
      tourismPackageId,
      imageId,
      previousState,
      "Terjemahan gambar paket wisata berhasil dikirim untuk review.",
    );
  }

  const translation = image.translation;
  if (!translation) {
    return validationFailureState(
      image,
      previousState,
      previousState.values,
      {},
      ["Terjemahan gambar belum tersedia untuk tindakan lifecycle ini."],
      "Tindakan lifecycle tidak dapat dijalankan.",
    );
  }
  if (intent === "reject") {
    const reason = readRejectionReason(formData);
    if (!reason) {
      return validationFailureState(
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
      return validationFailureState(
        image,
        previousState,
        previousState.values,
        {},
        [
          "Hanya draf yang menunggu review atau sudah direview yang dapat ditolak.",
        ],
        "Status terjemahan tidak sesuai.",
      );
    }
    const rejected = await supabase
      .rpc("tourism_package_image_translation_reject", {
        p_translation_id: translation.id,
        p_expected_edit_revision: postedRevision,
        p_reason: reason,
      })
      .single()
      .overrideTypes<TourismPackageImageTranslationRpcRow, { merge: false }>();
    const failureCode = rpcRowFailureCode(rejected.error, rejected.data);
    if (failureCode || rejected.data === null) {
      return rpcFailureState(
        image,
        previousState,
        failureCode ?? "unexpected-row-count",
        previousState.values,
        reason,
      );
    }
    return refreshAfterMutation(
      supabase,
      tourismPackageId,
      imageId,
      previousState,
      "Terjemahan gambar paket wisata dikembalikan menjadi draf dengan alasan penolakan.",
    );
  }

  if (intent === "publish" || intent === "republish") {
    const validStatus =
      intent === "publish"
        ? translation.translation_status === "draft" &&
          translation.published_at === null
        : (translation.translation_status === "draft" ||
            translation.translation_status === "published") &&
          translation.published_at !== null;
    if (!validStatus || translation.review_state !== "reviewed") {
      return validationFailureState(
        image,
        previousState,
        previousState.values,
        {},
        [
          intent === "publish"
            ? "Terjemahan gambar harus reviewed dan belum pernah diterbitkan sebelum publikasi pertama."
            : "Republish memerlukan checkpoint review terbaru dan riwayat publikasi.",
        ],
        "Status publikasi tidak sesuai.",
      );
    }
    if (!translation.publication_eligibility) {
      return validationFailureState(
        image,
        previousState,
        previousState.values,
        {},
        [
          "Kelayakan publikasi gambar belum terpenuhi. Periksa status sumber, Storage, dan metadata terjemahan.",
        ],
        "Kelayakan publikasi belum terpenuhi.",
      );
    }
    const publication = await supabase
      .rpc(
        intent === "publish"
          ? "tourism_package_image_translation_publish"
          : "tourism_package_image_translation_republish",
        {
          p_translation_id: translation.id,
          p_expected_edit_revision: postedRevision,
        },
      )
      .single()
      .overrideTypes<TourismPackageImageTranslationRpcRow, { merge: false }>();
    const failureCode = rpcRowFailureCode(publication.error, publication.data);
    if (failureCode || publication.data === null) {
      return rpcFailureState(
        image,
        previousState,
        failureCode ?? "unexpected-row-count",
      );
    }
    revalidateEnglishTourismPackagePaths([current.slug]);
    return refreshAfterMutation(
      supabase,
      tourismPackageId,
      imageId,
      previousState,
      intent === "publish"
        ? "Terjemahan gambar paket wisata berhasil diterbitkan."
        : "Terjemahan gambar paket wisata berhasil diterbitkan kembali.",
    );
  }

  const expectedStatus = intent === "restore" ? "archived" : "published";
  if (translation.translation_status !== expectedStatus) {
    return validationFailureState(
      image,
      previousState,
      previousState.values,
      {},
      [
        intent === "restore"
          ? "Hanya terjemahan gambar yang diarsipkan yang dapat dipulihkan menjadi draf."
          : "Hanya terjemahan gambar yang sedang diterbitkan yang dapat diarsipkan atau dibatalkan publikasinya.",
      ],
      "Status lifecycle tidak sesuai.",
    );
  }
  const transition = await runSimpleTransition(
    supabase,
    intent,
    translation.id,
    postedRevision,
  );
  const failureCode = rpcRowFailureCode(transition.error, transition.data);
  if (failureCode || transition.data === null) {
    return rpcFailureState(
      image,
      previousState,
      failureCode ?? "unexpected-row-count",
    );
  }
  if (intent !== "restore") {
    revalidateEnglishTourismPackagePaths([current.slug]);
  }
  return refreshAfterMutation(
    supabase,
    tourismPackageId,
    imageId,
    previousState,
    intent === "archive"
      ? "Terjemahan gambar paket wisata berhasil diarsipkan."
      : intent === "unpublish"
        ? "Publikasi terjemahan gambar paket wisata dibatalkan dan kembali menjadi draf."
        : "Terjemahan gambar paket wisata dipulihkan menjadi draf.",
  );
}
