import type { HomestayRecord, HomestayStatus } from "../homestays/model";

export const HOMESTAY_TRANSLATION_FIELDS = [
  "name",
  "description",
  "address",
  "price_note",
  "facilities",
] as const;

export type HomestayTranslationField =
  (typeof HOMESTAY_TRANSLATION_FIELDS)[number];
export type HomestayTranslationStatus = "draft" | "published" | "archived";
export type HomestayTranslationReviewState =
  "pending" | "reviewed" | "rejected";
export type HomestayTranslationLifecycleState =
  "draft" | "reviewed" | "published" | "stale" | "archived" | "source-blocked";

export type HomestayTranslationSource = Pick<
  HomestayRecord,
  | "id"
  | "name"
  | "description"
  | "address"
  | "price_note"
  | "facilities"
  | "slug"
  | "source_revision"
  | "status"
  | "updated_at"
>;

export type HomestayTranslationRecord = {
  id: string;
  homestay_id: string;
  locale: "en";
  name: string | null;
  description: string | null;
  address: string | null;
  price_note: string | null;
  facilities: string[];
  translation_status: HomestayTranslationStatus;
  review_state: HomestayTranslationReviewState;
  captured_source_revision: number | null;
  captured_source_fingerprint: string | null;
  captured_thumbnail_media_fingerprint: string | null;
  translation_fingerprint: string | null;
  contract_version: "homestay-v1";
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
  source_status: HomestayStatus;
  lifecycle_state: HomestayTranslationLifecycleState;
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

export type HomestayTranslationRpcRow = Pick<
  HomestayTranslationRecord,
  | "id"
  | "homestay_id"
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
  description?: string | null;
  address?: string | null;
  price_note?: string | null;
  facilities?: string[];
};

export type HomestayTranslationReviewEvent = {
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
  previous_translation_status: HomestayTranslationStatus;
  new_translation_status: HomestayTranslationStatus;
  previous_review_state: HomestayTranslationReviewState;
  new_review_state: HomestayTranslationReviewState;
  occurred_at: string;
  reason: string | null;
};

export type HomestayTranslationFormValues = Record<
  HomestayTranslationField,
  string
>;
export type HomestayTranslationMutationValues = {
  name: string | null;
  description: string | null;
  address: string | null;
  price_note: string | null;
  facilities: string[];
};
export type HomestayTranslationFieldErrors = Partial<
  Record<HomestayTranslationField, string>
>;

export type HomestayTranslationActionState = {
  kind:
    | "idle"
    | "validation-error"
    | "database-error"
    | "success"
    | "conflict"
    | "not-found";
  values: HomestayTranslationFormValues;
  fieldErrors: HomestayTranslationFieldErrors;
  formErrors: string[];
  message: string | null;
  rejectionReason: string;
  revision: number;
  translationId: string | null;
  editRevision: number | null;
  status: HomestayTranslationStatus | null;
  reviewState: HomestayTranslationReviewState | null;
  lifecycleState: HomestayTranslationLifecycleState;
  sourceStatus: HomestayStatus | null;
  sourceRevision: number | null;
  publicEligibility: boolean;
  reviewEligibility: boolean;
  publicationEligibility: boolean;
  eligibilityReason: string | null;
  publishedAt: string | null;
  hasPublishedBefore: boolean;
  history: HomestayTranslationReviewEvent[];
};

export type HomestayTranslationValidationResult =
  | {
      success: true;
      values: HomestayTranslationFormValues;
      data: HomestayTranslationMutationValues;
    }
  | {
      success: false;
      values: HomestayTranslationFormValues;
      fieldErrors: HomestayTranslationFieldErrors;
      formErrors: string[];
    };

export type HomestayTranslationEligibilityResult =
  | { success: true }
  | {
      success: false;
      fieldErrors: HomestayTranslationFieldErrors;
      formErrors: string[];
    };

const EMPTY_VALUES: HomestayTranslationFormValues = {
  name: "",
  description: "",
  address: "",
  price_note: "",
  facilities: "",
};

const FIELD_LABELS: Record<HomestayTranslationField, string> = {
  name: "Nama homestay bahasa Inggris",
  description: "Deskripsi bahasa Inggris",
  address: "Alamat bahasa Inggris",
  price_note: "Catatan harga bahasa Inggris",
  facilities: "Fasilitas bahasa Inggris",
};

