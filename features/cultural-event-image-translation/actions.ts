"use server";

import { revalidatePath } from "next/cache";

import { requireAdministrator } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import {
  revalidatePublicDomainDetailPaths,
  revalidatePublicDomainPaths,
} from "@/features/public-content/revalidation";

import { isValidCulturalEventId } from "../cultural-events/model";
import {
  queryCulturalEventImageTranslationAdminData,
  type CulturalEventImageTranslationAdminItem,
} from "./data";
import {
  createCulturalEventImageTranslationActionState,
  validateCulturalEventImageTranslationForEligibility,
  validateCulturalEventImageTranslationForSource,
  validateCulturalEventImageTranslationFormData,
  type CulturalEventImageTranslationActionState,
  type CulturalEventImageTranslationMutationValues,
  type CulturalEventImageTranslationRpcRow,
} from "./model";

const CULTURAL_EVENT_ADMIN_PATH = "/admin/acara-budaya";

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
type CurrentImage = CulturalEventImageTranslationAdminItem;
type ParsedRevision = number | null | "invalid";
type ParsedTranslationId = string | null | "invalid";
type StateOverrides = {
  kind?: CulturalEventImageTranslationActionState["kind"];
  values?: CulturalEventImageTranslationActionState["values"];
  fieldErrors?: CulturalEventImageTranslationActionState["fieldErrors"];
  formErrors?: string[];
  message?: string | null;
  rejectionReason?: string;
  sourceStatus?: CulturalEventImageTranslationActionState["sourceStatus"];
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
  return isValidCulturalEventId(value) ? value : "invalid";
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
  previousState: CulturalEventImageTranslationActionState,
  overrides: StateOverrides = {},
) {
  return createCulturalEventImageTranslationActionState(
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
  previousState: CulturalEventImageTranslationActionState,
  message = "Terjemahan gambar acara budaya belum dapat diproses. Silakan coba lagi.",
  kind: CulturalEventImageTranslationActionState["kind"] = "database-error",
) {
  return {
    ...previousState,
    kind,
    fieldErrors: {},
    formErrors: [],
    message,
    revision: previousState.revision + 1,
  } satisfies CulturalEventImageTranslationActionState;
}

function successfulMutationRefreshState(
  previousState: CulturalEventImageTranslationActionState,
  message: string,
) {
  return {
    ...previousState,
    kind: "success",
    fieldErrors: {},
    formErrors: [],
    message,
    revision: previousState.revision + 1,
  } satisfies CulturalEventImageTranslationActionState;
}

function validationFailureState(
  image: CurrentImage,
  previousState: CulturalEventImageTranslationActionState,
  values: CulturalEventImageTranslationActionState["values"],
  fieldErrors: CulturalEventImageTranslationActionState["fieldErrors"] = {},
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
  previousState: CulturalEventImageTranslationActionState,
  code: string,
  values = previousState.values,
  rejectionReason = previousState.rejectionReason,
) {
  let message =
    "Terjemahan gambar acara budaya belum dapat diproses. Silakan coba lagi.";
  let kind: CulturalEventImageTranslationActionState["kind"] = "database-error";
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

function revalidateCulturalEventImageTranslationPaths(
  culturalEventId: string,
  trustedSlug: string,
) {
  revalidatePath(CULTURAL_EVENT_ADMIN_PATH);
  revalidatePath(`${CULTURAL_EVENT_ADMIN_PATH}/${culturalEventId}/edit`);
  revalidatePublicDomainPaths("culturalEvent", [trustedSlug]);
}

function revalidateCulturalEventDetailPath(trustedSlug: string) {
  revalidatePublicDomainDetailPaths("culturalEvent", [trustedSlug]);
}

async function refreshAfterMutation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  culturalEventId: string,
  imageId: string,
  trustedPreMutationSlug: string,
  previousState: CulturalEventImageTranslationActionState,
  message: string,
  resultKind: "success" | "database-error" = "success",
) {
  revalidateCulturalEventImageTranslationPaths(
    culturalEventId,
    trustedPreMutationSlug,
  );
  const refreshed = await queryCulturalEventImageTranslationAdminData(
    supabase,
    culturalEventId,
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
  // Revalidate the refreshed trusted slug before checking whether the image
  // still exists. A media mutation can remove the target image during refresh.
  if (refreshed.slug !== trustedPreMutationSlug) {
    revalidateCulturalEventDetailPath(refreshed.slug);
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
  row: CulturalEventImageTranslationRpcRow | null,
) {
  return error?.code ?? (row === null ? "unexpected-row-count" : null);
}

async function saveDraft(
  supabase: Awaited<ReturnType<typeof createClient>>,
  imageId: string,
  expectedEditRevision: number | null,
  values: CulturalEventImageTranslationMutationValues,
) {
  return supabase
    .rpc("cultural_event_image_translation_save_draft", {
      p_cultural_event_image_id: imageId,
      p_expected_edit_revision: expectedEditRevision,
      p_alt_text: values.alt_text,
      p_caption: values.caption,
    })
    .single()
    .overrideTypes<CulturalEventImageTranslationRpcRow, { merge: false }>();
}

async function runSimpleTransition(
  supabase: Awaited<ReturnType<typeof createClient>>,
  intent: "archive" | "unpublish" | "restore",
  translationId: string,
  expectedEditRevision: number | null,
) {
  const rpc =
    intent === "archive"
      ? "cultural_event_image_translation_archive"
      : intent === "unpublish"
        ? "cultural_event_image_translation_unpublish"
        : "cultural_event_image_translation_restore";
  return supabase
    .rpc(rpc, {
      p_translation_id: translationId,
      p_expected_edit_revision: expectedEditRevision,
    })
    .single()
    .overrideTypes<CulturalEventImageTranslationRpcRow, { merge: false }>();
}

export async function manageCulturalEventImageTranslation(
  culturalEventId: string,
  imageId: string,
  previousState: CulturalEventImageTranslationActionState,
  formData: FormData,
): Promise<CulturalEventImageTranslationActionState> {
  // Translation metadata actions never call generic media or Storage methods.
  // The database derives the actor from auth.uid().
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
    !isValidCulturalEventId(culturalEventId) ||
    !isValidCulturalEventId(imageId)
  ) {
    return databaseFailureState(
      previousState,
      "Acara budaya atau gambar tidak ditemukan.",
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
  const current = await queryCulturalEventImageTranslationAdminData(
    supabase,
    culturalEventId,
  );
  if (!current.success) {
    return databaseFailureState(
      previousState,
      current.kind === "not-found"
        ? "Acara budaya tidak ditemukan."
        : "Terjemahan gambar acara budaya belum dapat dimuat. Silakan coba lagi.",
      current.kind === "not-found" ? "not-found" : "database-error",
    );
  }
  const image = current.images.find((item) => item.source.id === imageId);
  if (!image) {
    return databaseFailureState(
      previousState,
      "Gambar tidak ditemukan atau bukan bagian dari acara budaya ini.",
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
    const validation = validateCulturalEventImageTranslationFormData(formData);
    if (!validation.success) {
      return validationFailureState(
        image,
        previousState,
        validation.values,
        validation.fieldErrors,
        validation.formErrors,
      );
    }
    const sourceRule = validateCulturalEventImageTranslationForSource(
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
          ["Konfirmasi review terminologi dan konteks budaya wajib dipilih."],
          "Konfirmasi review manusia diperlukan.",
        );
      }
      const eligibility = validateCulturalEventImageTranslationForEligibility(
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
        culturalEventId,
        imageId,
        current.slug,
        previousState,
        "Draf terjemahan gambar acara budaya berhasil disimpan.",
      );
    }
    const reviewed = await supabase
      .rpc("cultural_event_image_translation_review", {
        p_translation_id: saved.data.id,
        p_expected_edit_revision: saved.data.edit_revision,
        p_terminology_review_confirmed: true,
      })
      .single()
      .overrideTypes<CulturalEventImageTranslationRpcRow, { merge: false }>();
    const reviewFailureCode = rpcRowFailureCode(reviewed.error, reviewed.data);
    if (reviewFailureCode || reviewed.data === null) {
      return refreshAfterMutation(
        supabase,
        culturalEventId,
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
      culturalEventId,
      imageId,
      current.slug,
      previousState,
      "Terjemahan gambar acara budaya berhasil dikirim untuk review.",
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
      .rpc("cultural_event_image_translation_reject", {
        p_translation_id: translation.id,
        p_expected_edit_revision: postedRevision,
        p_reason: reason,
      })
      .single()
      .overrideTypes<CulturalEventImageTranslationRpcRow, { merge: false }>();
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
      culturalEventId,
      imageId,
      current.slug,
      previousState,
      "Terjemahan gambar acara budaya dikembalikan menjadi draf dengan alasan penolakan.",
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
            "Database melaporkan kelayakan publikasi belum terpenuhi.",
        ],
        "Kelayakan publikasi belum terpenuhi.",
      );
    }
    const publication = await supabase
      .rpc(
        intent === "publish"
          ? "cultural_event_image_translation_publish"
          : "cultural_event_image_translation_republish",
        {
          p_translation_id: translation.id,
          p_expected_edit_revision: postedRevision,
        },
      )
      .single()
      .overrideTypes<CulturalEventImageTranslationRpcRow, { merge: false }>();
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
      culturalEventId,
      imageId,
      current.slug,
      previousState,
      intent === "publish"
        ? "Terjemahan gambar acara budaya berhasil diterbitkan."
        : "Terjemahan gambar acara budaya berhasil diterbitkan kembali.",
    );
  }

  if (intent === "archive" || intent === "unpublish" || intent === "restore") {
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
      culturalEventId,
      imageId,
      current.slug,
      previousState,
      intent === "archive"
        ? "Terjemahan gambar acara budaya berhasil diarsipkan."
        : intent === "unpublish"
          ? "Publikasi terjemahan gambar acara budaya dibatalkan dan kembali menjadi draf."
          : "Terjemahan gambar acara budaya dipulihkan menjadi draf.",
    );
  }

  return databaseFailureState(
    previousState,
    "Tindakan lifecycle tidak valid.",
    "validation-error",
  );
}
