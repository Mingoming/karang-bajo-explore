import type { MediaImageRecord } from "../media/model";
import type { UmkmStatus } from "../umkm/model";

export const UMKM_IMAGE_TRANSLATION_FIELDS = ["alt_text", "caption"] as const;

export type UmkmImageTranslationField =
  (typeof UMKM_IMAGE_TRANSLATION_FIELDS)[number];
export type UmkmImageTranslationStatus = "draft" | "published" | "archived";
export type UmkmImageTranslationReviewState =
  "pending" | "reviewed" | "rejected";
export type UmkmImageTranslationLifecycleState =
  "draft" | "reviewed" | "published" | "stale" | "archived" | "source-blocked";

export type UmkmImageTranslationSource = Pick<
  MediaImageRecord,
  | "id"
  | "parentId"
  | "altText"
  | "caption"
  | "displayOrder"
  | "isPrimary"
  | "previewUrl"
> & {
  sourceSlug: string;
  sourceRevision: number;
  sourceUpdatedAt: string;
};

export type UmkmImageTranslationRecord = {
  id: string;
  umkm_image_id: string;
  locale: "en";
  alt_text: string | null;
  caption: string | null;
  translation_status: UmkmImageTranslationStatus;
  review_state: UmkmImageTranslationReviewState;
  captured_media_fingerprint: string | null;
  translation_fingerprint: string | null;
  contract_version: "umkm-media-v1";
  terminology_review_confirmed: boolean;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_reason: string | null;
  rejected_at: string | null;
  rejected_by: string | null;
  published_at: string | null;
  published_by: string | null;
  archived_at: string | null;
  edit_revision: number;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
  umkm_id: string;
  source_slug: string;
  source_revision: number;
  source_updated_at: string;
  source_status: UmkmStatus;
  lifecycle_state: UmkmImageTranslationLifecycleState;
  source_blocked: boolean;
  source_blocked_reason: string | null;
  stale_media_fingerprint: boolean;
  stale_translation_fingerprint: boolean;
  public_eligibility: boolean;
  review_eligibility: boolean;
  publication_eligibility: boolean;
  eligibility_reason: string;
};

export type UmkmImageTranslationRpcRow = Pick<
  UmkmImageTranslationRecord,
  | "id"
  | "umkm_image_id"
  | "translation_status"
  | "review_state"
  | "review_reason"
  | "rejected_at"
  | "published_at"
  | "archived_at"
  | "reviewed_at"
  | "edit_revision"
  | "updated_at"
> & { alt_text?: string | null; caption?: string | null };

export type UmkmImageTranslationReviewEvent = {
  id: string;
  event_type:
    | "draft_saved"
    | "reviewed"
    | "rejected"
    | "published"
    | "republished"
    | "unpublished"
    | "archived"
    | "restored"
    | "media_changed";
  previous_translation_status: UmkmImageTranslationStatus;
  new_translation_status: UmkmImageTranslationStatus;
  previous_review_state: UmkmImageTranslationReviewState;
  new_review_state: UmkmImageTranslationReviewState;
  occurred_at: string;
  reason: string | null;
};

export type UmkmImageTranslationFormValues = Record<
  UmkmImageTranslationField,
  string
>;
export type UmkmImageTranslationMutationValues = {
  alt_text: string | null;
  caption: string | null;
};
export type UmkmImageTranslationFieldErrors = Partial<
  Record<UmkmImageTranslationField, string>
>;

export type UmkmImageTranslationActionState = {
  kind:
    | "idle"
    | "validation-error"
    | "database-error"
    | "success"
    | "conflict"
    | "not-found";
  values: UmkmImageTranslationFormValues;
  fieldErrors: UmkmImageTranslationFieldErrors;
  formErrors: string[];
  message: string | null;
  rejectionReason: string;
  revision: number;
  translationId: string | null;
  editRevision: number | null;
  status: UmkmImageTranslationStatus | null;
  reviewState: UmkmImageTranslationReviewState | null;
  lifecycleState: UmkmImageTranslationLifecycleState;
  sourceStatus: UmkmStatus | null;
  sourceBlockedReason: string | null;
  publicEligibility: boolean;
  reviewEligibility: boolean;
  publicationEligibility: boolean;
  eligibilityReason: string | null;
  publishedAt: string | null;
  hasPublishedBefore: boolean;
  history: UmkmImageTranslationReviewEvent[];
};

export type UmkmImageTranslationValidationResult =
  | {
      success: true;
      values: UmkmImageTranslationFormValues;
      data: UmkmImageTranslationMutationValues;
    }
  | {
      success: false;
      values: UmkmImageTranslationFormValues;
      fieldErrors: UmkmImageTranslationFieldErrors;
      formErrors: string[];
    };

const EMPTY_VALUES: UmkmImageTranslationFormValues = {
  alt_text: "",
  caption: "",
};

function isTranslationField(value: string): value is UmkmImageTranslationField {
  return UMKM_IMAGE_TRANSLATION_FIELDS.some((field) => field === value);
}

