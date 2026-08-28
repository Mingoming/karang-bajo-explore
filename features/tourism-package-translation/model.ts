import type {
  TourismPackageRecord,
  TourismPackageStatus,
} from "../tourism-packages/model";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isValidId(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function isValidSlug(value: unknown): value is string {
  return typeof value === "string" && SLUG_PATTERN.test(value);
}

export const TOURISM_PACKAGE_TRANSLATION_FIELDS = [
  "name",
  "duration_unit",
  "price_note",
  "included_facilities",
  "souvenir",
  "summary",
  "description",
] as const;

export type TourismPackageTranslationField =
  (typeof TOURISM_PACKAGE_TRANSLATION_FIELDS)[number];
export type TourismPackageTranslationStatus =
  "draft" | "published" | "archived";
export type TourismPackageTranslationReviewState =
  "pending" | "reviewed" | "rejected";
export type TourismPackageTranslationLifecycleState =
  | "draft"
  | "reviewed"
  | "published"
  | "stale"
  | "archived"
  | "rejected"
  | "source-blocked";

export type TourismPackageTranslationSource = Pick<
  TourismPackageRecord,
  | "id"
  | "name"
  | "slug"
  | "package_type"
  | "duration_value"
  | "duration_unit"
  | "price"
  | "price_note"
  | "included_facilities"
  | "souvenir"
  | "summary"
  | "description"
  | "thumbnail_path"
  | "thumbnail_bucket"
  | "is_featured"
  | "display_order"
  | "status"
  | "published_at"
  | "updated_at"
  | "aggregate_revision"
>;

export type TourismPackageTranslationItineraryItem = {
  relationId: string;
  destinationId: string;
  displayOrder: number;
  notes: string;
  destinationName: string;
  destinationStatus: TourismPackageStatus | null;
  englishEligible: boolean;
};

export type TourismPackageTranslationRecord = {
  id: string;
  tourism_package_id: string;
  locale: "en";
  name: string | null;
  duration_unit: string | null;
  price_note: string | null;
  included_facilities: string[];
  souvenir: string | null;
  summary: string | null;
  description: string | null;
  translation_status: TourismPackageTranslationStatus;
  review_state: TourismPackageTranslationReviewState;
  captured_source_revision: number | null;
  captured_source_token: string | null;
  captured_relationship_revision: number | null;
  captured_relationship_token: string | null;
  captured_thumbnail_media_fingerprint: string | null;
  translation_fingerprint: string | null;
  contract_version: "tourism-package-v1";
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
  aggregate_revision: number;
  source_updated_at: string;
  source_status: TourismPackageStatus;
  lifecycle_state: TourismPackageTranslationLifecycleState;
  source_blocked: boolean;
  source_blocked_reason: string | null;
  stale_source_token: boolean;
  stale_relationship_token: boolean;
  stale_thumbnail_media_fingerprint: boolean;
  stale_translation_fingerprint: boolean;
  public_eligibility: boolean;
  review_eligibility: boolean;
  publication_eligibility: boolean;
  eligibility_reason: string;
};

export type TourismPackageTranslationRpcRow = Pick<
  TourismPackageTranslationRecord,
  | "id"
  | "tourism_package_id"
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
  duration_unit?: string | null;
  price_note?: string | null;
  included_facilities?: string[];
  souvenir?: string | null;
  summary?: string | null;
  description?: string | null;
};

export type TourismPackageTranslationReviewEvent = {
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
  previous_translation_status: TourismPackageTranslationStatus;
  new_translation_status: TourismPackageTranslationStatus;
  previous_review_state: TourismPackageTranslationReviewState;
  new_review_state: TourismPackageTranslationReviewState;
  occurred_at: string;
  reason: string | null;
};

export type TourismPackageTranslationFormValues = Record<
  TourismPackageTranslationField,
  string
>;
export type TourismPackageTranslationMutationValues = {
  name: string | null;
  duration_unit: string | null;
  price_note: string | null;
  included_facilities: string[];
  souvenir: string | null;
  summary: string | null;
  description: string | null;
};
export type TourismPackageTranslationFieldErrors = Partial<
  Record<TourismPackageTranslationField, string>
>;

export type TourismPackageTranslationActionState = {
  kind:
    | "idle"
    | "validation-error"
    | "database-error"
    | "success"
    | "conflict"
    | "not-found";
  values: TourismPackageTranslationFormValues;
  fieldErrors: TourismPackageTranslationFieldErrors;
  formErrors: string[];
  message: string | null;
  rejectionReason: string;
  revision: number;
  translationId: string | null;
  editRevision: number | null;
  status: TourismPackageTranslationStatus | null;
  reviewState: TourismPackageTranslationReviewState | null;
  lifecycleState: TourismPackageTranslationLifecycleState;
  sourceStatus: TourismPackageStatus | null;
  sourceRevision: number | null;
  relationshipRevision: number | null;
  publicEligibility: boolean;
  reviewEligibility: boolean;
  publicationEligibility: boolean;
  sourceBlocked: boolean;
  sourceBlockedReason: string | null;
  staleSourceToken: boolean;
  staleRelationshipToken: boolean;
  staleThumbnailMediaFingerprint: boolean;
  staleTranslationFingerprint: boolean;
  eligibilityReason: string | null;
  publishedAt: string | null;
  hasPublishedBefore: boolean;
  history: TourismPackageTranslationReviewEvent[];
};

