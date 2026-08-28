"use server";

import { revalidatePath } from "next/cache";

import { requireAdministrator } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidateEnglishTourismPackagePaths } from "@/features/public-content/revalidation";

import { isValidTourismPackageId } from "../tourism-packages/model";
import {
  queryTourismPackageTranslationAdminData,
  type TourismPackageTranslationAdminReadResult,
} from "./data";
import {
  createTourismPackageTranslationActionState,
  validateTourismPackageTranslationForEligibility,
  validateTourismPackageTranslationForSource,
  validateTourismPackageTranslationFormData,
  type TourismPackageTranslationActionState,
  type TourismPackageTranslationMutationValues,
  type TourismPackageTranslationRpcRow,
} from "./model";

const TOURISM_PACKAGE_ADMIN_PATH = "/admin/paket-wisata";

const TRANSLATION_INTENTS = [
  "save-draft",
  "review",
  "reject",
  "publish",
  "republish",
  "archive",
  "unpublish",
  "restore",
] as const;

type TranslationIntent = (typeof TRANSLATION_INTENTS)[number];
type SuccessfulRead = Extract<
  TourismPackageTranslationAdminReadResult,
  { success: true }
>;
type ParsedRevision = number | null | "invalid";
type ParsedTranslationId = string | null | "invalid";
type StateOverrides = {
  kind?: TourismPackageTranslationActionState["kind"];
  values?: TourismPackageTranslationActionState["values"];
  fieldErrors?: TourismPackageTranslationActionState["fieldErrors"];
  formErrors?: string[];
  message?: string | null;
  rejectionReason?: string;
};

function readIntent(formData: FormData): TranslationIntent | null {
  const values = formData.getAll("intent");
  if (values.length !== 1 || typeof values[0] !== "string") return null;
  return TRANSLATION_INTENTS.some((intent) => intent === values[0])
    ? (values[0] as TranslationIntent)
    : null;
}

function readTranslationId(formData: FormData): ParsedTranslationId {
  const values = formData.getAll("translation_id");
  if (values.length !== 1 || typeof values[0] !== "string") return "invalid";
  const value = values[0].trim();
  if (value === "") return null;
  return isValidTourismPackageId(value) ? value : "invalid";
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
  current: SuccessfulRead,
  previousState: TourismPackageTranslationActionState,
  overrides: StateOverrides = {},
) {
  return createTourismPackageTranslationActionState(
    current.source,
    current.translation,
    current.history,
    { ...overrides, revision: previousState.revision + 1 },
  );
}

function databaseFailureState(
  previousState: TourismPackageTranslationActionState,
  message = "Terjemahan paket wisata belum dapat diproses. Silakan coba lagi.",
  kind: TourismPackageTranslationActionState["kind"] = "database-error",
) {
  return {
    ...previousState,
    kind,
    fieldErrors: {},
    formErrors: [],
    message,
    revision: previousState.revision + 1,
  } satisfies TourismPackageTranslationActionState;
}

