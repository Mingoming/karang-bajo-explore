"use server";

import { revalidatePath } from "next/cache";

import { requireAdministrator } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";

import { isValidUmkmId } from "../umkm/model";
import {
  queryUmkmTranslationAdminData,
  type UmkmTranslationAdminReadResult,
} from "./data";
import {
  createUmkmTranslationActionState,
  validateUmkmTranslationForEligibility,
  validateUmkmTranslationForSource,
  validateUmkmTranslationFormData,
  type UmkmTranslationActionState,
  type UmkmTranslationMutationValues,
  type UmkmTranslationRpcRow,
} from "./model";

const UMKM_ADMIN_PATH = "/admin/umkm";
const ENGLISH_UMKMS_PATH = "/en/local-businesses";

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
  UmkmTranslationAdminReadResult,
  { success: true }
>;
type ParsedRevision = number | null | "invalid";
type ParsedTranslationId = string | null | "invalid";
type StateOverrides = {
  kind?: UmkmTranslationActionState["kind"];
  values?: UmkmTranslationActionState["values"];
  fieldErrors?: UmkmTranslationActionState["fieldErrors"];
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
  return isValidUmkmId(value) ? value : "invalid";
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
  previousState: UmkmTranslationActionState,
  overrides: StateOverrides = {},
) {
  return createUmkmTranslationActionState(
    current.source,
    current.translation,
    current.history,
    { ...overrides, revision: previousState.revision + 1 },
  );
}

function databaseFailureState(
  previousState: UmkmTranslationActionState,
  message = "Terjemahan umkm belum dapat diproses. Silakan coba lagi.",
  kind: UmkmTranslationActionState["kind"] = "database-error",
) {
  return {
    ...previousState,
    kind,
    fieldErrors: {},
    formErrors: [],
    message,
    revision: previousState.revision + 1,
  } satisfies UmkmTranslationActionState;
}