function normalizeOptionalText(value: string) {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function hasText(value: string | null | undefined) {
  return value !== null && value !== undefined && value.trim() !== "";
}

export function emptyUmkmImageTranslationFormValues() {
  return { ...EMPTY_VALUES };
}

export function umkmImageTranslationToFormValues(
  translation: UmkmImageTranslationRecord | null,
) {
  if (!translation) return emptyUmkmImageTranslationFormValues();
  return {
    alt_text: translation.alt_text ?? "",
    caption: translation.caption ?? "",
  };
}

export function validateUmkmImageTranslationInput(
  input: Record<string, unknown>,
): UmkmImageTranslationValidationResult {
  const values = emptyUmkmImageTranslationFormValues();
  const fieldErrors: UmkmImageTranslationFieldErrors = {};
  const formErrors: string[] = [];
  for (const [field, rawValue] of Object.entries(input)) {
    if (
      field.startsWith("$ACTION_") ||
      field === "intent" ||
      field === "translation_id" ||
      field === "edit_revision" ||
      field === "rejection_reason" ||
      field === "terminology_review_confirmed"
    ) {
      continue;
    }
    if (!isTranslationField(field)) {
      formErrors.push("Formulir memuat kolom yang tidak dikenali.");
      continue;
    }
    if (typeof rawValue !== "string") {
      fieldErrors[field] = "Nilai terjemahan gambar tidak valid.";
      continue;
    }
    values[field] = rawValue;
  }
  if (Object.keys(fieldErrors).length > 0 || formErrors.length > 0) {
    return {
      success: false,
      values,
      fieldErrors,
      formErrors: [...new Set(formErrors)],
    };
  }
  return {
    success: true,
    values,
    data: {
      alt_text: normalizeOptionalText(values.alt_text),
      caption: normalizeOptionalText(values.caption),
    },
  };
}

export function validateUmkmImageTranslationFormData(formData: FormData) {
  const input: Record<string, unknown> = {};
  for (const field of new Set(formData.keys())) {
    const submittedValues = formData.getAll(field);
    input[field] =
      submittedValues.length === 1 ? submittedValues[0] : submittedValues;
  }
  return validateUmkmImageTranslationInput(input);
}

export function validateUmkmImageTranslationForSource(
  source: UmkmImageTranslationSource,
  values: UmkmImageTranslationMutationValues,
) {
  if (!hasText(source.caption) && values.caption !== null) {
    return {
      success: false as const,
      fieldErrors: {
        caption:
          "Caption Inggris harus kosong karena sumber Indonesia tidak memiliki caption.",
      },
      formErrors: ["Caption tidak boleh menambahkan informasi tanpa sumber."],
    };
  }
  return { success: true as const };
}

export function validateUmkmImageTranslationForEligibility(
  source: UmkmImageTranslationSource,
  values: UmkmImageTranslationMutationValues,
  sourceStatus: UmkmStatus,
) {
  const fieldErrors: UmkmImageTranslationFieldErrors = {};
  const formErrors: string[] = [];
  if (sourceStatus !== "published") {
    formErrors.push(
      "Sumber umkm harus berstatus diterbitkan sebelum review atau publikasi.",
    );
  }
  if (!hasText(source.altText)) {
    fieldErrors.alt_text =
      "Alt text sumber tidak valid; publikasi fail-closed.";
  }
  if (!hasText(values.alt_text)) {
    fieldErrors.alt_text =
      "Alt text Inggris wajib diisi sebelum review atau publikasi.";
  }
  if (!hasText(source.caption) && values.caption !== null) {
    fieldErrors.caption =
      "Caption Inggris harus kosong karena sumber Indonesia tidak memiliki caption.";
  }
  if (Object.keys(fieldErrors).length > 0 || formErrors.length > 0) {
    return { success: false as const, fieldErrors, formErrors };
  }
  return { success: true as const };
}

export function createUmkmImageTranslationActionState(
  source: UmkmImageTranslationSource | null,
  translation: UmkmImageTranslationRecord | null,
  history: UmkmImageTranslationReviewEvent[] = [],
  options: Partial<UmkmImageTranslationActionState> = {},
): UmkmImageTranslationActionState {
  return {
    kind: options.kind ?? "idle",
    values: options.values ?? umkmImageTranslationToFormValues(translation),
    fieldErrors: options.fieldErrors ?? {},
    formErrors: options.formErrors ?? [],
    message: options.message ?? null,
    rejectionReason:
      options.rejectionReason ?? translation?.review_reason ?? "",
    revision: options.revision ?? 0,
    translationId: translation?.id ?? null,
    editRevision: translation?.edit_revision ?? null,
    status: translation?.translation_status ?? null,
    reviewState: translation?.review_state ?? null,
    lifecycleState: translation?.lifecycle_state ?? "draft",
    sourceStatus: options.sourceStatus ?? translation?.source_status ?? null,
    sourceBlockedReason: translation?.source_blocked_reason ?? null,
    publicEligibility: translation?.public_eligibility ?? false,
    reviewEligibility: translation?.review_eligibility ?? false,
    publicationEligibility: translation?.publication_eligibility ?? false,
    eligibilityReason: translation?.eligibility_reason ?? null,
    publishedAt: translation?.published_at ?? null,
    hasPublishedBefore:
      translation !== null && translation.published_at !== null,
    history,
  };
}

export function getUmkmImageTranslationLifecycleLabel(
  state: UmkmImageTranslationLifecycleState,
) {
  const labels: Record<UmkmImageTranslationLifecycleState, string> = {
    draft: "Draft",
    reviewed: "Reviewed",
    published: "Published",
    stale: "Stale",
    archived: "Archived",
    "source-blocked": "Source blocked",
  };
  return labels[state];
}

export function isUmkmImageTranslationEditable(
  status: UmkmImageTranslationStatus | null,
  reviewState: UmkmImageTranslationReviewState | null,
) {
  return (status === null || status === "draft") && reviewState !== "reviewed";
}