function validationFailureState(
  current: SuccessfulRead,
  previousState: TourismPackageTranslationActionState,
  values: TourismPackageTranslationActionState["values"],
  fieldErrors: TourismPackageTranslationActionState["fieldErrors"] = {},
  formErrors: string[] = [],
  message = "Periksa kembali data yang ditandai.",
  rejectionReason = previousState.rejectionReason,
) {
  return stateFromRead(current, previousState, {
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
  previousState: TourismPackageTranslationActionState,
  code: string,
  values = previousState.values,
  rejectionReason = previousState.rejectionReason,
) {
  let message =
    "Terjemahan paket wisata belum dapat diproses. Silakan coba lagi.";
  let kind: TourismPackageTranslationActionState["kind"] = "database-error";
  if (code === "55000") {
    kind = "conflict";
    message =
      "Status terjemahan, itinerary, Destination, atau gambar utama telah berubah. Muat ulang halaman dan ikuti alur review terbaru.";
  } else if (code === "42501") {
    message = "Administrator tidak berwenang menjalankan tindakan ini.";
  } else if (code === "23514" || code === "23502") {
    kind = "validation-error";
    message = "Data terjemahan belum memenuhi persyaratan database.";
  }
  return stateFromRead(current, previousState, {
    kind,
    values,
    formErrors: [message],
    message,
    rejectionReason,
  });
}

function revalidateTourismPackageTranslationPaths(tourismPackageId: string) {
  let success = true;
  for (const path of [
    TOURISM_PACKAGE_ADMIN_PATH,
    `${TOURISM_PACKAGE_ADMIN_PATH}/${tourismPackageId}/edit`,
  ]) {
    try {
      revalidatePath(path);
    } catch {
      success = false;
      console.error("Revalidasi workspace terjemahan paket wisata gagal.", {
        code: "revalidation-failed",
      });
    }
  }
  return success;
}

async function refreshAfterMutation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tourismPackageId: string,
  previousState: TourismPackageTranslationActionState,
  message: string,
  resultKind: "success" | "database-error" = "success",
) {
  const revalidationSucceeded =
    revalidateTourismPackageTranslationPaths(tourismPackageId);
  const refreshed = await queryTourismPackageTranslationAdminData(
    supabase,
    tourismPackageId,
  );
  if (!refreshed.success) {
    // The lifecycle RPC has already committed. A refresh outage must not turn
    // a successful mutation into a false mutation failure.
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
    } satisfies TourismPackageTranslationActionState;
  }
  return stateFromRead(refreshed, previousState, {
    kind: resultKind,
    formErrors: resultKind === "success" ? [] : [message],
    message: revalidationSucceeded
      ? message
      : `${message} Cache admin belum diperbarui. Muat ulang halaman.`,
  });
}

function checkpointMatches(
  current: SuccessfulRead,
  postedTranslationId: string | null,
  postedRevision: number | null,
) {
  return (
    postedTranslationId === (current.translation?.id ?? null) &&
    postedRevision === (current.translation?.edit_revision ?? null)
  );
}

function rpcRowFailureCode(
  error: { code?: string } | null,
  row: TourismPackageTranslationRpcRow | null,
) {
  return error?.code ?? (row === null ? "unexpected-row-count" : null);
}

async function saveDraft(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tourismPackageId: string,
  expectedEditRevision: number | null,
  values: TourismPackageTranslationMutationValues,
) {
  return supabase
    .rpc("tourism_package_translation_save_draft", {
      p_tourism_package_id: tourismPackageId,
      p_expected_edit_revision: expectedEditRevision,
      p_name: values.name,
      p_duration_unit: values.duration_unit,
      p_price_note: values.price_note,
      p_included_facilities: values.included_facilities,
      p_souvenir: values.souvenir,
      p_summary: values.summary,
      p_description: values.description,
    })
    .single()
    .overrideTypes<TourismPackageTranslationRpcRow, { merge: false }>();
}

async function runSimpleTransition(
  supabase: Awaited<ReturnType<typeof createClient>>,
  intent: "archive" | "unpublish" | "restore",
  translationId: string,
  expectedEditRevision: number | null,
) {
  const rpc =
    intent === "archive"
      ? "tourism_package_translation_archive"
      : intent === "unpublish"
        ? "tourism_package_translation_unpublish"
        : "tourism_package_translation_restore";
  return supabase
    .rpc(rpc, {
      p_translation_id: translationId,
      p_expected_edit_revision: expectedEditRevision,
    })
    .single()
    .overrideTypes<TourismPackageTranslationRpcRow, { merge: false }>();
}

