import type { UmkmRecord, UmkmStatus } from "../umkm/model";

export const UMKM_TRANSLATION_FIELDS = [
  "business_name",
  "category",
  "description",
  "address",
] as const;

export type UmkmTranslationField = (typeof UMKM_TRANSLATION_FIELDS)[number];
export type UmkmTranslationStatus = "draft" | "published" | "archived";
export type UmkmTranslationReviewState = "pending" | "reviewed" | "rejected";
export type UmkmTranslationLifecycleState =
  "draft" | "reviewed" | "published" | "stale" | "archived" | "source-blocked";

export type UmkmTranslationSource = Pick<
  UmkmRecord,
  | "id"
  | "business_name"
  | "category"
  | "description"
  | "address"
  | "slug"
  | "source_revision"
  | "status"
  | "updated_at"
>;

export type UmkmTranslationRecord = {
  id: string;
  umkm_id: string;
  locale: "en";
  business_name: string | null;
  category: string | null;
  description: string | null;
  address: string | null;
  translation_status: UmkmTranslationStatus;
  review_state: UmkmTranslationReviewState;
  captured_source_revision: number | null;
  captured_source_fingerprint: string | null;
  captured_thumbnail_media_fingerprint: string | null;
  translation_fingerprint: string | null;
  contract_version: "umkm-v1";
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
  source_slug: string;
  source_revision: number;
  source_updated_at: string;
  source_status: UmkmStatus;
  lifecycle_state: UmkmTranslationLifecycleState;
  source_blocked: boolean;
  source_blocked_reason: string | null;
  stale_source_fingerprint: boolean;
  stale_thumbnail_media_fingerprint: boolean;
  stale_translation_fingerprint: boolean;
  public_eligibility: boolean;
  review_eligibility: boolean;
  publication_eligibility: boolean;
  eligibility_reason: string;
};

export type UmkmTranslationRpcRow = Pick<
  UmkmTranslationRecord,
  | "id"
  | "umkm_id"
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
  business_name?: string | null;
  category?: string | null;
  description?: string | null;
  address?: string | null;
};

export type UmkmTranslationReviewEvent = {
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
    | "source_changed"
    | "source_blocked";
  previous_translation_status: UmkmTranslationStatus;
  new_translation_status: UmkmTranslationStatus;
  previous_review_state: UmkmTranslationReviewState;
  new_review_state: UmkmTranslationReviewState;
  occurred_at: string;
  reason: string | null;
};

export type UmkmTranslationFormValues = Record<UmkmTranslationField, string>;
export type UmkmTranslationMutationValues = {
  business_name: string | null;
  category: string | null;
  description: string | null;
  address: string | null;
};
export type UmkmTranslationFieldErrors = Partial<
  Record<UmkmTranslationField, string>
>;

export type UmkmTranslationActionState = {
  kind:
    | "idle"
    | "validation-error"
    | "database-error"
    | "success"
    | "conflict"
    | "not-found";
  values: UmkmTranslationFormValues;
  fieldErrors: UmkmTranslationFieldErrors;
  formErrors: string[];
  message: string | null;
  rejectionReason: string;
  revision: number;
  translationId: string | null;
  editRevision: number | null;
  status: UmkmTranslationStatus | null;
  reviewState: UmkmTranslationReviewState | null;
  lifecycleState: UmkmTranslationLifecycleState;
  sourceStatus: UmkmStatus | null;
  sourceRevision: number | null;
  publicEligibility: boolean;
  reviewEligibility: boolean;
  publicationEligibility: boolean;
  eligibilityReason: string | null;
  publishedAt: string | null;
  hasPublishedBefore: boolean;
  history: UmkmTranslationReviewEvent[];
};

export type UmkmTranslationValidationResult =
  | {
      success: true;
      values: UmkmTranslationFormValues;
      data: UmkmTranslationMutationValues;
    }
  | {
      success: false;
      values: UmkmTranslationFormValues;
      fieldErrors: UmkmTranslationFieldErrors;
      formErrors: string[];
    };

export type UmkmTranslationEligibilityResult =
  | { success: true }
  | {
      success: false;
      fieldErrors: UmkmTranslationFieldErrors;
      formErrors: string[];
    };

const EMPTY_VALUES: UmkmTranslationFormValues = {
  business_name: "",
  category: "",
  description: "",
  address: "",
};

const FIELD_LABELS: Record<UmkmTranslationField, string> = {
  business_name: "Nama usaha bahasa Inggris",
  category: "Kategori usaha bahasa Inggris",
  description: "Deskripsi bahasa Inggris",
  address: "Alamat bahasa Inggris",
};

const OPTIONAL_TEXT_FIELDS = ["address"] as const;

function isTranslationField(value: string): value is UmkmTranslationField {
  return UMKM_TRANSLATION_FIELDS.some((field) => field === value);
}

function hasText(value: string | null | undefined) {
  return value !== null && value !== undefined && value.trim() !== "";
}

