import type {
  TraditionalHouseRecord,
  TraditionalHouseStatus,
} from "../traditional-houses/model";

export const TRADITIONAL_HOUSE_TRANSLATION_FIELDS = [
  "name",
  "summary",
  "description",
  "history",
  "cultural_significance",
  "location_name",
  "visitor_information",
] as const;

export type TraditionalHouseTranslationField =
  (typeof TRADITIONAL_HOUSE_TRANSLATION_FIELDS)[number];
export type TraditionalHouseTranslationStatus =
  "draft" | "published" | "archived";
export type TraditionalHouseTranslationReviewState =
  "pending" | "reviewed" | "rejected";
export type TraditionalHouseTranslationLifecycleState =
  "draft" | "reviewed" | "published" | "stale" | "archived" | "source-blocked";

export type TraditionalHouseTranslationSource = Pick<
  TraditionalHouseRecord,
  | "id"
  | "name"
  | "summary"
  | "description"
  | "history"
  | "cultural_significance"
  | "location_name"
  | "visitor_information"
  | "slug"
  | "source_revision"
  | "status"
  | "updated_at"
>;

export type TraditionalHouseTranslationRecord = {
  id: string;
  traditional_house_id: string;
  locale: "en";
  name: string | null;
  summary: string | null;
  description: string | null;
  history: string | null;
  cultural_significance: string | null;
  location_name: string | null;
  visitor_information: string | null;
  translation_status: TraditionalHouseTranslationStatus;
  review_state: TraditionalHouseTranslationReviewState;
  captured_source_revision: number | null;
  captured_source_fingerprint: string | null;
  captured_thumbnail_media_fingerprint: string | null;
  translation_fingerprint: string | null;
  contract_version: "traditional-house-v1";
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
  source_status: TraditionalHouseStatus;
  lifecycle_state: TraditionalHouseTranslationLifecycleState;
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

export type TraditionalHouseTranslationRpcRow = Pick<
  TraditionalHouseTranslationRecord,
  | "id"
  | "traditional_house_id"
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
  name?: string | null;
  summary?: string | null;
  description?: string | null;
  history?: string | null;
  cultural_significance?: string | null;
  location_name?: string | null;
  visitor_information?: string | null;
};

export type TraditionalHouseTranslationReviewEvent = {
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
  previous_translation_status: TraditionalHouseTranslationStatus;
  new_translation_status: TraditionalHouseTranslationStatus;
  previous_review_state: TraditionalHouseTranslationReviewState;
  new_review_state: TraditionalHouseTranslationReviewState;
  occurred_at: string;
  reason: string | null;
};

export type TraditionalHouseTranslationFormValues = Record<
  TraditionalHouseTranslationField,
  string
>;

export type TraditionalHouseTranslationMutationValues = Record<
  TraditionalHouseTranslationField,
  string | null
>;

export type TraditionalHouseTranslationFieldErrors = Partial<
  Record<TraditionalHouseTranslationField, string>
>;

export type TraditionalHouseTranslationActionState = {
  kind:
    | "idle"
    | "validation-error"
    | "database-error"
    | "success"
    | "conflict"
    | "not-found";
  values: TraditionalHouseTranslationFormValues;
  fieldErrors: TraditionalHouseTranslationFieldErrors;
  formErrors: string[];
  message: string | null;
  rejectionReason: string;
  revision: number;
  translationId: string | null;
  editRevision: number | null;
  status: TraditionalHouseTranslationStatus | null;
  reviewState: TraditionalHouseTranslationReviewState | null;
  lifecycleState: TraditionalHouseTranslationLifecycleState;
  sourceStatus: TraditionalHouseStatus | null;
  sourceRevision: number | null;
  publicEligibility: boolean;
  reviewEligibility: boolean;
  publicationEligibility: boolean;
  eligibilityReason: string | null;
  publishedAt: string | null;
  hasPublishedBefore: boolean;
  history: TraditionalHouseTranslationReviewEvent[];
};

export type TraditionalHouseTranslationValidationResult =
  | {
      success: true;
      values: TraditionalHouseTranslationFormValues;
      data: TraditionalHouseTranslationMutationValues;
    }
  | {
      success: false;
      values: TraditionalHouseTranslationFormValues;
      fieldErrors: TraditionalHouseTranslationFieldErrors;
      formErrors: string[];
    };

export type TraditionalHouseTranslationEligibilityResult =
  | { success: true }
  | {
      success: false;
      fieldErrors: TraditionalHouseTranslationFieldErrors;
      formErrors: string[];
    };

const EMPTY_VALUES: TraditionalHouseTranslationFormValues = {
  name: "",
  summary: "",
  description: "",
  history: "",
  cultural_significance: "",
  location_name: "",
  visitor_information: "",
};

const FIELD_LABELS: Record<TraditionalHouseTranslationField, string> = {
  name: "Nama rumah adat bahasa Inggris",
  summary: "Ringkasan bahasa Inggris",
  description: "Deskripsi bahasa Inggris",
  history: "Sejarah bahasa Inggris",
  cultural_significance: "Makna budaya bahasa Inggris",
  location_name: "Nama lokasi bahasa Inggris",
  visitor_information: "Informasi kunjungan bahasa Inggris",
};

const OPTIONAL_FIELDS = [
  "summary",
  "history",
  "cultural_significance",
  "location_name",
  "visitor_information",
] as const satisfies readonly TraditionalHouseTranslationField[];