export async function manageTourismPackageTranslation(
  tourismPackageId: string,
  previousState: TourismPackageTranslationActionState,
  formData: FormData,
): Promise<TourismPackageTranslationActionState> {
  // Actor, source revisions, fingerprints, timestamps, and slug are all
  // database-owned. The form carries only a concurrency checkpoint.
  await requireAdministrator();

  const intent = readIntent(formData);
  if (!intent) {
    return databaseFailureState(
      previousState,
      "Tindakan formulir tidak valid.",
      "validation-error",
    );
  }
  if (!isValidTourismPackageId(tourismPackageId)) {
    return databaseFailureState(
      previousState,
      "Paket wisata tidak ditemukan.",
      "not-found",
    );
  }

  const postedTranslationId = readTranslationId(formData);
  const postedRevision = readExpectedEditRevision(formData);
  if (postedTranslationId === "invalid" || postedRevision === "invalid") {
    return databaseFailureState(
      previousState,
      "Checkpoint terjemahan tidak valid. Muat ulang halaman sebelum mencoba kembali.",
      "conflict",
    );
  }

  const supabase = await createClient();
  const current = await queryTourismPackageTranslationAdminData(
    supabase,
    tourismPackageId,
  );
  if (!current.success) {
    return databaseFailureState(
      previousState,
      current.kind === "not-found"
        ? "Paket wisata tidak ditemukan."
        : "Terjemahan paket wisata belum dapat dimuat. Silakan coba lagi.",
      current.kind === "not-found" ? "not-found" : "database-error",
    );
  }
  if (!checkpointMatches(current, postedTranslationId, postedRevision)) {
    return stateFromRead(current, previousState, {
      kind: "conflict",
      formErrors: [
        "Status terjemahan telah berubah. Muat ulang halaman sebelum mencoba kembali.",
      ],
      message: "Checkpoint terjemahan sudah tidak berlaku.",
    });
  }

  if (intent === "save-draft" || intent === "review") {
    const validation = validateTourismPackageTranslationFormData(formData);
    if (!validation.success) {
      return validationFailureState(
        current,
        previousState,
        validation.values,
        validation.fieldErrors,
        validation.formErrors,
      );
    }
    const sourceRule = validateTourismPackageTranslationForSource(
      current.source,
      validation.data,
    );
    if (!sourceRule.success) {
      return validationFailureState(
        current,
        previousState,
        validation.values,
        sourceRule.fieldErrors,
        sourceRule.formErrors,
        "Periksa kesesuaian sumber dan terjemahan.",
      );
    }
    if (
      current.translation &&
      current.translation.translation_status !== "draft"
    ) {
      return validationFailureState(
        current,
        previousState,
        validation.values,
        {},
        [
          "Terjemahan harus berstatus draf sebelum dapat diedit. Batalkan publikasi atau pulihkan arsip terlebih dahulu.",
        ],
        "Status terjemahan tidak mengizinkan penyuntingan.",
      );
    }
    if (intent === "review") {
      if (!terminologyReviewConfirmed(formData)) {
        return validationFailureState(
          current,
          previousState,
          validation.values,
          {},
          ["Konfirmasi review manusia wajib dipilih sebelum review."],
          "Konfirmasi review manusia diperlukan.",
        );
      }
      const eligibility = validateTourismPackageTranslationForEligibility(
        current.source,
        validation.data,
      );
      if (!eligibility.success) {
        return validationFailureState(
          current,
          previousState,
          validation.values,
          eligibility.fieldErrors,
          eligibility.formErrors,
          "Lengkapi terjemahan sebelum mengirim review.",
        );
      }
    }

    const saved = await saveDraft(
      supabase,
      tourismPackageId,
      postedRevision,
      validation.data,
    );
    const saveFailureCode = rpcRowFailureCode(saved.error, saved.data);
    if (saveFailureCode || saved.data === null) {
      console.error("Penyimpanan draf terjemahan paket wisata gagal.", {
        code: saveFailureCode,
      });
      return rpcFailureState(
        current,
        previousState,
        saveFailureCode ?? "unexpected-row-count",
        validation.values,
      );
    }
    if (intent === "save-draft") {
      return refreshAfterMutation(
        supabase,
        tourismPackageId,
        previousState,
        "Draf terjemahan paket wisata berhasil disimpan.",
      );
    }

    const reviewed = await supabase
      .rpc("tourism_package_translation_review", {
        p_translation_id: saved.data.id,
        p_expected_edit_revision: saved.data.edit_revision,
        p_terminology_review_confirmed: true,
      })
      .single()
      .overrideTypes<TourismPackageTranslationRpcRow, { merge: false }>();
    const reviewFailureCode = rpcRowFailureCode(reviewed.error, reviewed.data);
    if (reviewFailureCode || reviewed.data === null) {
      console.error("Review terjemahan paket wisata gagal.", {
        code: reviewFailureCode,
      });
      return refreshAfterMutation(
        supabase,
        tourismPackageId,
        previousState,
        reviewFailureCode === "55000"
          ? "Draf tersimpan, tetapi review gagal karena sumber, itinerary, Destination, atau gambar utama berubah."
          : "Draf tersimpan, tetapi terjemahan belum dapat dikirim untuk review.",
        "database-error",
      );
    }
    return refreshAfterMutation(
      supabase,
      tourismPackageId,
      previousState,
      "Terjemahan paket wisata berhasil dikirim untuk review.",
    );
  }

  const translation = current.translation;
  if (!translation) {
    return validationFailureState(
      current,
      previousState,
      previousState.values,
      {},
      ["Terjemahan paket wisata belum tersedia untuk tindakan lifecycle ini."],
      "Tindakan lifecycle tidak dapat dijalankan.",
    );
  }

  if (intent === "reject") {
    const reason = readRejectionReason(formData);
    if (!reason) {
      return validationFailureState(
        current,
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
        current,
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
      .rpc("tourism_package_translation_reject", {
        p_translation_id: translation.id,
        p_expected_edit_revision: postedRevision,
        p_reason: reason,
      })
      .single()
      .overrideTypes<TourismPackageTranslationRpcRow, { merge: false }>();
    const failureCode = rpcRowFailureCode(rejected.error, rejected.data);
    if (failureCode || rejected.data === null) {
      return rpcFailureState(
        current,
        previousState,
        failureCode ?? "unexpected-row-count",
        previousState.values,
        reason,
      );
    }
    return refreshAfterMutation(
      supabase,
      tourismPackageId,
      previousState,
      "Terjemahan paket wisata dikembalikan menjadi draf dengan alasan penolakan.",
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
        current,
        previousState,
        previousState.values,
        {},
        [
          intent === "publish"
            ? "Terjemahan harus reviewed dan belum pernah diterbitkan sebelum publikasi pertama."
            : "Republish memerlukan checkpoint review terbaru dan riwayat publikasi.",
        ],
        "Status publikasi tidak sesuai.",
      );
    }
    if (!translation.publication_eligibility) {
      return validationFailureState(
        current,
        previousState,
        previousState.values,
        {},
        [
          "Kelayakan publikasi belum terpenuhi. Periksa status sumber, itinerary Destination Inggris, dan terjemahan gambar utama.",
        ],
        "Kelayakan publikasi belum terpenuhi.",
      );
    }
    const publication = await supabase
      .rpc(
        intent === "publish"
          ? "tourism_package_translation_publish"
          : "tourism_package_translation_republish",
        {
          p_translation_id: translation.id,
          p_expected_edit_revision: postedRevision,
        },
      )
      .single()
      .overrideTypes<TourismPackageTranslationRpcRow, { merge: false }>();
    const failureCode = rpcRowFailureCode(publication.error, publication.data);
    if (failureCode || publication.data === null) {
      return rpcFailureState(
        current,
        previousState,
        failureCode ?? "unexpected-row-count",
      );
    }
    revalidateEnglishTourismPackagePaths([current.slug]);
    return refreshAfterMutation(
      supabase,
      tourismPackageId,
      previousState,
      intent === "publish"
        ? "Terjemahan paket wisata berhasil diterbitkan."
        : "Terjemahan paket wisata berhasil diterbitkan kembali.",
    );
  }

  const expectedStatus = intent === "restore" ? "archived" : "published";
  if (translation.translation_status !== expectedStatus) {
    return validationFailureState(
      current,
      previousState,
      previousState.values,
      {},
      [
        intent === "restore"
          ? "Hanya terjemahan yang diarsipkan yang dapat dipulihkan menjadi draf."
          : "Hanya terjemahan yang sedang diterbitkan yang dapat diarsipkan atau dibatalkan publikasinya.",
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
      current,
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
    previousState,
    intent === "archive"
      ? "Terjemahan paket wisata berhasil diarsipkan."
      : intent === "unpublish"
        ? "Publikasi terjemahan paket wisata dibatalkan dan kembali menjadi draf."
        : "Terjemahan paket wisata dipulihkan menjadi draf.",
  );
}
