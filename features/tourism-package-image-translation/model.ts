import type { MediaImageRecord } from "../media/model";
import type { TourismPackageStatus } from "../tourism-packages/model";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidId(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function isValidSlug(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

export const TOURISM_PACKAGE_IMAGE_TRANSLATION_FIELDS = [
  "alt_text",
  "caption",
] as const;

export type TourismPackageImageTranslationField =
  (typeof TOURISM_PACKAGE_IMAGE_TRANSLATION_FIELDS)[number];
export type TourismPackageImageTranslationStatus =
  "draft" | "published" | "archived";
export type TourismPackageImageTranslationReviewState =
  "pending" | "reviewed" | "rejected";
export type TourismPackageImageTranslationLifecycleState =
  | "draft"
  | "reviewed"
  | "published"
  | "stale"
  | "archived"
  | "rejected"
  | "source-blocked";

export type TourismPackageImageTranslationSource = Pick<
  MediaImageRecord,
  | "id"
  | "parentId"
  | "altText"
  | "caption"
  | "displayOrder"
  | "isPrimary"
  | "previewUrl"
>;

export type TourismPackageImageTranslationRecord = {
  id: string;
  package_image_id: string;
  locale: "en";
  alt_text: string | null;
  caption: string | null;
  translation_status: TourismPackageImageTranslationStatus;
  review_state: TourismPackageImageTranslationReviewState;
  captured_media_fingerprint: string | null;
  translation_fingerprint: string | null;
  contract_version: "tourism-package-media-v1";
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
  tourism_package_id: string;
  source_slug: string;
  aggregate_revision: number;
  source_updated_at: string;
  source_status: TourismPackageStatus;
  lifecycle_state: TourismPackageImageTranslationLifecycleState;
  source_blocked: boolean;
  source_blocked_reason: string | null;
  stale_media_fingerprint: boolean;
  stale_translation_fingerprint: boolean;
  public_eligibility: boolean;
  review_eligibility: boolean;
  publication_eligibility: boolean;
  eligibility_reason: string;
};

export type TourismPackageImageTranslationRpcRow = Pick<
  TourismPackageImageTranslationRecord,
  | "id"
  | "package_image_id"
  | "translation_status"
  | "review_state"
  | "review_reason"
  | "rejected_at"
  | "published_at"
  | "archived_at"
  | "reviewed_at"
  | "edit_revision"
  | "updated_at"
> & {
  alt_text?: string | null;
  caption?: string | null;
};

export type TourismPackageImageTranslationReviewEvent = {
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
  previous_translation_status: TourismPackageImageTranslationStatus;
  new_translation_status: TourismPackageImageTranslationStatus;
  previous_review_state: TourismPackageImageTranslationReviewState;
  new_review_state: TourismPackageImageTranslationReviewState;
  occurred_at: string;
  reason: string | null;
};

export type TourismPackageImageTranslationFormValues = Record<
  TourismPackageImageTranslationField,
  string
>;
export type TourismPackageImageTranslationMutationValues = {
  alt_text: string | null;
  caption: string | null;
};
export type TourismPackageImageTranslationFieldErrors = Partial<
  Record<TourismPackageImageTranslationField, string>
>;

export type TourismPackageImageTranslationActionState = {
  kind:
    | "idle"
    | "validation-error"
    | "database-error"
    | "success"
    | "conflict"
    | "not-found";
  values: TourismPackageImageTranslationFormValues;
  fieldErrors: TourismPackageImageTranslationFieldErrors;
  formErrors: string[];
  message: string | null;
  rejectionReason: string;
  revision: number;
  translationId: string | null;
  editRevision: number | null;
  status: TourismPackageImageTranslationStatus | null;
  reviewState: TourismPackageImageTranslationReviewState | null;
  lifecycleState: TourismPackageImageTranslationLifecycleState;
  sourceStatus: TourismPackageStatus | null;
  publicEligibility: boolean;
  reviewEligibility: boolean;
  publicationEligibility: boolean;
  sourceBlocked: boolean;
  sourceBlockedReason: string | null;
  staleMediaFingerprint: boolean;
  staleTranslationFingerprint: boolean;
  eligibilityReason: string | null;
  publishedAt: string | null;
  hasPublishedBefore: boolean;
  history: TourismPackageImageTranslationReviewEvent[];
};

export type TourismPackageImageTranslationValidationResult =
  | {
      success: true;
      values: TourismPackageImageTranslationFormValues;
      data: TourismPackageImageTranslationMutationValues;
    }
  | {
      success: false;
      values: TourismPackageImageTranslationFormValues;
      fieldErrors: TourismPackageImageTranslationFieldErrors;
      formErrors: string[];
    };

const EMPTY_VALUES: TourismPackageImageTranslationFormValues = {
  alt_text: "",
  caption: "",
};

function isTranslationField(
  value: string,
): value is TourismPackageImageTranslationField {
  return TOURISM_PACKAGE_IMAGE_TRANSLATION_FIELDS.some(
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

export function emptyTourismPackageImageTranslationFormValues() {
  return { ...EMPTY_VALUES };
}

export function tourismPackageImageTranslationToFormValues(
  translation: TourismPackageImageTranslationRecord | null,
): TourismPackageImageTranslationFormValues {
  if (!translation) return emptyTourismPackageImageTranslationFormValues();
  return {
    alt_text: translation.alt_text ?? "",
    caption: translation.caption ?? "",
  };
}

export function validateTourismPackageImageTranslationInput(
  input: Record<string, unknown>,
): TourismPackageImageTranslationValidationResult {
  const values = emptyTourismPackageImageTranslationFormValues();
  const fieldErrors: TourismPackageImageTranslationFieldErrors = {};
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

export function validateTourismPackageImageTranslationFormData(
  formData: FormData,
) {
  const input: Record<string, unknown> = {};
  for (const field of new Set(formData.keys())) {
    const submitted = formData.getAll(field);
    input[field] = submitted.length === 1 ? submitted[0] : submitted;
  }
  return validateTourismPackageImageTranslationInput(input);
}

export function validateTourismPackageImageTranslationForSource(
  source: TourismPackageImageTranslationSource,
  values: TourismPackageImageTranslationMutationValues,
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

export function validateTourismPackageImageTranslationForEligibility(
  source: TourismPackageImageTranslationSource,
  values: TourismPackageImageTranslationMutationValues,
  sourceStatus: TourismPackageStatus,
) {
  const fieldErrors: TourismPackageImageTranslationFieldErrors = {};
  const formErrors: string[] = [];
  if (sourceStatus !== "published") {
    formErrors.push(
      "Paket wisata Indonesia harus diterbitkan sebelum terjemahan gambar dapat ditinjau atau diterbitkan.",
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

export function createTourismPackageImageTranslationActionState(
  source: TourismPackageImageTranslationSource | null,
  translation: TourismPackageImageTranslationRecord | null,
  history: TourismPackageImageTranslationReviewEvent[] = [],
  options: Partial<TourismPackageImageTranslationActionState> = {},
): TourismPackageImageTranslationActionState {
  return {
    kind: options.kind ?? "idle",
    values:
      options.values ?? tourismPackageImageTranslationToFormValues(translation),
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
    sourceBlocked: translation?.source_blocked ?? false,
    sourceBlockedReason: translation?.source_blocked_reason ?? null,
    staleMediaFingerprint: translation?.stale_media_fingerprint ?? false,
    staleTranslationFingerprint:
      translation?.stale_translation_fingerprint ?? false,
    eligibilityReason: translation?.eligibility_reason ?? null,
    publishedAt: translation?.published_at ?? null,
    hasPublishedBefore:
      translation !== null && translation.published_at !== null,
    history,
  };
}

export function getTourismPackageImageTranslationLifecycleLabel(
  state: TourismPackageImageTranslationLifecycleState,
) {
  return {
    draft: "Draft",
    reviewed: "Reviewed",
    published: "Published",
    stale: "Stale",
    archived: "Archived",
    rejected: "Rejected",
    "source-blocked": "Source blocked",
  }[state];
}

export function isTourismPackageImageTranslationEditable(
  status: TourismPackageImageTranslationStatus | null,
  reviewState: TourismPackageImageTranslationReviewState | null,
) {
  return (status === null || status === "draft") && reviewState !== "reviewed";
}

export function isTourismPackageImageTranslationRecord(
  value: unknown,
): value is TourismPackageImageTranslationRecord {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  const status = row.translation_status;
  const reviewState = row.review_state;
  const lifecycle = row.lifecycle_state;
  const validStatus =
    status === "draft" || status === "published" || status === "archived";
  const validReviewState =
    reviewState === "pending" ||
    reviewState === "reviewed" ||
    reviewState === "rejected";
  const validLifecycle = [
    "draft",
    "reviewed",
    "published",
    "stale",
    "archived",
    "rejected",
    "source-blocked",
  ].includes(String(lifecycle));
  const nullableString = (field: string) =>
    row[field] === null || typeof row[field] === "string";
  const nullableUuid = (field: string) =>
    row[field] === null || isValidId(row[field]);
  const positiveInteger = (field: string) =>
    typeof row[field] === "number" &&
    Number.isSafeInteger(row[field]) &&
    row[field] > 0;
  return (
    typeof row.id === "string" &&
    isValidId(row.id) &&
    typeof row.package_image_id === "string" &&
    isValidId(row.package_image_id) &&
    row.locale === "en" &&
    nullableString("alt_text") &&
    nullableString("caption") &&
    validStatus &&
    validReviewState &&
    nullableString("captured_media_fingerprint") &&
    nullableString("translation_fingerprint") &&
    row.contract_version === "tourism-package-media-v1" &&
    typeof row.terminology_review_confirmed === "boolean" &&
    ["reviewed_at", "rejected_at", "published_at", "archived_at"].every(
      nullableString,
    ) &&
    ["reviewed_by", "rejected_by", "published_by"].every(nullableUuid) &&
    positiveInteger("edit_revision") &&
    typeof row.created_at === "string" &&
    typeof row.updated_at === "string" &&
    typeof row.created_by === "string" &&
    isValidId(row.created_by) &&
    typeof row.updated_by === "string" &&
    isValidId(row.updated_by) &&
    typeof row.tourism_package_id === "string" &&
    isValidId(row.tourism_package_id) &&
    typeof row.source_slug === "string" &&
    isValidSlug(row.source_slug) &&
    typeof row.source_updated_at === "string" &&
    positiveInteger("aggregate_revision") &&
    (row.source_status === "draft" ||
      row.source_status === "published" ||
      row.source_status === "archived") &&
    validLifecycle &&
    typeof row.source_blocked === "boolean" &&
    nullableString("source_blocked_reason") &&
    typeof row.stale_media_fingerprint === "boolean" &&
    typeof row.stale_translation_fingerprint === "boolean" &&
    typeof row.public_eligibility === "boolean" &&
    typeof row.review_eligibility === "boolean" &&
    typeof row.publication_eligibility === "boolean" &&
    typeof row.eligibility_reason === "string" &&
    (reviewState === "reviewed"
      ? typeof row.reviewed_at === "string" &&
        isValidId(row.reviewed_by) &&
        row.terminology_review_confirmed === true &&
        isNonEmptyString(row.captured_media_fingerprint) &&
        isNonEmptyString(row.translation_fingerprint)
      : row.reviewed_at === null &&
        row.reviewed_by === null &&
        row.terminology_review_confirmed === false &&
        row.captured_media_fingerprint === null &&
        row.translation_fingerprint === null) &&
    (reviewState === "rejected"
      ? typeof row.rejected_at === "string" &&
        isValidId(row.rejected_by) &&
        isNonEmptyString(row.review_reason)
      : row.rejected_at === null &&
        row.rejected_by === null &&
        row.review_reason === null) &&
    (status !== "published" ||
      (reviewState === "reviewed" &&
        row.published_at !== null &&
        isValidId(row.published_by) &&
        row.archived_at === null)) &&
    (status === "archived") === (row.archived_at !== null) &&
    (status !== "archived" || reviewState === "pending")
  );
}
