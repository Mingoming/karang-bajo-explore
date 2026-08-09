import type { MediaImageRecord } from "../media/model";

export const DESTINATION_IMAGE_TRANSLATION_FIELDS = [
  "alt_text",
  "caption",
] as const;

export type DestinationImageTranslationField =
  (typeof DESTINATION_IMAGE_TRANSLATION_FIELDS)[number];

export type DestinationImageTranslationStatus =
  "draft" | "published" | "archived";

export type DestinationImageTranslationReviewState =
  "pending" | "reviewed" | "rejected";

export type DestinationImageTranslationPublicEligibility =
  "eligible" | "blocked" | "unknown";

export type DestinationImageTranslationLifecycleStatus =
  "draft" | "awaiting-review" | "reviewed" | "published" | "stale" | "archived";

export type DestinationImageTranslationSource = Pick<
  MediaImageRecord,
  | "id"
  | "parentId"
  | "altText"
  | "caption"
  | "displayOrder"
  | "isPrimary"
  | "previewUrl"
>;

export type DestinationImageTranslationRecord = {
  id: string;
  destination_image_id: string;
  locale: "en";
  alt_text: string;
  caption: string | null;
  translation_status: DestinationImageTranslationStatus;
  review_state: DestinationImageTranslationReviewState;
  review_reason: string | null;
  rejected_at: string | null;
  published_at: string | null;
  archived_at: string | null;
  reviewed_at: string | null;
  updated_at: string;
  edit_revision: number;
};

export type DestinationImageTranslationRpcRow = Pick<
  DestinationImageTranslationRecord,
  | "id"
  | "destination_image_id"
  | "translation_status"
  | "review_state"
  | "review_reason"
  | "rejected_at"
  | "published_at"
  | "archived_at"
  | "reviewed_at"
  | "edit_revision"
  | "updated_at"
>;

export type DestinationImageTranslationReviewEvent = {
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
  previous_translation_status: DestinationImageTranslationStatus;
  new_translation_status: DestinationImageTranslationStatus;
  previous_review_state: DestinationImageTranslationReviewState;
  new_review_state: DestinationImageTranslationReviewState;
  occurred_at: string;
  reason: string | null;
};

export type DestinationImageTranslationFormValues = Record<
  DestinationImageTranslationField,
  string
>;

export type DestinationImageTranslationMutationValues = {
  alt_text: string;
  caption: string | null;
};

export type DestinationImageTranslationFieldErrors = Partial<
  Record<DestinationImageTranslationField, string>
>;

export type DestinationImageTranslationActionState = {
  kind:
    | "idle"
    | "validation-error"
    | "database-error"
    | "success"
    | "conflict"
    | "not-found";
  values: DestinationImageTranslationFormValues;
  fieldErrors: DestinationImageTranslationFieldErrors;
  formErrors: string[];
  message: string | null;
  rejectionReason: string;
  revision: number;
  translationId: string | null;
  editRevision: number | null;
  status: DestinationImageTranslationStatus | null;
  reviewState: DestinationImageTranslationReviewState | null;
  publicEligibility: DestinationImageTranslationPublicEligibility;
  publishedAt: string | null;
  hasPublishedBefore: boolean;
  history: DestinationImageTranslationReviewEvent[];
};

export type DestinationImageTranslationValidationResult =
  | {
      success: true;
      values: DestinationImageTranslationFormValues;
      data: DestinationImageTranslationMutationValues;
    }
  | {
      success: false;
      values: DestinationImageTranslationFormValues;
      fieldErrors: DestinationImageTranslationFieldErrors;
      formErrors: string[];
    };

type ActionStateOptions = {
  kind?: DestinationImageTranslationActionState["kind"];
  values?: DestinationImageTranslationFormValues;
  fieldErrors?: DestinationImageTranslationFieldErrors;
  formErrors?: string[];
  message?: string | null;
  rejectionReason?: string;
  revision?: number;
};

const EMPTY_VALUES: DestinationImageTranslationFormValues = {
  alt_text: "",
  caption: "",
};

const FIELD_LABELS: Record<DestinationImageTranslationField, string> = {
  alt_text: "Alt text gambar bahasa Inggris",
  caption: "Keterangan gambar bahasa Inggris",
};

function isTranslationField(
  value: string,
): value is DestinationImageTranslationField {
  return DESTINATION_IMAGE_TRANSLATION_FIELDS.some((field) => field === value);
}