function isTranslationField(
  value: string,
): value is TraditionalHouseTranslationField {
  return TRADITIONAL_HOUSE_TRANSLATION_FIELDS.some((field) => field === value);
}

function hasText(value: string | null | undefined) {
  return value !== null && value !== undefined && value.trim() !== "";
}

function normalizeOptionalText(value: string) {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function emptyTraditionalHouseTranslationFormValues() {
  return { ...EMPTY_VALUES };
}

export function traditionalHouseTranslationToFormValues(
  translation: TraditionalHouseTranslationRecord | null,
): TraditionalHouseTranslationFormValues {
  if (!translation) return emptyTraditionalHouseTranslationFormValues();

  return {
    name: translation.name ?? "",
    summary: translation.summary ?? "",
    description: translation.description ?? "",
    history: translation.history ?? "",
    cultural_significance: translation.cultural_significance ?? "",
    location_name: translation.location_name ?? "",
    visitor_information: translation.visitor_information ?? "",
  };
}

export function validateTraditionalHouseTranslationInput(
  input: Record<string, unknown>,
): TraditionalHouseTranslationValidationResult {
  const values = emptyTraditionalHouseTranslationFormValues();
  const fieldErrors: TraditionalHouseTranslationFieldErrors = {};
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
      name: normalizeOptionalText(values.name),
      summary: normalizeOptionalText(values.summary),
      description: normalizeOptionalText(values.description),
      history: normalizeOptionalText(values.history),
      cultural_significance: normalizeOptionalText(
        values.cultural_significance,
      ),
      location_name: normalizeOptionalText(values.location_name),
      visitor_information: normalizeOptionalText(values.visitor_information),
    },
  };
}

export function validateTraditionalHouseTranslationFormData(
  formData: FormData,
) {
  const input: Record<string, unknown> = {};
  for (const field of new Set(formData.keys())) {
    const submittedValues = formData.getAll(field);
    input[field] =
      submittedValues.length === 1 ? submittedValues[0] : submittedValues;
  }
  return validateTraditionalHouseTranslationInput(input);
}

export function validateTraditionalHouseTranslationForSource(
  source: TraditionalHouseTranslationSource,
  values: TraditionalHouseTranslationMutationValues,
): TraditionalHouseTranslationEligibilityResult {
  const fieldErrors: TraditionalHouseTranslationFieldErrors = {};

  for (const field of OPTIONAL_FIELDS) {
    const sourceHasValue = hasText(source[field]);
    const translationHasValue = hasText(values[field]);
    if (!sourceHasValue && translationHasValue) {
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

export function validateTraditionalHouseTranslationForEligibility(
  source: TraditionalHouseTranslationSource,
  values: TraditionalHouseTranslationMutationValues,
): TraditionalHouseTranslationEligibilityResult {
  const fieldErrors: TraditionalHouseTranslationFieldErrors = {};
  const formErrors: string[] = [];

  if (source.status !== "published") {
    formErrors.push(
      "Sumber rumah adat harus berstatus diterbitkan sebelum review atau publikasi.",
    );
  }

  if (!hasText(values.name)) {
    fieldErrors.name = `${FIELD_LABELS.name} wajib diisi sebelum review atau publikasi.`;
  }
  if (!hasText(values.description)) {
    fieldErrors.description = `${FIELD_LABELS.description} wajib diisi sebelum review atau publikasi.`;
  }

  for (const field of OPTIONAL_FIELDS) {
    const sourceHasValue = hasText(source[field]);
    const translationHasValue = hasText(values[field]);
    if (sourceHasValue !== translationHasValue) {
      fieldErrors[field] = sourceHasValue
        ? `${FIELD_LABELS[field]} wajib diisi karena sumber Indonesia memiliki konten.`
        : `${FIELD_LABELS[field]} harus dikosongkan karena sumber Indonesia tidak memiliki konten.`;
    }
  }

  if (Object.keys(fieldErrors).length > 0 || formErrors.length > 0) {
    return { success: false, fieldErrors, formErrors };
  }
  return { success: true };
}

export function createTraditionalHouseTranslationActionState(
  source: TraditionalHouseTranslationSource | null,
  translation: TraditionalHouseTranslationRecord | null,
  history: TraditionalHouseTranslationReviewEvent[] = [],
  options: Partial<TraditionalHouseTranslationActionState> = {},
): TraditionalHouseTranslationActionState {
  return {
    kind: options.kind ?? "idle",
    values:
      options.values ?? traditionalHouseTranslationToFormValues(translation),
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
      translation?.published_at !== null && translation !== null,
    history,
  };
}

export function getTraditionalHouseTranslationLifecycleLabel(
  state: TraditionalHouseTranslationLifecycleState,
) {
  const labels: Record<TraditionalHouseTranslationLifecycleState, string> = {
    draft: "Draft",
    reviewed: "Reviewed",
    published: "Published",
    stale: "Stale",
    archived: "Archived",
    "source-blocked": "Source blocked",
  };
  return labels[state];
}

export function isTraditionalHouseTranslationEditable(
  status: TraditionalHouseTranslationStatus | null,
  reviewState: TraditionalHouseTranslationReviewState | null,
) {
  return (status === null || status === "draft") && reviewState !== "reviewed";
}
