"use server";

import { revalidatePath } from "next/cache";

import { requireAdministrator } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";

import { isValidDestinationId } from "../destinations/model";
import {
  queryDestinationTranslationAdminData,
  type DestinationTranslationAdminReadResult,
} from "./data";
import {
  createDestinationTranslationActionState,
  destinationTranslationToMutationValues,
  validateDestinationTranslationForEligibility,
  validateDestinationTranslationFormData,
  type DestinationTranslationActionState,
  type DestinationTranslationMutationValues,
  type DestinationTranslationRpcRow,
} from "./model";

const DESTINATION_ADMIN_PATH = "/admin/destinasi";
const ENGLISH_DESTINATIONS_PATH = "/en/destinations";

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
  DestinationTranslationAdminReadResult,
  { success: true }
>;

type StateOverrides = {
  kind?: DestinationTranslationActionState["kind"];
  values?: DestinationTranslationActionState["values"];
  fieldErrors?: DestinationTranslationActionState["fieldErrors"];
  formErrors?: string[];
  message?: string | null;
  rejectionReason?: string;
};

type ParsedRevision = number | null | "invalid";
type ParsedTranslationId = string | null | "invalid";

function readTranslationIntent(formData: FormData): TranslationIntent | null {
  const submittedValues = formData.getAll("intent");

  if (submittedValues.length !== 1 || typeof submittedValues[0] !== "string") {
    return null;
  }

  const intent = submittedValues[0];
  return TRANSLATION_INTENTS.some((candidate) => candidate === intent)
    ? (intent as TranslationIntent)
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
  current: SuccessfulRead,
  previousState: DestinationTranslationActionState,
  overrides: StateOverrides = {},
) {
  return createDestinationTranslationActionState(
    current.source,
    current.translation,
    current.publicEligibility,
    current.history,
    {
      ...overrides,
      revision: previousState.revision + 1,
    },
  );
}

function databaseFailureState(
  previousState: DestinationTranslationActionState,
  message = "Terjemahan destinasi belum dapat diproses. Silakan coba lagi.",
  values = previousState.values,
  kind: DestinationTranslationActionState["kind"] = "database-error",
) {
  return {
    ...previousState,
    kind,
    values,
    fieldErrors: {},
    formErrors: [],
    message,
    revision: previousState.revision + 1,
  } satisfies DestinationTranslationActionState;
}

function validationFailureState(
  current: SuccessfulRead,
  previousState: DestinationTranslationActionState,
  values: DestinationTranslationActionState["values"],
  fieldErrors: DestinationTranslationActionState["fieldErrors"] = {},
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
  previousState: DestinationTranslationActionState,
  code: string,
  values = previousState.values,
  rejectionReason = previousState.rejectionReason,
) {
  let message = "Terjemahan destinasi belum dapat diproses. Silakan coba lagi.";
  let kind: DestinationTranslationActionState["kind"] = "database-error";

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

function revalidateDestinationTranslationPaths(
  destinationId: string,
  sourceSlug: string,
) {
  revalidatePath(DESTINATION_ADMIN_PATH);
  revalidatePath(`${DESTINATION_ADMIN_PATH}/${destinationId}/edit`);
  revalidatePath(ENGLISH_DESTINATIONS_PATH);
  revalidatePath(
    `${ENGLISH_DESTINATIONS_PATH}/${encodeURIComponent(sourceSlug)}`,
  );
}

async function refreshAfterMutation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  destinationId: string,
  current: SuccessfulRead,
  previousState: DestinationTranslationActionState,
  successMessage: string,
) {
  revalidateDestinationTranslationPaths(destinationId, current.slug);
  const refreshed = await queryDestinationTranslationAdminData(
    supabase,
    destinationId,
  );

  if (!refreshed.success) {
    return databaseFailureState(
      previousState,
      "Perubahan tersimpan, tetapi status terbaru belum dapat dimuat. Muat ulang halaman.",
    );
  }

  return stateFromRead(refreshed, previousState, {
    kind: "success",
    message: successMessage,
  });
}

async function refreshAfterPartialMutation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  destinationId: string,
  current: SuccessfulRead,
  previousState: DestinationTranslationActionState,
  message: string,
) {
  revalidateDestinationTranslationPaths(destinationId, current.slug);
  const refreshed = await queryDestinationTranslationAdminData(
    supabase,
    destinationId,
  );

  if (!refreshed.success) {
    return databaseFailureState(previousState, message);
  }

  return stateFromRead(refreshed, previousState, {
    kind: "database-error",
    message,
  });
}

function checkpointMatches(
  current: SuccessfulRead,
  postedTranslationId: string | null,
  postedRevision: number | null,
) {
  const currentTranslationId = current.translation?.id ?? null;
  const currentRevision = current.translation?.edit_revision ?? null;
  return (
    postedTranslationId === currentTranslationId &&
    postedRevision === currentRevision
  );
}