function normalizeOptionalText(value: string) {
  const trimmedValue = value.trim();
  return trimmedValue === "" ? null : trimmedValue;
}

export function emptyDestinationImageTranslationFormValues() {
  return { ...EMPTY_VALUES };
}

export function destinationImageTranslationToFormValues(
  translation: DestinationImageTranslationRecord | null,
): DestinationImageTranslationFormValues {
  if (!translation) return emptyDestinationImageTranslationFormValues();

  return {
    alt_text: translation.alt_text ?? "",
    caption: translation.caption ?? "",
  };
}

export function destinationImageTranslationToMutationValues(
  translation: DestinationImageTranslationRecord,
): DestinationImageTranslationMutationValues {
  return {
    alt_text: translation.alt_text.trim(),
    caption: normalizeOptionalText(translation.caption ?? ""),
  };
}

export function validateDestinationImageTranslationInput(
  input: Record<string, unknown>,
): DestinationImageTranslationValidationResult {
  const values = emptyDestinationImageTranslationFormValues();
  const fieldErrors: DestinationImageTranslationFieldErrors = {};
  const formErrors: string[] = [];

  for (const [field, rawValue] of Object.entries(input)) {
    if (
      field.startsWith("$ACTION_") ||
      field === "intent" ||
      field === "translation_id" ||
      field === "edit_revision" ||
      field === "rejection_reason"
    ) {
      continue;
    }

    if (!isTranslationField(field)) {
      formErrors.push("Formulir memuat kolom yang tidak dikenali.");
      continue;
    }

    if (typeof rawValue !== "string") {
      fieldErrors[field] =
        `${FIELD_LABELS[field]} memiliki nilai yang tidak valid.`;
      continue;
    }

    values[field] = rawValue;
  }

  if (values.alt_text.trim() === "") {
    fieldErrors.alt_text = `${FIELD_LABELS.alt_text} wajib diisi.`;
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
      alt_text: values.alt_text.trim(),
      caption: normalizeOptionalText(values.caption),
    },
  };
}

export function validateDestinationImageTranslationFormData(
  formData: FormData,
) {
  const input: Record<string, unknown> = {};

  for (const field of new Set(formData.keys())) {
    const submittedValues = formData.getAll(field);
    input[field] =
      submittedValues.length === 1 ? submittedValues[0] : submittedValues;
  }

  return validateDestinationImageTranslationInput(input);
}

export function isDestinationImageTranslationEditable(
  status: DestinationImageTranslationStatus | null,
  reviewState: DestinationImageTranslationReviewState | null,
) {
  return (status === null || status === "draft") && reviewState !== "reviewed";
}

export function getDestinationImageTranslationLifecycleStatus(
  status: DestinationImageTranslationStatus | null,
  reviewState: DestinationImageTranslationReviewState | null,
  publicEligibility: DestinationImageTranslationPublicEligibility,
): DestinationImageTranslationLifecycleStatus {
  if (status === "archived") return "archived";

  if (status === "published") {
    return publicEligibility === "blocked" ? "stale" : "published";
  }

  if (reviewState === "reviewed") return "reviewed";
  if (reviewState === "pending") return "awaiting-review";
  return "draft";
}

export function getDestinationImageTranslationLifecycleLabel(
  lifecycleStatus: DestinationImageTranslationLifecycleStatus,
) {
  const labels: Record<DestinationImageTranslationLifecycleStatus, string> = {
    draft: "Draft",
    "awaiting-review": "Awaiting review",
    reviewed: "Reviewed",
    published: "Published",
    stale: "Stale",
    archived: "Archived",
  };

  return labels[lifecycleStatus];
}

export function createDestinationImageTranslationActionState(
  translation: DestinationImageTranslationRecord | null,
  publicEligibility: DestinationImageTranslationPublicEligibility,
  history: DestinationImageTranslationReviewEvent[] = [],
  options: ActionStateOptions = {},
): DestinationImageTranslationActionState {
  return {
    kind: options.kind ?? "idle",
    values:
      options.values ?? destinationImageTranslationToFormValues(translation),
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
    publicEligibility,
    publishedAt: translation?.published_at ?? null,
    hasPublishedBefore:
      translation !== null && translation.published_at !== null,
    history,
  };
}
