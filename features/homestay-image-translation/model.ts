import type { MediaImageRecord } from "../media/model";
import type { HomestayStatus } from "../homestays/model";

export const HOMESTAY_IMAGE_TRANSLATION_FIELDS = [
  "alt_text",
  "caption",
] as const;

export type HomestayImageTranslationField =
  (typeof HOMESTAY_IMAGE_TRANSLATION_FIELDS)[number];
export type HomestayImageTranslationStatus = "draft" | "published" | "archived";
export type HomestayImageTranslationReviewState =
  "pending" | "reviewed" | "rejected";
export type HomestayImageTranslationLifecycleState =
  "draft" | "reviewed" | "published" | "stale" | "archived" | "source-blocked";

export type HomestayImageTranslationSource = Pick<
  MediaImageRecord,
  | "id"
  | "parentId"
  | "altText"
  | "caption"
  | "displayOrder"
  | "isPrimary"
  | "previewUrl"
>;

export type HomestayImageTranslationRecord = {
  id: string;
  homestay_image_id: string;
  locale: "en";
  alt_text: string | null;
  caption: string | null;
  translation_status: HomestayImageTranslationStatus;
  review_state: HomestayImageTranslationReviewState;
  captured_media_fingerprint: string | null;
  translation_fingerprint: string | null;
  contract_version: "homestay-media-v1";
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
  homestay_id: string;
  source_slug: string;
  source_revision: number;
  source_updated_at: string;
  source_status: HomestayStatus;
  lifecycle_state: HomestayImageTranslationLifecycleState;
  source_blocked: boolean;
  source_blocked_reason: string | null;
  stale_media_fingerprint: boolean;
  stale_translation_fingerprint: boolean;
  public_eligibility: boolean;
  review_eligibility: boolean;
  publication_eligibility: boolean;
  eligibility_reason: string;
};

export type HomestayImageTranslationRpcRow = Pick<
  HomestayImageTranslationRecord,
  | "id"
  | "homestay_image_id"
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

export type HomestayImageTranslationReviewEvent = {
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
  previous_translation_status: HomestayImageTranslationStatus;
  new_translation_status: HomestayImageTranslationStatus;
  previous_review_state: HomestayImageTranslationReviewState;
  new_review_state: HomestayImageTranslationReviewState;
  occurred_at: string;
  reason: string | null;
};

export type HomestayImageTranslationFormValues = Record<
  HomestayImageTranslationField,
  string
>;
export type HomestayImageTranslationMutationValues = {
  alt_text: string | null;
  caption: string | null;
};
export type HomestayImageTranslationFieldErrors = Partial<
  Record<HomestayImageTranslationField, string>
>;

export type HomestayImageTranslationActionState = {
  kind:
    | "idle"
    | "validation-error"
    | "database-error"
    | "success"
    | "conflict"
    | "not-found";
  values: HomestayImageTranslationFormValues;
  fieldErrors: HomestayImageTranslationFieldErrors;
  formErrors: string[];
  message: string | null;
  rejectionReason: string;
  revision: number;
  translationId: string | null;
  editRevision: number | null;
  status: HomestayImageTranslationStatus | null;
  reviewState: HomestayImageTranslationReviewState | null;
  lifecycleState: HomestayImageTranslationLifecycleState;
  sourceStatus: HomestayStatus | null;
  publicEligibility: boolean;
  reviewEligibility: boolean;
  publicationEligibility: boolean;
  eligibilityReason: string | null;
  publishedAt: string | null;
  hasPublishedBefore: boolean;
  history: HomestayImageTranslationReviewEvent[];
};

export type HomestayImageTranslationValidationResult =
  | {
      success: true;
      values: HomestayImageTranslationFormValues;
      data: HomestayImageTranslationMutationValues;
    }
  | {
      success: false;
      values: HomestayImageTranslationFormValues;
      fieldErrors: HomestayImageTranslationFieldErrors;
      formErrors: string[];
    };

const EMPTY_VALUES: HomestayImageTranslationFormValues = {
  alt_text: "",
  caption: "",
};

function isTranslationField(
  value: string,
): value is HomestayImageTranslationField {
  return HOMESTAY_IMAGE_TRANSLATION_FIELDS.some((field) => field === value);
}

function normalizeOptionalText(value: string) {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function hasText(value: string | null | undefined) {
  return value !== null && value !== undefined && value.trim() !== "";
}

export function emptyHomestayImageTranslationFormValues() {
  return { ...EMPTY_VALUES };
}

export function homestayImageTranslationToFormValues(
  translation: HomestayImageTranslationRecord | null,
) {
  if (!translation) return emptyHomestayImageTranslationFormValues();
  return {
    alt_text: translation.alt_text ?? "",
    caption: translation.caption ?? "",
  };
}

export function validateHomestayImageTranslationInput(
  input: Record<string, unknown>,
): HomestayImageTranslationValidationResult {
  const values = emptyHomestayImageTranslationFormValues();
  const fieldErrors: HomestayImageTranslationFieldErrors = {};
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

export function validateHomestayImageTranslationFormData(formData: FormData) {
  const input: Record<string, unknown> = {};
  for (const field of new Set(formData.keys())) {
    const submittedValues = formData.getAll(field);
    input[field] =
      submittedValues.length === 1 ? submittedValues[0] : submittedValues;
  }
  return validateHomestayImageTranslationInput(input);
}

export function validateHomestayImageTranslationForSource(
  source: HomestayImageTranslationSource,
  values: HomestayImageTranslationMutationValues,
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

export function validateHomestayImageTranslationForEligibility(
  source: HomestayImageTranslationSource,
  values: HomestayImageTranslationMutationValues,
  sourceStatus: HomestayStatus,
) {
  const fieldErrors: HomestayImageTranslationFieldErrors = {};
  const formErrors: string[] = [];
  if (sourceStatus !== "published") {
    formErrors.push(
      "Sumber homestay harus berstatus diterbitkan sebelum review atau publikasi.",
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

export function createHomestayImageTranslationActionState(
  source: HomestayImageTranslationSource | null,
  translation: HomestayImageTranslationRecord | null,
  history: HomestayImageTranslationReviewEvent[] = [],
  options: Partial<HomestayImageTranslationActionState> = {},
): HomestayImageTranslationActionState {
  return {
    kind: options.kind ?? "idle",
    values: options.values ?? homestayImageTranslationToFormValues(translation),
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

export function getHomestayImageTranslationLifecycleLabel(
  state: HomestayImageTranslationLifecycleState,
) {
  const labels: Record<HomestayImageTranslationLifecycleState, string> = {
    draft: "Draft",
    reviewed: "Reviewed",
    published: "Published",
    stale: "Stale",
    archived: "Archived",
    "source-blocked": "Source blocked",
  };
  return labels[state];
}

export function isHomestayImageTranslationEditable(
  status: HomestayImageTranslationStatus | null,
  reviewState: HomestayImageTranslationReviewState | null,
) {
  return (status === null || status === "draft") && reviewState !== "reviewed";
}
