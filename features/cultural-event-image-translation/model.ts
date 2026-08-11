import type { MediaImageRecord } from "../media/model";
import type { CulturalEventStatus } from "../cultural-events/model";

export const CULTURAL_EVENT_IMAGE_TRANSLATION_FIELDS = [
  "alt_text",
  "caption",
] as const;

export type CulturalEventImageTranslationField =
  (typeof CULTURAL_EVENT_IMAGE_TRANSLATION_FIELDS)[number];
export type CulturalEventImageTranslationStatus =
  "draft" | "published" | "archived";
export type CulturalEventImageTranslationReviewState =
  "pending" | "reviewed" | "rejected";
export type CulturalEventImageTranslationLifecycleState =
  "draft" | "reviewed" | "published" | "stale" | "archived" | "rejected";

export type CulturalEventImageTranslationSource = Pick<
  MediaImageRecord,
  | "id"
  | "parentId"
  | "altText"
  | "caption"
  | "displayOrder"
  | "isPrimary"
  | "previewUrl"
>;

export type CulturalEventImageTranslationSourceContext = {
  slug: string;
  updatedAt: string;
};

export type CulturalEventImageTranslationRecord = {
  id: string;
  cultural_event_image_id: string;
  locale: "en";
  alt_text: string | null;
  caption: string | null;
  translation_status: CulturalEventImageTranslationStatus;
  review_state: CulturalEventImageTranslationReviewState;
  captured_binary_revision: number | null;
  captured_media_fingerprint: string | null;
  translation_fingerprint: string | null;
  contract_version: "cultural-event-media-v1";
  terminology_review_confirmed: boolean;
  reviewed_at: string | null;
  reviewed_by: string | null;
  rejected_at: string | null;
  rejected_by: string | null;
  review_reason: string | null;
  published_at: string | null;
  published_by: string | null;
  archived_at: string | null;
  edit_revision: number;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
  cultural_event_id: string;
  source_slug: string;
  source_revision: number;
  source_updated_at: string;
  source_status: CulturalEventStatus;
  lifecycle_state: CulturalEventImageTranslationLifecycleState;
  source_blocked: boolean;
  source_blocked_reason: string | null;
  stale_media_fingerprint: boolean;
  stale_translation_fingerprint: boolean;
  public_eligibility: boolean;
  review_eligibility: boolean;
  publication_eligibility: boolean;
  eligibility_reason: string;
};

export type CulturalEventImageTranslationRpcRow = Pick<
  CulturalEventImageTranslationRecord,
  | "id"
  | "cultural_event_image_id"
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

export type CulturalEventImageTranslationReviewEvent = {
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
  previous_translation_status: CulturalEventImageTranslationStatus;
  new_translation_status: CulturalEventImageTranslationStatus;
  previous_review_state: CulturalEventImageTranslationReviewState;
  new_review_state: CulturalEventImageTranslationReviewState;
  occurred_at: string;
  reason: string | null;
};

export type CulturalEventImageTranslationFormValues = Record<
  CulturalEventImageTranslationField,
  string
>;
export type CulturalEventImageTranslationMutationValues = {
  alt_text: string | null;
  caption: string | null;
};
export type CulturalEventImageTranslationFieldErrors = Partial<
  Record<CulturalEventImageTranslationField, string>
>;

export type CulturalEventImageTranslationActionState = {
  kind:
    | "idle"
    | "validation-error"
    | "database-error"
    | "success"
    | "conflict"
    | "not-found";
  values: CulturalEventImageTranslationFormValues;
  fieldErrors: CulturalEventImageTranslationFieldErrors;
  formErrors: string[];
  message: string | null;
  rejectionReason: string;
  revision: number;
  translationId: string | null;
  editRevision: number | null;
  status: CulturalEventImageTranslationStatus | null;
  reviewState: CulturalEventImageTranslationReviewState | null;
  lifecycleState: CulturalEventImageTranslationLifecycleState;
  sourceStatus: CulturalEventStatus | null;
  sourceBlocked: boolean;
  sourceBlockedReason: string | null;
  publicEligibility: boolean;
  reviewEligibility: boolean;
  publicationEligibility: boolean;
  eligibilityReason: string | null;
  publishedAt: string | null;
  hasPublishedBefore: boolean;
  history: CulturalEventImageTranslationReviewEvent[];
};

export type CulturalEventImageTranslationValidationResult =
  | {
      success: true;
      values: CulturalEventImageTranslationFormValues;
      data: CulturalEventImageTranslationMutationValues;
    }
  | {
      success: false;
      values: CulturalEventImageTranslationFormValues;
      fieldErrors: CulturalEventImageTranslationFieldErrors;
      formErrors: string[];
    };

const EMPTY_VALUES: CulturalEventImageTranslationFormValues = {
  alt_text: "",
  caption: "",
};

