"use server";

import { revalidatePath } from "next/cache";

import { requireAdministrator } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import {
  revalidatePublicDomainDetailPaths,
  revalidatePublicDomainPaths,
} from "@/features/public-content/revalidation";

import { isValidHomestayId } from "../homestays/model";
import {
  queryHomestayImageTranslationAdminData,
  type HomestayImageTranslationAdminReadResult,
} from "./data";
import {
  createHomestayImageTranslationActionState,
  validateHomestayImageTranslationForEligibility,
  validateHomestayImageTranslationForSource,
  validateHomestayImageTranslationFormData,
  type HomestayImageTranslationActionState,
  type HomestayImageTranslationMutationValues,
  type HomestayImageTranslationRpcRow,
} from "./model";

const HOMESTAY_ADMIN_PATH = "/admin/homestay";
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
  HomestayImageTranslationAdminReadResult,
  { success: true }
>;
type CurrentImage = SuccessfulRead["images"][number];
type ParsedRevision = number | null | "invalid";
type ParsedTranslationId = string | null | "invalid";
type StateOverrides = {
  kind?: HomestayImageTranslationActionState["kind"];
  values?: HomestayImageTranslationActionState["values"];
  fieldErrors?: HomestayImageTranslationActionState["fieldErrors"];
  formErrors?: string[];
  message?: string | null;
  rejectionReason?: string;
  sourceStatus?: HomestayImageTranslationActionState["sourceStatus"];
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
  return isValidHomestayId(value) ? value : "invalid";
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
  previousState: HomestayImageTranslationActionState,
  overrides: StateOverrides = {},
) {
  return createHomestayImageTranslationActionState(
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
  previousState: HomestayImageTranslationActionState,
  message = "Terjemahan gambar homestay belum dapat diproses. Silakan coba lagi.",
  kind: HomestayImageTranslationActionState["kind"] = "database-error",
) {
  return {
    ...previousState,
    kind,
    fieldErrors: {},
    formErrors: [],
    message,
    revision: previousState.revision + 1,
  } satisfies HomestayImageTranslationActionState;
}

function successfulMutationRefreshState(
  previousState: HomestayImageTranslationActionState,
  message: string,
) {
  return {
    ...previousState,
    kind: "success",
    fieldErrors: {},
    formErrors: [],
    message,
    revision: previousState.revision + 1,
  } satisfies HomestayImageTranslationActionState;
}

function validationFailureState(
  image: CurrentImage,
  previousState: HomestayImageTranslationActionState,
  values: HomestayImageTranslationActionState["values"],
  fieldErrors: HomestayImageTranslationActionState["fieldErrors"] = {},
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
  previousState: HomestayImageTranslationActionState,
  code: string,
  values = previousState.values,
  rejectionReason = previousState.rejectionReason,
) {
  let message =
    "Terjemahan gambar homestay belum dapat diproses. Silakan coba lagi.";
  let kind: HomestayImageTranslationActionState["kind"] = "database-error";
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

function revalidateHomestayImageTranslationPaths(
  homestayId: string,
  sourceSlug: string,
) {
  revalidatePath(HOMESTAY_ADMIN_PATH);
  revalidatePath(`${HOMESTAY_ADMIN_PATH}/${homestayId}/edit`);
  revalidatePublicDomainPaths("homestay", [sourceSlug]);
}

function revalidateHomestayImageTranslationDetailPath(sourceSlug: string) {
  revalidatePublicDomainDetailPaths("homestay", [sourceSlug]);
}

async function refreshAfterMutation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  homestayId: string,
  imageId: string,
  trustedPreMutationSlug: string,
  previousState: HomestayImageTranslationActionState,
  message: string,
  resultKind: "success" | "database-error" = "success",
) {
  revalidateHomestayImageTranslationPaths(homestayId, trustedPreMutationSlug);
  const refreshed = await queryHomestayImageTranslationAdminData(
    supabase,
    homestayId,
  );
  if (!refreshed.success) {
    if (resultKind === "success") {
      return successfulMutationRefreshState(
        previousState,
        "Perubahan tersimpan, tetapi status terbaru belum dapat dimuat. Muat ulang halaman.",
      );
    }
    return databaseFailureState(
      previousState,
      "Perubahan tersimpan, tetapi status terbaru belum dapat dimuat. Muat ulang halaman.",
    );
  }
  if (refreshed.slug !== trustedPreMutationSlug) {
    revalidateHomestayImageTranslationDetailPath(refreshed.slug);
  }
  const image = refreshed.images.find((item) => item.source.id === imageId);
  if (!image) {
    if (resultKind === "success") {
      return successfulMutationRefreshState(
        previousState,
        "Perubahan tersimpan, tetapi gambar tidak lagi tersedia. Muat ulang halaman.",
      );
    }
    return databaseFailureState(
      previousState,
      "Perubahan tersimpan, tetapi gambar tidak lagi tersedia.",
      "not-found",
    );
  }
  return stateFromRead(image, previousState, {
    kind: resultKind,
    formErrors: resultKind === "success" ? [] : [message],
    message,
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
  row: HomestayImageTranslationRpcRow | null,
) {
  return error?.code ?? (row === null ? "unexpected-row-count" : null);
}

async function saveDraft(
  supabase: Awaited<ReturnType<typeof createClient>>,
  imageId: string,
  expectedEditRevision: number | null,
  values: HomestayImageTranslationMutationValues,
) {
  return supabase
    .rpc("homestay_image_translation_save_draft", {
      p_homestay_image_id: imageId,
      p_expected_edit_revision: expectedEditRevision,
      p_alt_text: values.alt_text,
      p_caption: values.caption,
    })
    .single()
    .overrideTypes<HomestayImageTranslationRpcRow, { merge: false }>();
}

async function runSimpleTransition(
  supabase: Awaited<ReturnType<typeof createClient>>,
  intent: "archive" | "unpublish" | "restore",
  translationId: string,
  expectedEditRevision: number | null,
) {
  const rpc =
    intent === "archive"
      ? "homestay_image_translation_archive"
      : intent === "unpublish"
        ? "homestay_image_translation_unpublish"
        : "homestay_image_translation_restore";
  return supabase
    .rpc(rpc, {
      p_translation_id: translationId,
      p_expected_edit_revision: expectedEditRevision,
    })
    .single()
    .overrideTypes<HomestayImageTranslationRpcRow, { merge: false }>();
}

export async function manageHomestayImageTranslation(
  homestayId: string,
  imageId: string,
  previousState: HomestayImageTranslationActionState,
  formData: FormData,
): Promise<HomestayImageTranslationActionState> {
  // The database derives actors from auth.uid(); no actor or slug is accepted
  // from the client. Generic media and Storage actions are not called here.
  await requireAdministrator();

  const intent = readIntent(formData);
  if (!intent) {
    return databaseFailureState(
      previousState,
      "Tindakan formulir tidak valid.",
      "validation-error",
    );
  }
  if (!isValidHomestayId(homestayId) || !isValidHomestayId(imageId)) {
    return databaseFailureState(
      previousState,
      "Homestay atau gambar tidak ditemukan.",
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
  const current = await queryHomestayImageTranslationAdminData(
    supabase,
    homestayId,
  );
  if (!current.success) {
    return databaseFailureState(
      previousState,
      current.kind === "not-found"
        ? "Homestay tidak ditemukan."
        : "Terjemahan gambar homestay belum dapat dimuat. Silakan coba lagi.",
      current.kind === "not-found" ? "not-found" : "database-error",
    );
  }
  const image = current.images.find((item) => item.source.id === imageId);
  if (!image) {
    return databaseFailureState(
      previousState,
      "Gambar tidak ditemukan atau bukan bagian dari homestay ini.",
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
    const validation = validateHomestayImageTranslationFormData(formData);
    if (!validation.success) {
      return validationFailureState(
        image,
        previousState,
        validation.values,
        validation.fieldErrors,
        validation.formErrors,
      );
    }
    const sourceRule = validateHomestayImageTranslationForSource(
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
          ["Konfirmasi review terminologi budaya wajib dipilih."],
          "Konfirmasi review manusia diperlukan.",
        );
      }
      const eligibility = validateHomestayImageTranslationForEligibility(
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
        homestayId,
        imageId,
        current.slug,
        previousState,
        "Draf terjemahan gambar homestay berhasil disimpan.",
      );
    }
    const reviewed = await supabase
      .rpc("homestay_image_translation_review", {
        p_translation_id: saved.data.id,
        p_expected_edit_revision: saved.data.edit_revision,
        p_terminology_review_confirmed: true,
      })
      .single()
      .overrideTypes<HomestayImageTranslationRpcRow, { merge: false }>();
    const reviewFailureCode = rpcRowFailureCode(reviewed.error, reviewed.data);
    if (reviewFailureCode || reviewed.data === null) {
      return refreshAfterMutation(
        supabase,
        homestayId,
        imageId,
        current.slug,
        previousState,
        reviewFailureCode === "55000"
          ? "Draf tersimpan, tetapi review gagal karena sumber atau media berubah."
          : "Draf tersimpan, tetapi gambar belum dapat dikirim untuk review.",
        "database-error",
      );
    }
    return refreshAfterMutation(
      supabase,
      homestayId,
      imageId,
      current.slug,
      previousState,
      "Terjemahan gambar homestay berhasil dikirim untuk review.",
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
      .rpc("homestay_image_translation_reject", {
        p_translation_id: translation.id,
        p_expected_edit_revision: postedRevision,
        p_reason: reason,
      })
      .single()
      .overrideTypes<HomestayImageTranslationRpcRow, { merge: false }>();
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
      homestayId,
      imageId,
      current.slug,
      previousState,
      "Terjemahan gambar homestay dikembalikan menjadi draf dengan alasan penolakan.",
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
          translation.eligibility_reason ||
            "Kelayakan publikasi belum terpenuhi.",
        ],
        "Kelayakan publikasi belum terpenuhi.",
      );
    }
    const publication = await supabase
      .rpc(
        intent === "publish"
          ? "homestay_image_translation_publish"
          : "homestay_image_translation_republish",
        {
          p_translation_id: translation.id,
          p_expected_edit_revision: postedRevision,
        },
      )
      .single()
      .overrideTypes<HomestayImageTranslationRpcRow, { merge: false }>();
    const failureCode = rpcRowFailureCode(publication.error, publication.data);
    if (failureCode || publication.data === null) {
      return rpcFailureState(
        image,
        previousState,
        failureCode ?? "unexpected-row-count",
      );
    }
    return refreshAfterMutation(
      supabase,
      homestayId,
      imageId,
      current.slug,
      previousState,
      intent === "publish"
        ? "Terjemahan gambar homestay berhasil diterbitkan."
        : "Terjemahan gambar homestay berhasil diterbitkan kembali.",
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
  return refreshAfterMutation(
    supabase,
    homestayId,
    imageId,
    current.slug,
    previousState,
    intent === "archive"
      ? "Terjemahan gambar homestay berhasil diarsipkan."
      : intent === "unpublish"
        ? "Publikasi terjemahan gambar homestay dibatalkan dan kembali menjadi draf."
        : "Terjemahan gambar homestay dipulihkan menjadi draf.",
  );
}