function translationStateError(
  current: SuccessfulRead,
  previousState: DestinationTranslationActionState,
  message: string,
) {
  return stateFromRead(current, previousState, {
    kind: "validation-error",
    formErrors: [message],
    message,
  });
}

function rpcRowFailureCode(
  error: { code?: string } | null,
  row: DestinationTranslationRpcRow | null,
) {
  return error?.code ?? (row === null ? "unexpected-row-count" : null);
}

async function saveDraft(
  supabase: Awaited<ReturnType<typeof createClient>>,
  destinationId: string,
  expectedEditRevision: number | null,
  values: DestinationTranslationMutationValues,
) {
  return supabase
    .rpc("destination_translation_save_draft", {
      p_destination_id: destinationId,
      p_expected_edit_revision: expectedEditRevision,
      p_name: values.name,
      p_summary: values.summary,
      p_description: values.description,
      p_history: values.history,
      p_opening_hours: values.opening_hours,
      p_price_note: values.price_note,
      p_facilities: values.facilities,
      p_thumbnail_alt_text: values.thumbnail_alt_text,
    })
    .single()
    .overrideTypes<DestinationTranslationRpcRow, { merge: false }>();
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
      .rpc("destination_translation_archive", args)
      .single()
      .overrideTypes<DestinationTranslationRpcRow, { merge: false }>();
  }

  if (intent === "unpublish") {
    return supabase
      .rpc("destination_translation_unpublish", args)
      .single()
      .overrideTypes<DestinationTranslationRpcRow, { merge: false }>();
  }

  return supabase
    .rpc("destination_translation_restore", args)
    .single()
    .overrideTypes<DestinationTranslationRpcRow, { merge: false }>();
}