const OPTIONAL_TEXT_FIELDS = ["address", "price_note"] as const;

function isTranslationField(value: string): value is HomestayTranslationField {
  return HOMESTAY_TRANSLATION_FIELDS.some((field) => field === value);
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

export function emptyHomestayTranslationFormValues() {
  return { ...EMPTY_VALUES };
}

export function homestayTranslationToFormValues(
  translation: HomestayTranslationRecord | null,
): HomestayTranslationFormValues {
  if (!translation) return emptyHomestayTranslationFormValues();
  return {
    name: translation.name ?? "",
    description: translation.description ?? "",
    address: translation.address ?? "",
    price_note: translation.price_note ?? "",
    facilities: facilitiesToFormValue(translation.facilities),
  };
}

export function validateHomestayTranslationInput(
  input: Record<string, unknown>,
): HomestayTranslationValidationResult {
  const values = emptyHomestayTranslationFormValues();
  const fieldErrors: HomestayTranslationFieldErrors = {};
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
      name: normalizeOptionalText(values.name),
      description: normalizeOptionalText(values.description),
      address: normalizeOptionalText(values.address),
      price_note: normalizeOptionalText(values.price_note),
      facilities: parseFacilities(values.facilities),
    },
  };
}

export function validateHomestayTranslationFormData(formData: FormData) {
  const input: Record<string, unknown> = {};
  for (const field of new Set(formData.keys())) {
    const submittedValues = formData.getAll(field);
    input[field] =
      submittedValues.length === 1 ? submittedValues[0] : submittedValues;
  }
  return validateHomestayTranslationInput(input);
}

export function validateHomestayTranslationForSource(
  source: HomestayTranslationSource,
  values: HomestayTranslationMutationValues,
): HomestayTranslationEligibilityResult {
  const fieldErrors: HomestayTranslationFieldErrors = {};
  for (const field of OPTIONAL_TEXT_FIELDS) {
    if (!hasText(source[field]) && hasText(values[field])) {
      fieldErrors[field] =
        `${FIELD_LABELS[field]} harus dikosongkan karena sumber Indonesia tidak memiliki konten.`;
    }
  }
  const sourceFacilities = source.facilities ?? [];
  if (sourceFacilities.length === 0 && values.facilities.length > 0) {
    fieldErrors.facilities =
      "Fasilitas Inggris harus kosong karena sumber tidak memiliki fasilitas.";
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

export function validateHomestayTranslationForEligibility(
  source: HomestayTranslationSource,
  values: HomestayTranslationMutationValues,
): HomestayTranslationEligibilityResult {
  const fieldErrors: HomestayTranslationFieldErrors = {};
  const formErrors: string[] = [];
  if (source.status !== "published")
    formErrors.push(
      "Sumber homestay harus berstatus diterbitkan sebelum review atau publikasi.",
    );
  if (!hasText(values.name))
    fieldErrors.name = `${FIELD_LABELS.name} wajib diisi sebelum review atau publikasi.`;
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
  const sourceFacilities = source.facilities ?? [];
  if (sourceFacilities.length !== values.facilities.length) {
    fieldErrors.facilities =
      "Jumlah fasilitas Inggris harus sama dengan sumber dan mempertahankan urutan.";
  }
  if (values.facilities.some((item) => !hasText(item))) {
    fieldErrors.facilities =
      "Setiap fasilitas Inggris harus berisi teks yang valid.";
  }
  if (Object.keys(fieldErrors).length > 0 || formErrors.length > 0)
    return { success: false, fieldErrors, formErrors };
  return { success: true };
}

export function createHomestayTranslationActionState(
  source: HomestayTranslationSource | null,
  translation: HomestayTranslationRecord | null,
  history: HomestayTranslationReviewEvent[] = [],
  options: Partial<HomestayTranslationActionState> = {},
): HomestayTranslationActionState {
  return {
    kind: options.kind ?? "idle",
    values: options.values ?? homestayTranslationToFormValues(translation),
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

export function getHomestayTranslationLifecycleLabel(
  state: HomestayTranslationLifecycleState,
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

export function isHomestayTranslationEditable(
  status: HomestayTranslationStatus | null,
  reviewState: HomestayTranslationReviewState | null,
) {
  return (status === null || status === "draft") && reviewState !== "reviewed";
}