export type TourismPackageTranslationValidationResult =
  | {
      success: true;
      values: TourismPackageTranslationFormValues;
      data: TourismPackageTranslationMutationValues;
    }
  | {
      success: false;
      values: TourismPackageTranslationFormValues;
      fieldErrors: TourismPackageTranslationFieldErrors;
      formErrors: string[];
    };

export type TourismPackageTranslationEligibilityResult =
  | { success: true }
  | {
      success: false;
      fieldErrors: TourismPackageTranslationFieldErrors;
      formErrors: string[];
    };

const EMPTY_VALUES: TourismPackageTranslationFormValues = {
  name: "",
  duration_unit: "",
  price_note: "",
  included_facilities: "",
  souvenir: "",
  summary: "",
  description: "",
};

const FIELD_LABELS: Record<TourismPackageTranslationField, string> = {
  name: "Nama paket bahasa Inggris",
  duration_unit: "Satuan durasi bahasa Inggris",
  price_note: "Catatan harga bahasa Inggris",
  included_facilities: "Fasilitas bahasa Inggris",
  souvenir: "Cendera mata bahasa Inggris",
  summary: "Ringkasan bahasa Inggris",
  description: "Deskripsi bahasa Inggris",
};

const OPTIONAL_TEXT_FIELDS = ["price_note", "souvenir", "summary"] as const;

function isTranslationField(
  value: string,
): value is TourismPackageTranslationField {
  return TOURISM_PACKAGE_TRANSLATION_FIELDS.some((field) => field === value);
}

function hasText(value: string | null | undefined) {
  return value !== null && value !== undefined && value.trim() !== "";
}

function normalizeOptionalText(value: string) {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function parseFacilities(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter((item) => item !== "");
}

function facilitiesToFormValue(value: string[] | null | undefined) {
  return Array.isArray(value) ? value.join("\n") : "";
}

export function emptyTourismPackageTranslationFormValues() {
  return { ...EMPTY_VALUES };
}

export function tourismPackageTranslationToFormValues(
  translation: TourismPackageTranslationRecord | null,
): TourismPackageTranslationFormValues {
  if (!translation) return emptyTourismPackageTranslationFormValues();
  return {
    name: translation.name ?? "",
    duration_unit: translation.duration_unit ?? "",
    price_note: translation.price_note ?? "",
    included_facilities: facilitiesToFormValue(translation.included_facilities),
    souvenir: translation.souvenir ?? "",
    summary: translation.summary ?? "",
    description: translation.description ?? "",
  };
}

export function validateTourismPackageTranslationInput(
  input: Record<string, unknown>,
): TourismPackageTranslationValidationResult {
  const values = emptyTourismPackageTranslationFormValues();
  const fieldErrors: TourismPackageTranslationFieldErrors = {};
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
      duration_unit: normalizeOptionalText(values.duration_unit),
      price_note: normalizeOptionalText(values.price_note),
      included_facilities: parseFacilities(values.included_facilities),
      souvenir: normalizeOptionalText(values.souvenir),
      summary: normalizeOptionalText(values.summary),
      description: normalizeOptionalText(values.description),
    },
  };
}

export function validateTourismPackageTranslationFormData(formData: FormData) {
  const input: Record<string, unknown> = {};
  for (const field of new Set(formData.keys())) {
    const submitted = formData.getAll(field);
    input[field] = submitted.length === 1 ? submitted[0] : submitted;
  }
  return validateTourismPackageTranslationInput(input);
}