function validationFailureState(
  current: SuccessfulRead,
  previousState: UmkmTranslationActionState,
  values: UmkmTranslationActionState["values"],
  fieldErrors: UmkmTranslationActionState["fieldErrors"] = {},
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
  previousState: UmkmTranslationActionState,
  code: string,
  values = previousState.values,
  rejectionReason = previousState.rejectionReason,
) {
  let message = "Terjemahan umkm belum dapat diproses. Silakan coba lagi.";
  let kind: UmkmTranslationActionState["kind"] = "database-error";
  if (code === "55000") {
    kind = "conflict";
    message =
      "Status terjemahan atau sumber telah berubah. Muat ulang halaman dan ikuti alur review terbaru.";
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

function revalidateUmkmTranslationPaths(umkmId: string, sourceSlug: string) {
  revalidatePath(UMKM_ADMIN_PATH);
  revalidatePath(`${UMKM_ADMIN_PATH}/${umkmId}/edit`);
  revalidatePath(ENGLISH_UMKMS_PATH);
  revalidatePath(`${ENGLISH_UMKMS_PATH}/${encodeURIComponent(sourceSlug)}`);
}

function revalidateUmkmTranslationDetailPath(sourceSlug: string) {
  revalidatePath(`${ENGLISH_UMKMS_PATH}/${encodeURIComponent(sourceSlug)}`);
}

async function refreshAfterMutation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  umkmId: string,
  trustedPreMutationSlug: string,
  previousState: UmkmTranslationActionState,
  message: string,
  resultKind: "success" | "database-error" = "success",
) {
  revalidateUmkmTranslationPaths(umkmId, trustedPreMutationSlug);
  const refreshed = await queryUmkmTranslationAdminData(supabase, umkmId);
  if (!refreshed.success) {
    return databaseFailureState(
      previousState,
      "Perubahan tersimpan, tetapi status terbaru belum dapat dimuat. Muat ulang halaman.",
    );
  }
  if (refreshed.slug !== trustedPreMutationSlug) {
    revalidateUmkmTranslationDetailPath(refreshed.slug);
  }
  return stateFromRead(refreshed, previousState, {
    kind: resultKind,
    formErrors: resultKind === "success" ? [] : [message],
    message,
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
  row: UmkmTranslationRpcRow | null,
) {
  return error?.code ?? (row === null ? "unexpected-row-count" : null);
}

async function saveDraft(
  supabase: Awaited<ReturnType<typeof createClient>>,
  umkmId: string,
  expectedEditRevision: number | null,
  values: UmkmTranslationMutationValues,
) {
  return supabase
    .rpc("umkm_translation_save_draft", {
      p_umkm_id: umkmId,
      p_expected_edit_revision: expectedEditRevision,
      p_business_name: values.business_name,
      p_category: values.category,
      p_description: values.description,
      p_address: values.address,
    })
    .single()
    .overrideTypes<UmkmTranslationRpcRow, { merge: false }>();
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
  const rpc =
    intent === "archive"
      ? "umkm_translation_archive"
      : intent === "unpublish"
        ? "umkm_translation_unpublish"
        : "umkm_translation_restore";
  return supabase
    .rpc(rpc, args)
    .single()
    .overrideTypes<UmkmTranslationRpcRow, { merge: false }>();
}

export async function manageUmkmTranslation(
  umkmId: string,
  previousState: UmkmTranslationActionState,
  formData: FormData,
): Promise<UmkmTranslationActionState> {
  // The database derives every actor from auth.uid(). No actor, fingerprint,
  // source revision, or slug is accepted from FormData.
  await requireAdministrator();

  const intent = readIntent(formData);
  if (!intent) {
    return databaseFailureState(
      previousState,
      "Tindakan formulir tidak valid.",
      "validation-error",
    );
  }
  if (!isValidUmkmId(umkmId)) {
    return databaseFailureState(
      previousState,
      "Umkm tidak ditemukan. Muat ulang halaman daftar umkm.",
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
  const current = await queryUmkmTranslationAdminData(supabase, umkmId);
  if (!current.success) {
    return databaseFailureState(
      previousState,
      current.kind === "not-found"
        ? "Umkm tidak ditemukan."
        : "Terjemahan umkm belum dapat dimuat. Silakan coba lagi.",
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
    const validation = validateUmkmTranslationFormData(formData);
    if (!validation.success) {
      return validationFailureState(
        current,
        previousState,
        validation.values,
        validation.fieldErrors,
        validation.formErrors,
      );
    }

    const sourceRule = validateUmkmTranslationForSource(
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
          ["Konfirmasi review terminologi budaya wajib dipilih."],
          "Konfirmasi review manusia diperlukan.",
        );
      }
      const eligibility = validateUmkmTranslationForEligibility(
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
      umkmId,
      postedRevision,
      validation.data,
    );
    const saveFailureCode = rpcRowFailureCode(saved.error, saved.data);
    if (saveFailureCode || saved.data === null) {
      console.error("Penyimpanan draf terjemahan umkm gagal.", {
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
        umkmId,
        current.slug,
        previousState,
        "Draf terjemahan umkm berhasil disimpan.",
      );
    }

    const reviewed = await supabase
      .rpc("umkm_translation_review", {
        p_translation_id: saved.data.id,
        p_expected_edit_revision: saved.data.edit_revision,
        p_terminology_review_confirmed: true,
      })
      .single()
      .overrideTypes<UmkmTranslationRpcRow, { merge: false }>();
    const reviewFailureCode = rpcRowFailureCode(reviewed.error, reviewed.data);
    if (reviewFailureCode || reviewed.data === null) {
      console.error("Review terjemahan umkm gagal.", {
        code: reviewFailureCode,
      });
      return refreshAfterMutation(
        supabase,
        umkmId,
        current.slug,
        previousState,
        reviewFailureCode === "55000"
          ? "Draf tersimpan, tetapi review gagal karena sumber atau media berubah. Muat ulang lalu periksa kembali kelayakan review."
          : "Draf tersimpan, tetapi terjemahan belum dapat dikirim untuk review.",
        "database-error",
      );
    }

    return refreshAfterMutation(
      supabase,
      umkmId,
      current.slug,
      previousState,
      "Terjemahan umkm berhasil dikirim untuk review.",
    );
  }

  const translation = current.translation;
  if (!translation) {
    return validationFailureState(
      current,
      previousState,
      previousState.values,
      {},
      ["Terjemahan umkm belum tersedia untuk tindakan lifecycle ini."],
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
      .rpc("umkm_translation_reject", {
        p_translation_id: translation.id,
        p_expected_edit_revision: postedRevision,
        p_reason: reason,
      })
      .single()
      .overrideTypes<UmkmTranslationRpcRow, { merge: false }>();
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
      umkmId,
      current.slug,
      previousState,
      "Terjemahan umkm dikembalikan menjadi draf dengan alasan penolakan.",
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
          translation.eligibility_reason ||
            "Database melaporkan kelayakan publikasi belum terpenuhi.",
        ],
        "Kelayakan publikasi belum terpenuhi.",
      );
    }
    const publication = await supabase
      .rpc(
        intent === "publish"
          ? "umkm_translation_publish"
          : "umkm_translation_republish",
        {
          p_translation_id: translation.id,
          p_expected_edit_revision: postedRevision,
        },
      )
      .single()
      .overrideTypes<UmkmTranslationRpcRow, { merge: false }>();
    const failureCode = rpcRowFailureCode(publication.error, publication.data);
    if (failureCode || publication.data === null) {
      return rpcFailureState(
        current,
        previousState,
        failureCode ?? "unexpected-row-count",
      );
    }
    return refreshAfterMutation(
      supabase,
      umkmId,
      current.slug,
      previousState,
      intent === "publish"
        ? "Terjemahan umkm berhasil diterbitkan."
        : "Terjemahan umkm berhasil diterbitkan kembali.",
    );
  }

  if (intent === "archive" || intent === "unpublish" || intent === "restore") {
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
    return refreshAfterMutation(
      supabase,
      umkmId,
      current.slug,
      previousState,
      intent === "archive"
        ? "Terjemahan umkm berhasil diarsipkan."
        : intent === "unpublish"
          ? "Publikasi terjemahan umkm dibatalkan dan kembali menjadi draf."
          : "Terjemahan umkm dipulihkan menjadi draf.",
    );
  }

  return databaseFailureState(
    previousState,
    "Tindakan lifecycle tidak valid.",
    "validation-error",
  );
}