function normalizeOptionalText(value: string) {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function emptyUmkmTranslationFormValues() {
  return { ...EMPTY_VALUES };
}

export function umkmTranslationToFormValues(
  translation: UmkmTranslationRecord | null,
): UmkmTranslationFormValues {
  if (!translation) return emptyUmkmTranslationFormValues();
  return {
    business_name: translation.business_name ?? "",
    category: translation.category ?? "",
    description: translation.description ?? "",
    address: translation.address ?? "",
  };
}

export function validateUmkmTranslationInput(
  input: Record<string, unknown>,
): UmkmTranslationValidationResult {
  const values = emptyUmkmTranslationFormValues();
  const fieldErrors: UmkmTranslationFieldErrors = {};
  const formErrors: string[] = [];

  for (const [field, rawValue] of Object.entries(input)) {
    if (
      field.startsWith("$ACTION_") ||
      field === "intent" ||
      field === "translation_id" ||
      field === "edit_revision" ||
      field === "rejection_reason" ||
      field === "terminology_review_confirmed"
    )
      continue;
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
      business_name: normalizeOptionalText(values.business_name),
      category: normalizeOptionalText(values.category),
      description: normalizeOptionalText(values.description),
      address: normalizeOptionalText(values.address),
    },
  };
}

export function validateUmkmTranslationFormData(formData: FormData) {
  const input: Record<string, unknown> = {};
  for (const field of new Set(formData.keys())) {
    const submittedValues = formData.getAll(field);
    input[field] =
      submittedValues.length === 1 ? submittedValues[0] : submittedValues;
  }
  return validateUmkmTranslationInput(input);
}

export function validateUmkmTranslationForSource(
  source: UmkmTranslationSource,
  values: UmkmTranslationMutationValues,
): UmkmTranslationEligibilityResult {
  const fieldErrors: UmkmTranslationFieldErrors = {};
  for (const field of OPTIONAL_TEXT_FIELDS) {
    if (!hasText(source[field]) && hasText(values[field])) {
      fieldErrors[field] =
        `${FIELD_LABELS[field]} harus dikosongkan karena sumber Indonesia tidak memiliki konten.`;
    }
  }
  return Object.keys(fieldErrors).length > 0
    ? {
        success: false,
        fieldErrors,
        formErrors: [
          "Terjemahan tidak boleh menambahkan konten tanpa sumber Indonesia.",
        ],
      }
    : { success: true };
}

export function validateUmkmTranslationForEligibility(
  source: UmkmTranslationSource,
  values: UmkmTranslationMutationValues,
): UmkmTranslationEligibilityResult {
  const fieldErrors: UmkmTranslationFieldErrors = {};
  const formErrors: string[] = [];
  if (source.status !== "published")
    formErrors.push(
      "Sumber umkm harus berstatus diterbitkan sebelum review atau publikasi.",
    );
  if (!hasText(values.business_name))
    fieldErrors.business_name = `${FIELD_LABELS.business_name} wajib diisi sebelum review atau publikasi.`;
  if (!hasText(values.category))
    fieldErrors.category = `${FIELD_LABELS.category} wajib diisi sebelum review atau publikasi.`;
  if (!hasText(values.description))
    fieldErrors.description = `${FIELD_LABELS.description} wajib diisi sebelum review atau publikasi.`;
  for (const field of OPTIONAL_TEXT_FIELDS) {
    const sourceHasValue = hasText(source[field]);
    if (sourceHasValue !== hasText(values[field])) {
      fieldErrors[field] = sourceHasValue
        ? `${FIELD_LABELS[field]} wajib diisi karena sumber Indonesia memiliki konten.`
        : `${FIELD_LABELS[field]} harus dikosongkan karena sumber Indonesia tidak memiliki konten.`;
    }
  }
  if (Object.keys(fieldErrors).length > 0 || formErrors.length > 0)
    return { success: false, fieldErrors, formErrors };
  return { success: true };
}

export function createUmkmTranslationActionState(
  source: UmkmTranslationSource | null,
  translation: UmkmTranslationRecord | null,
  history: UmkmTranslationReviewEvent[] = [],
  options: Partial<UmkmTranslationActionState> = {},
): UmkmTranslationActionState {
  return {
    kind: options.kind ?? "idle",
    values: options.values ?? umkmTranslationToFormValues(translation),
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
    sourceStatus: source?.status ?? null,
    sourceRevision:
      source?.source_revision ?? translation?.source_revision ?? null,
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

export function getUmkmTranslationLifecycleLabel(
  state: UmkmTranslationLifecycleState,
) {
  return {
    draft: "Draft",
    reviewed: "Reviewed",
    published: "Published",
    stale: "Stale",
    archived: "Archived",
    "source-blocked": "Source blocked",
  }[state];
}

export function isUmkmTranslationEditable(
  status: UmkmTranslationStatus | null,
  reviewState: UmkmTranslationReviewState | null,
) {
  return (status === null || status === "draft") && reviewState !== "reviewed";
}