export function validateTourismPackageTranslationForSource(
  source: TourismPackageTranslationSource,
  values: TourismPackageTranslationMutationValues,
): TourismPackageTranslationEligibilityResult {
  const fieldErrors: TourismPackageTranslationFieldErrors = {};
  for (const field of OPTIONAL_TEXT_FIELDS) {
    if (!hasText(source[field]) && hasText(values[field])) {
      fieldErrors[field] =
        `${FIELD_LABELS[field]} harus dikosongkan karena sumber Indonesia tidak memiliki konten.`;
    }
  }
  if (
    source.included_facilities.length === 0 &&
    values.included_facilities.length > 0
  ) {
    fieldErrors.included_facilities =
      "Fasilitas Inggris harus kosong karena sumber Indonesia tidak memiliki fasilitas.";
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

export function validateTourismPackageTranslationForEligibility(
  source: TourismPackageTranslationSource,
  values: TourismPackageTranslationMutationValues,
): TourismPackageTranslationEligibilityResult {
  const fieldErrors: TourismPackageTranslationFieldErrors = {};
  const formErrors: string[] = [];

  if (source.status !== "published") {
    formErrors.push(
      "Paket wisata Indonesia harus diterbitkan sebelum terjemahan dapat ditinjau atau diterbitkan.",
    );
  }
  if (!hasText(values.name)) {
    fieldErrors.name = `${FIELD_LABELS.name} wajib diisi sebelum review atau publikasi.`;
  }
  if (!hasText(values.duration_unit)) {
    fieldErrors.duration_unit = `${FIELD_LABELS.duration_unit} wajib diisi sebelum review atau publikasi.`;
  }
  if (!hasText(values.description)) {
    fieldErrors.description = `${FIELD_LABELS.description} wajib diisi sebelum review atau publikasi.`;
  }
  for (const field of OPTIONAL_TEXT_FIELDS) {
    const sourceHasValue = hasText(source[field]);
    if (sourceHasValue !== hasText(values[field])) {
      fieldErrors[field] = sourceHasValue
        ? `${FIELD_LABELS[field]} wajib diisi karena sumber Indonesia memiliki konten.`
        : `${FIELD_LABELS[field]} harus dikosongkan karena sumber Indonesia tidak memiliki konten.`;
    }
  }
  if (source.included_facilities.length !== values.included_facilities.length) {
    fieldErrors.included_facilities =
      "Jumlah fasilitas Inggris harus sama dengan sumber dan mempertahankan urutan.";
  } else if (values.included_facilities.some((item) => !hasText(item))) {
    fieldErrors.included_facilities =
      "Setiap fasilitas Inggris harus berisi teks yang valid.";
  }

  if (Object.keys(fieldErrors).length > 0 || formErrors.length > 0) {
    return { success: false, fieldErrors, formErrors };
  }
  return { success: true };
}

export function createTourismPackageTranslationActionState(
  source: TourismPackageTranslationSource | null,
  translation: TourismPackageTranslationRecord | null,
  history: TourismPackageTranslationReviewEvent[] = [],
  options: Partial<TourismPackageTranslationActionState> = {},
): TourismPackageTranslationActionState {
  return {
    kind: options.kind ?? "idle",
    values:
      options.values ?? tourismPackageTranslationToFormValues(translation),
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
    sourceStatus: source?.status ?? translation?.source_status ?? null,
    sourceRevision:
      source?.aggregate_revision ?? translation?.aggregate_revision ?? null,
    relationshipRevision: translation?.captured_relationship_revision ?? null,
    publicEligibility: translation?.public_eligibility ?? false,
    reviewEligibility: translation?.review_eligibility ?? false,
    publicationEligibility: translation?.publication_eligibility ?? false,
    sourceBlocked: translation?.source_blocked ?? false,
    sourceBlockedReason: translation?.source_blocked_reason ?? null,
    staleSourceToken: translation?.stale_source_token ?? false,
    staleRelationshipToken: translation?.stale_relationship_token ?? false,
    staleThumbnailMediaFingerprint:
      translation?.stale_thumbnail_media_fingerprint ?? false,
    staleTranslationFingerprint:
      translation?.stale_translation_fingerprint ?? false,
    eligibilityReason: translation?.eligibility_reason ?? null,
    publishedAt: translation?.published_at ?? null,
    hasPublishedBefore:
      translation !== null && translation.published_at !== null,
    history,
  };
}

export function getTourismPackageTranslationLifecycleLabel(
  state: TourismPackageTranslationLifecycleState,
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

export function isTourismPackageTranslationEditable(
  status: TourismPackageTranslationStatus | null,
  reviewState: TourismPackageTranslationReviewState | null,
) {
  return (status === null || status === "draft") && reviewState !== "reviewed";
}

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return typeof value === "object" && value !== null
    ? (value as UnknownRecord)
    : null;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function isNullableUuid(value: unknown): value is string | null {
  return value === null || isValidId(value);
}

function isRequiredUuid(value: unknown): value is string {
  return isValidId(value);
}

function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function isPublicationStatus(value: unknown): value is TourismPackageStatus {
  return value === "draft" || value === "published" || value === "archived";
}

function isReviewState(
  value: unknown,
): value is TourismPackageTranslationReviewState {
  return value === "pending" || value === "reviewed" || value === "rejected";
}

function isLifecycleState(
  value: unknown,
): value is TourismPackageTranslationLifecycleState {
  return (
    value === "draft" ||
    value === "reviewed" ||
    value === "published" ||
    value === "stale" ||
    value === "archived" ||
    value === "rejected" ||
    value === "source-blocked"
  );
}

export function isTourismPackageTranslationRecord(
  value: unknown,
): value is TourismPackageTranslationRecord {
  const row = asRecord(value);
  if (!row) return false;
  const nullableTextFields = [
    "name",
    "duration_unit",
    "price_note",
    "souvenir",
    "summary",
    "description",
    "captured_source_token",
    "captured_relationship_token",
    "captured_thumbnail_media_fingerprint",
    "translation_fingerprint",
    "review_reason",
    "source_blocked_reason",
  ];
  const nullableTimestampFields = [
    "reviewed_at",
    "rejected_at",
    "published_at",
    "archived_at",
  ];
  const requiredTimestampFields = [
    "created_at",
    "updated_at",
    "source_updated_at",
  ];
  const isReviewed = row.review_state === "reviewed";
  const reviewMetadataIsValid = isReviewed
    ? isNonEmptyString(row.reviewed_at) &&
      isValidId(row.reviewed_by) &&
      row.terminology_review_confirmed === true
    : row.reviewed_at === null &&
      row.reviewed_by === null &&
      row.terminology_review_confirmed === false;
  const reviewCheckpointIsValid = isReviewed
    ? isPositiveSafeInteger(row.captured_source_revision) &&
      isNonEmptyString(row.captured_source_token) &&
      isPositiveSafeInteger(row.captured_relationship_revision) &&
      isNonEmptyString(row.captured_relationship_token) &&
      isNonEmptyString(row.captured_thumbnail_media_fingerprint) &&
      isNonEmptyString(row.translation_fingerprint)
    : row.captured_source_revision === null &&
      row.captured_source_token === null &&
      row.captured_relationship_revision === null &&
      row.captured_relationship_token === null &&
      row.captured_thumbnail_media_fingerprint === null &&
      row.translation_fingerprint === null;
  const rejectionMetadataIsValid =
    row.review_state === "rejected"
      ? isNonEmptyString(row.rejected_at) &&
        isValidId(row.rejected_by) &&
        isNonEmptyString(row.review_reason)
      : row.rejected_at === null &&
        row.rejected_by === null &&
        row.review_reason === null;
  const publicationStateIsValid =
    row.translation_status !== "published" ||
    (isReviewed &&
      row.published_at !== null &&
      isValidId(row.published_by) &&
      row.archived_at === null);
  const archiveStateIsValid =
    (row.translation_status === "archived") === (row.archived_at !== null) &&
    (row.translation_status !== "archived" || row.review_state === "pending");
  return (
    typeof row.id === "string" &&
    isValidId(row.id) &&
    typeof row.tourism_package_id === "string" &&
    isValidId(row.tourism_package_id) &&
    row.locale === "en" &&
    nullableTextFields.every((field) => isNullableString(row[field])) &&
    Array.isArray(row.included_facilities) &&
    row.included_facilities.every((item) => isNonEmptyString(item)) &&
    isPublicationStatus(row.translation_status) &&
    isReviewState(row.review_state) &&
    (row.captured_source_revision === null ||
      isPositiveSafeInteger(row.captured_source_revision)) &&
    (row.captured_relationship_revision === null ||
      isPositiveSafeInteger(row.captured_relationship_revision)) &&
    row.contract_version === "tourism-package-v1" &&
    typeof row.terminology_review_confirmed === "boolean" &&
    nullableTimestampFields.every((field) => isNullableString(row[field])) &&
    isNullableUuid(row.reviewed_by) &&
    isNullableUuid(row.rejected_by) &&
    isNullableUuid(row.published_by) &&
    isPositiveSafeInteger(row.edit_revision) &&
    requiredTimestampFields.every((field) => typeof row[field] === "string") &&
    isRequiredUuid(row.created_by) &&
    isRequiredUuid(row.updated_by) &&
    typeof row.source_slug === "string" &&
    isValidSlug(row.source_slug) &&
    isPositiveSafeInteger(row.aggregate_revision) &&
    isPublicationStatus(row.source_status) &&
    isLifecycleState(row.lifecycle_state) &&
    typeof row.source_blocked === "boolean" &&
    typeof row.stale_source_token === "boolean" &&
    typeof row.stale_relationship_token === "boolean" &&
    typeof row.stale_thumbnail_media_fingerprint === "boolean" &&
    typeof row.stale_translation_fingerprint === "boolean" &&
    typeof row.public_eligibility === "boolean" &&
    typeof row.review_eligibility === "boolean" &&
    typeof row.publication_eligibility === "boolean" &&
    typeof row.eligibility_reason === "string" &&
    reviewMetadataIsValid &&
    reviewCheckpointIsValid &&
    rejectionMetadataIsValid &&
    publicationStateIsValid &&
    archiveStateIsValid
  );
}