export async function manageDestinationTranslation(
  destinationId: string,
  previousState: DestinationTranslationActionState,
  formData: FormData,
): Promise<DestinationTranslationActionState> {
  // The RPCs derive created/reviewed/published actor values from auth.uid().
  // This check is repeated at the Server Action boundary and no actor value is
  // accepted from FormData.
  await requireAdministrator();

  const intent = readTranslationIntent(formData);
  if (!intent) {
    return databaseFailureState(
      previousState,
      "Tindakan formulir tidak valid.",
      previousState.values,
      "validation-error",
    );
  }

  if (!isValidDestinationId(destinationId)) {
    return databaseFailureState(
      previousState,
      "Destinasi tidak ditemukan. Muat ulang halaman daftar destinasi.",
      previousState.values,
      "not-found",
    );
  }

  const postedTranslationId = readTranslationId(formData);
  const postedRevision = readExpectedEditRevision(formData);

  if (postedTranslationId === "invalid" || postedRevision === "invalid") {
    return databaseFailureState(
      previousState,
      "Checkpoint terjemahan tidak valid. Muat ulang halaman sebelum mencoba kembali.",
      previousState.values,
      "conflict",
    );
  }

  const supabase = await createClient();
  const current = await queryDestinationTranslationAdminData(
    supabase,
    destinationId,
  );

  if (!current.success) {
    return databaseFailureState(
      previousState,
      current.kind === "not-found"
        ? "Destinasi tidak ditemukan."
        : "Terjemahan destinasi belum dapat dimuat. Silakan coba lagi.",
      previousState.values,
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
    const validation = validateDestinationTranslationFormData(formData);

    if (!validation.success) {
      return validationFailureState(
        current,
        previousState,
        validation.values,
        validation.fieldErrors,
        validation.formErrors,
      );
    }

    if (
      current.translation?.translation_status !== undefined &&
      current.translation.translation_status !== "draft"
    ) {
      return translationStateError(
        current,
        previousState,
        "Terjemahan harus berstatus draf sebelum dapat diedit. Batalkan publikasi atau pulihkan arsip terlebih dahulu.",
      );
    }

    if (intent === "review") {
      const eligibility = validateDestinationTranslationForEligibility(
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
          "Lengkapi terjemahan dan sumber yang diperlukan sebelum mengirim review.",
        );
      }
    }

    const saved = await saveDraft(
      supabase,
      destinationId,
      postedRevision,
      validation.data,
    );
    const saveFailureCode = rpcRowFailureCode(saved.error, saved.data);

    if (saveFailureCode || saved.data === null) {
      console.error("Penyimpanan draf terjemahan destinasi gagal.", {
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
        destinationId,
        current,
        previousState,
        "Draf terjemahan Inggris berhasil disimpan.",
      );
    }

    const reviewed = await supabase
      .rpc("destination_translation_review", {
        p_translation_id: saved.data.id,
        p_expected_edit_revision: saved.data.edit_revision,
      })
      .single()
      .overrideTypes<DestinationTranslationRpcRow, { merge: false }>();
    const reviewFailureCode = rpcRowFailureCode(reviewed.error, reviewed.data);

    if (reviewFailureCode || reviewed.data === null) {
      console.error("Review terjemahan destinasi gagal.", {
        code: reviewFailureCode,
      });
      return refreshAfterPartialMutation(
        supabase,
        destinationId,
        current,
        previousState,
        reviewFailureCode === "55000"
          ? "Draf tersimpan, tetapi review gagal karena sumber atau status telah berubah. Muat ulang lalu periksa kembali kelayakan review."
          : "Draf tersimpan, tetapi terjemahan belum dapat dikirim untuk review.",
      );
    }

    return refreshAfterMutation(
      supabase,
      destinationId,
      current,
      previousState,
      "Terjemahan Inggris berhasil dikirim untuk review.",
    );
  }

  const translation = current.translation;
  if (!translation) {
    return translationStateError(
      current,
      previousState,
      "Terjemahan Inggris belum tersedia untuk tindakan lifecycle ini.",
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
      return translationStateError(
        current,
        previousState,
        "Hanya draf yang menunggu review atau sudah direview yang dapat ditolak.",
      );
    }

    const rejected = await supabase
      .rpc("destination_translation_reject", {
        p_translation_id: translation.id,
        p_expected_edit_revision: postedRevision,
        p_reason: reason,
      })
      .single()
      .overrideTypes<DestinationTranslationRpcRow, { merge: false }>();
    const rejectionFailureCode = rpcRowFailureCode(
      rejected.error,
      rejected.data,
    );

    if (rejectionFailureCode || rejected.data === null) {
      console.error("Penolakan review terjemahan destinasi gagal.", {
        code: rejectionFailureCode,
      });
      return rpcFailureState(
        current,
        previousState,
        rejectionFailureCode ?? "unexpected-row-count",
        previousState.values,
        reason,
      );
    }

    return refreshAfterMutation(
      supabase,
      destinationId,
      current,
      previousState,
      "Terjemahan Inggris dikembalikan menjadi draf dengan alasan penolakan.",
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
      return translationStateError(
        current,
        previousState,
        intent === "publish"
          ? "Terjemahan harus berstatus reviewed dan belum pernah diterbitkan sebelum publikasi pertama."
          : "Republish hanya dapat dilakukan pada draf atau publikasi yang pernah diterbitkan dan masih memiliki review checkpoint.",
      );
    }

    const eligibility = validateDestinationTranslationForEligibility(
      current.source,
      destinationTranslationToMutationValues(translation),
    );
    if (!eligibility.success) {
      return validationFailureState(
        current,
        previousState,
        previousState.values,
        eligibility.fieldErrors,
        eligibility.formErrors,
        "Kelayakan terjemahan belum terpenuhi.",
      );
    }

    const publication = await supabase
      .rpc(
        intent === "publish"
          ? "destination_translation_publish"
          : "destination_translation_republish",
        {
          p_translation_id: translation.id,
          p_expected_edit_revision: postedRevision,
        },
      )
      .single()
      .overrideTypes<DestinationTranslationRpcRow, { merge: false }>();
    const publicationFailureCode = rpcRowFailureCode(
      publication.error,
      publication.data,
    );

    if (publicationFailureCode || publication.data === null) {
      console.error("Publikasi terjemahan destinasi gagal.", {
        code: publicationFailureCode,
      });
      return rpcFailureState(
        current,
        previousState,
        publicationFailureCode ?? "unexpected-row-count",
      );
    }

    return refreshAfterMutation(
      supabase,
      destinationId,
      current,
      previousState,
      intent === "publish"
        ? "Terjemahan Inggris berhasil diterbitkan."
        : "Terjemahan Inggris berhasil diterbitkan kembali.",
    );
  }

  if (intent === "archive" || intent === "unpublish" || intent === "restore") {
    const expectedStatus = intent === "restore" ? "archived" : "published";

    if (translation.translation_status !== expectedStatus) {
      return translationStateError(
        current,
        previousState,
        intent === "restore"
          ? "Hanya terjemahan yang diarsipkan yang dapat dipulihkan menjadi draf."
          : "Hanya terjemahan yang sedang diterbitkan yang dapat diarsipkan atau dibatalkan publikasinya.",
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
      console.error("Perubahan lifecycle terjemahan destinasi gagal.", {
        code: transitionFailureCode,
      });
      return rpcFailureState(
        current,
        previousState,
        transitionFailureCode ?? "unexpected-row-count",
      );
    }

    const successMessage =
      intent === "archive"
        ? "Terjemahan Inggris berhasil diarsipkan."
        : intent === "unpublish"
          ? "Terjemahan Inggris dibatalkan publikasinya dan kembali menjadi draf."
          : "Terjemahan Inggris dipulihkan menjadi draf.";

    return refreshAfterMutation(
      supabase,
      destinationId,
      current,
      previousState,
      successMessage,
    );
  }

  return databaseFailureState(
    previousState,
    "Tindakan lifecycle tidak valid.",
    previousState.values,
    "validation-error",
  );
}