function isTranslationField(
  value: string,
): value is CulturalEventImageTranslationField {
  return CULTURAL_EVENT_IMAGE_TRANSLATION_FIELDS.some(
    (field) => field === value,
  );
}

function hasText(value: string | null | undefined) {
  return value !== null && value !== undefined && value.trim() !== "";
}

function normalizeOptionalText(value: string) {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function emptyCulturalEventImageTranslationFormValues() {
  return { ...EMPTY_VALUES };
}

export function culturalEventImageTranslationToFormValues(
  translation: CulturalEventImageTranslationRecord | null,
): CulturalEventImageTranslationFormValues {
  if (!translation) return emptyCulturalEventImageTranslationFormValues();
  return {
    alt_text: translation.alt_text ?? "",
    caption: translation.caption ?? "",
  };
}

export function validateCulturalEventImageTranslationInput(
  input: Record<string, unknown>,
): CulturalEventImageTranslationValidationResult {
  const values = emptyCulturalEventImageTranslationFormValues();
  const fieldErrors: CulturalEventImageTranslationFieldErrors = {};
  const formErrors: string[] = [];
  for (const [field, rawValue] of Object.entries(input)) {
    if (
      field.startsWith("$ACTION_") ||
      field === "intent" ||
      field === "translation_id" ||
      field === "edit_revision" ||
      field === "rejection_reason" ||
      field === "terminology_review_confirmed" ||
      field === "slug"
    ) {
      continue;
    }
    if (!isTranslationField(field)) {
      formErrors.push("Form contains an unrecognized field.");
      continue;
    }
    if (typeof rawValue !== "string") {
      fieldErrors[field] = "The image translation value is not valid.";
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

export function validateCulturalEventImageTranslationFormData(
  formData: FormData,
) {
  const input: Record<string, unknown> = {};
  for (const field of new Set(formData.keys())) {
    const submitted = formData.getAll(field);
    input[field] = submitted.length === 1 ? submitted[0] : submitted;
  }
  return validateCulturalEventImageTranslationInput(input);
}

export function validateCulturalEventImageTranslationForSource(
  source: CulturalEventImageTranslationSource,
  values: CulturalEventImageTranslationMutationValues,
) {
  if (!hasText(source.caption) && values.caption !== null) {
    return {
      success: false as const,
      fieldErrors: {
        caption:
          "English caption must remain empty because the source has no caption.",
      },
      formErrors: [
        "Image translation cannot add caption content without a source caption.",
      ],
    };
  }
  return { success: true as const };
}

export function validateCulturalEventImageTranslationForEligibility(
  source: CulturalEventImageTranslationSource,
  values: CulturalEventImageTranslationMutationValues,
  sourceStatus: CulturalEventStatus,
) {
  const fieldErrors: CulturalEventImageTranslationFieldErrors = {};
  const formErrors: string[] = [];
  if (sourceStatus !== "published") {
    formErrors.push(
      "The Indonesian source must be published before image review or publication.",
    );
  }
  if (!hasText(values.alt_text)) {
    fieldErrors.alt_text =
      "English alt text is required before review or publication.";
  }
  if (!hasText(source.altText)) {
    fieldErrors.alt_text =
      "The source alt text is invalid; publication remains fail-closed.";
  }
  if (!hasText(source.caption) && values.caption !== null) {
    fieldErrors.caption =
      "English caption must remain empty because the source has no caption.";
  }
  if (Object.keys(fieldErrors).length > 0 || formErrors.length > 0) {
    return { success: false as const, fieldErrors, formErrors };
  }
  return { success: true as const };
}

export function createCulturalEventImageTranslationActionState(
  source: CulturalEventImageTranslationSource | null,
  translation: CulturalEventImageTranslationRecord | null,
  history: CulturalEventImageTranslationReviewEvent[] = [],
  options: Partial<CulturalEventImageTranslationActionState> = {},
): CulturalEventImageTranslationActionState {
  return {
    kind: options.kind ?? "idle",
    values:
      options.values ?? culturalEventImageTranslationToFormValues(translation),
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
    sourceBlocked: translation?.source_blocked ?? false,
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

export function getCulturalEventImageTranslationLifecycleLabel(
  state: CulturalEventImageTranslationLifecycleState,
  reviewState: CulturalEventImageTranslationReviewState | null = null,
  sourceBlocked = false,
  hasTranslation = true,
) {
  if (sourceBlocked) return "Source blocked";
  if (state === "archived") return "Archived";
  if (state === "stale") return "Stale";
  if (state === "published") return "Published";
  if (state === "reviewed") return "Reviewed";
  if (state === "rejected" || reviewState === "rejected") return "Rejected";
  if (hasTranslation && reviewState === "pending") return "Awaiting review";
  return "Draft";
}

export function isCulturalEventImageTranslationEditable(
  status: CulturalEventImageTranslationStatus | null,
  reviewState: CulturalEventImageTranslationReviewState | null,
) {
  return (status === null || status === "draft") && reviewState !== "reviewed";
}
